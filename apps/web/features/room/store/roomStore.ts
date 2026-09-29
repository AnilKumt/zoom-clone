import { create } from 'zustand';
import type { Participant } from '@/types/api';

export interface RoomState {
  participants: Record<string, Participant>;
  selfId: string | null;
  panel: 'none' | 'participants' | 'chat';
  viewMode: 'gallery' | 'speaker';
  activeSpeakerId: string | null;
  allowSelfUnmute: boolean;
  meetingTopic: string;
  connectionState: 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

  // Actions
  setParticipants: (roster: Participant[]) => void;
  upsertParticipant: (p: Participant) => void;
  removeParticipant: (id: string) => void;
  updateMediaState: (id: string, audio: boolean, video: boolean) => void;
  setHandRaised: (id: string, raised: boolean) => void;
  setRole: (id: string, role: 'host' | 'co_host' | 'participant') => void;
  setSelfId: (id: string) => void;
  setPanel: (panel: 'none' | 'participants' | 'chat') => void;
  setViewMode: (mode: 'gallery' | 'speaker') => void;
  setActiveSpeakerId: (id: string | null) => void;
  setAllowSelfUnmute: (allow: boolean) => void;
  setMeetingTopic: (topic: string) => void;
  setConnectionState: (state: 'connecting' | 'connected' | 'reconnecting' | 'disconnected') => void;
  reset: () => void;
}

const initialState = {
  participants: {},
  selfId: null,
  panel: 'none' as const,
  viewMode: 'gallery' as const,
  activeSpeakerId: null,
  allowSelfUnmute: true,
  meetingTopic: 'Zoom Meeting',
  connectionState: 'connecting' as const,
};

export const useRoomStore = create<RoomState>((set) => ({
  ...initialState,

  setParticipants: (roster) =>
    set(() => {
      const map: Record<string, Participant> = {};
      roster.forEach((p) => {
        map[p.id] = p;
      });
      return { participants: map };
    }),

  upsertParticipant: (p) =>
    set((state) => ({
      participants: { ...state.participants, [p.id]: p },
    })),

  removeParticipant: (id) =>
    set((state) => {
      const next = { ...state.participants };
      delete next[id];
      return { participants: next };
    }),

  updateMediaState: (id, audio, video) =>
    set((state) => {
      const p = state.participants[id];
      if (!p) return state;
      return {
        participants: {
          ...state.participants,
          [id]: { ...p, audio, video },
        },
      };
    }),

  setHandRaised: (id, hand_raised) =>
    set((state) => {
      const p = state.participants[id];
      if (!p) return state;
      return {
        participants: {
          ...state.participants,
          [id]: { ...p, hand_raised },
        },
      };
    }),

  setRole: (id, role) =>
    set((state) => {
      const p = state.participants[id];
      if (!p) return state;
      return {
        participants: {
          ...state.participants,
          [id]: { ...p, role },
        },
      };
    }),

  setSelfId: (id) => set({ selfId: id }),
  setPanel: (panel) => set({ panel }),
  setViewMode: (viewMode) => set({ viewMode }),
  setActiveSpeakerId: (activeSpeakerId) => set({ activeSpeakerId }),
  setAllowSelfUnmute: (allowSelfUnmute) => set({ allowSelfUnmute }),
  setMeetingTopic: (meetingTopic) => set({ meetingTopic }),
  setConnectionState: (connectionState) => set({ connectionState }),
  reset: () => set(initialState),
}));
