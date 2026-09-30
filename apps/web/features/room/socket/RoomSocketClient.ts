import { useRoomStore } from '../store/roomStore';
import type { Participant } from '@/types/api';
import { toast } from 'sonner';

export interface WsEnvelope<T = unknown> {
  v: number;
  id?: string;
  type: string;
  ts?: string;
  payload: T;
}

export type RoomSocketEvent = WsEnvelope;

export class RoomSocketClient {
  private ws: WebSocket | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 8;
  private isIntentionallyClosed = false;

  constructor(
    private code: string,
    private wsUrl: string,
    private ticket: string,
    private onEnd?: () => void,
    private onEvent?: (msg: RoomSocketEvent) => void
  ) {}

  public connect() {
    this.isIntentionallyClosed = false;
    useRoomStore.getState().setConnectionState('connecting');

    const url = `${this.wsUrl}?ticket=${this.ticket}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      useRoomStore.getState().setConnectionState('connected');
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WsEnvelope;
        this.onEvent?.(msg);
        this.handleMessage(msg);
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    this.ws.onclose = (event) => {
      this.stopHeartbeat();
      if (this.isIntentionallyClosed) {
        useRoomStore.getState().setConnectionState('disconnected');
        return;
      }

      if (event.code === 4003) {
        toast.error('You were removed from the meeting by the host');
        this.onEnd?.();
        return;
      }

      if (event.code === 4010) {
        toast.info('The meeting has been ended by the host');
        this.onEnd?.();
        return;
      }

      this.handleReconnect();
    };

    this.ws.onerror = () => {
      useRoomStore.getState().setConnectionState('reconnecting');
    };
  }

  private handleMessage(msg: WsEnvelope) {
    const store = useRoomStore.getState();

    switch (msg.type) {
      case 'room.snapshot': {
        const payload = msg.payload as {
          participants: Participant[];
          state?: { allow_self_unmute?: boolean; topic?: string };
        };
        if (payload.participants) {
          store.setParticipants(payload.participants);
        }
        if (payload.state?.allow_self_unmute !== undefined) {
          store.setAllowSelfUnmute(payload.state.allow_self_unmute);
        }
        if (payload.state?.topic) {
          store.setMeetingTopic(payload.state.topic);
        }
        break;
      }

      case 'participant.joined': {
        const p = msg.payload as Participant;
        store.upsertParticipant(p);
        toast.info(`${p.display_name} joined`);
        break;
      }

      case 'chat.message':
      case 'reaction.received':
        break;

      case 'participant.left': {
        const p = msg.payload as { id: string; display_name: string };
        store.removeParticipant(p.id);
        toast.info(`${p.display_name} left`);
        break;
      }

      case 'participant.updated': {
        const p = msg.payload as Participant;
        store.upsertParticipant(p);
        break;
      }

      case 'host.muted_all': {
        const payload = msg.payload as { allow_self_unmute: boolean; by?: string };
        store.setAllowSelfUnmute(payload.allow_self_unmute);
        const selfId = store.selfId;
        const currentParticipants = store.participants;
        Object.values(currentParticipants).forEach((p) => {
          if (p.role !== 'host') {
            store.updateMediaState(p.id, false, p.video);
          }
        });
        if (selfId && store.participants[selfId]?.role !== 'host') {
          toast.warning('You have been muted by the host');
        }
        break;
      }

      case 'host.muted': {
        const payload = msg.payload as { participant_id: string };
        const p = store.participants[payload.participant_id];
        if (p) {
          store.updateMediaState(payload.participant_id, false, p.video);
        }
        if (payload.participant_id === store.selfId) {
          toast.warning('You have been muted by the host');
        }
        break;
      }

      case 'participant.removed': {
        toast.error('You were removed from the meeting by the host');
        this.isIntentionallyClosed = true;
        this.disconnect();
        this.onEnd?.();
        if (typeof window !== 'undefined') {
          sessionStorage.clear();
          window.location.href = '/home';
        }
        break;
      }

      case 'role.changed': {
        const payload = msg.payload as { participant_id: string; role: 'host' | 'co_host' | 'participant' };
        store.setRole(payload.participant_id, payload.role);
        if (payload.participant_id === store.selfId) {
          toast.info(`Your role was changed to ${payload.role}`);
        }
        break;
      }

      case 'hand.updated': {
        const payload = msg.payload as { participant_id: string; hand_raised: boolean };
        store.setHandRaised(payload.participant_id, payload.hand_raised);
        break;
      }

      case 'meeting.ended': {
        toast.info('The meeting has ended');
        this.onEnd?.();
        break;
      }

      case 'pong':
        break;

      default:
        break;
    }
  }

  public send(type: string, payload: Record<string, unknown> = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const envelope: WsEnvelope = {
        v: 1,
        id: crypto.randomUUID(),
        type,
        ts: new Date().toISOString(),
        payload,
      };
      this.ws.send(JSON.stringify(envelope));
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send('ping');
    }, 25000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      useRoomStore.getState().setConnectionState('disconnected');
      toast.error('Connection lost. Please refresh or rejoin.');
      return;
    }

    useRoomStore.getState().setConnectionState('reconnecting');
    this.reconnectAttempts++;

    // Exponential backoff with jitter: 0.5s to 8s
    const baseDelay = Math.min(500 * Math.pow(1.5, this.reconnectAttempts), 8000);
    const jitter = Math.random() * 500;
    const delay = baseDelay + jitter;

    setTimeout(() => {
      if (!this.isIntentionallyClosed) {
        this.connect();
      }
    }, delay);
  }

  public disconnect() {
    this.isIntentionallyClosed = true;
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnected');
      this.ws = null;
    }
    useRoomStore.getState().reset();
  }
}
