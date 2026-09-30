'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Users,
  MessageSquare,
  Monitor,
  Smile,
  Shield,
  Maximize2,
  Minimize2,
  ChevronDown,
  Hand,
  MoreVertical,
  LogOut,
  X,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useRoomStore } from '@/features/room/store/roomStore';
import { RoomSocketClient } from '@/features/room/socket/RoomSocketClient';
import { RoomPeerManager } from '@/features/room/webrtc/RoomPeerManager';
import { computeGrid } from '@/features/room/lib/computeGrid';
import { canPerformAction } from '@/features/room/lib/permissions';
import { getInitials, formatMeetingId } from '@/lib/utils';
import { ROUTES } from '@/constants/routes';
import { toast } from 'sonner';
import type { JoinResult, Participant } from '@/types/api';

export default function MeetingRoomPage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;

  const {
    participants,
    selfId,
    panel,
    viewMode,
    activeSpeakerId,
    allowSelfUnmute,
    connectionState,
    setSelfId,
    setPanel,
    setViewMode,
    updateMediaState,
    setHandRaised,
  } = useRoomStore();

  const [joinResult, setJoinResult] = useState<JoinResult | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInfoPopover, setShowInfoPopover] = useState(false);
  const [showEndMenu, setShowEndMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showSecurityMenu, setShowSecurityMenu] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    Array<{ id: string; sender: string; text: string; time: string }>
  >([]);
  const [chatInput, setChatInput] = useState('');
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [reactions, setReactions] = useState<
    Array<{ id: string; emoji: string; sender: string; participantId?: string }>
  >([]);

  const socketClientRef = useRef<RoomSocketClient | null>(null);
  const peerManagerRef = useRef<RoomPeerManager | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [containerDim, setContainerDim] = useState({ width: 800, height: 600 });

  const participantList = useMemo(() => Object.values(participants), [participants]);
  const self = selfId ? participants[selfId] : null;
  const isHost = self?.role === 'host' || joinResult?.role === 'host';
  const isCoHost = self?.role === 'co_host' || joinResult?.role === 'co_host';

  const triggerReaction = (emoji: string, sender: string, participantId?: string) => {
    const id = crypto.randomUUID();
    setReactions((prev) => [...prev, { id, emoji, sender, participantId }]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 3500);
  };

  // Measure container for computeGrid
  useEffect(() => {
    const updateSize = () => {
      if (gridContainerRef.current) {
        setContainerDim({
          width: gridContainerRef.current.clientWidth,
          height: gridContainerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [panel]);

  // Load session & initialize WebSocket
  useEffect(() => {
    const stored = sessionStorage.getItem(`room_${code}_join`);
    if (!stored) {
      router.replace(ROUTES.lobby(code));
      return;
    }

    const parsed = JSON.parse(stored) as JoinResult;
    setJoinResult(parsed);
    setSelfId(parsed.participant_id);

    const initialMediaStr = sessionStorage.getItem(`room_${code}_initial_media`);
    const initialMedia = initialMediaStr
      ? JSON.parse(initialMediaStr)
      : { audio: true, video: true };

    const handleRemoteStream = (participantId: string, stream: MediaStream) => {
      setRemoteStreams((current) => ({ ...current, [participantId]: stream }));
    };

    // Resolve clean, valid WebSocket URL targeting backend WebSocket server
    let wsUrl = parsed.ws_url || '';
    const configuredWs = process.env.NEXT_PUBLIC_WS_URL;

    if (configuredWs) {
      const cleanBase = configuredWs.replace(/^http/, 'ws').replace(/\/+$/, '');
      if (!wsUrl || wsUrl.includes('localhost') || wsUrl.includes('netlify.app') || wsUrl.includes('vercel.app')) {
        wsUrl = `${cleanBase}/api/v1/ws/rooms/${code}`;
      }
    }

    if (wsUrl) {
      wsUrl = wsUrl.replace(/([^:])\/\/+/g, '$1/');
    }

    const client = new RoomSocketClient(
      code,
      wsUrl,
      parsed.ws_ticket,
      () => {
        localStream?.getTracks().forEach((track) => track.stop());
        peerManagerRef.current?.close();
        setRemoteStreams({});
        router.push(ROUTES.HOME);
      },
      (message) => {
        if (message.type === 'rtc.offer' || message.type === 'rtc.answer' || message.type === 'rtc.ice') {
          void peerManagerRef.current?.handleSignal(message.payload as { from_id: string; target_id?: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit });
        } else if (message.type === 'chat.message') {
          const msg = message.payload as { id?: string; sender?: string; text?: string; time?: string };
          if (msg.text) {
            setChatMessages((prev) => [
              ...prev,
              {
                id: msg.id || crypto.randomUUID(),
                sender: msg.sender || 'Participant',
                text: msg.text || '',
                time: msg.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ]);
            setUnreadChatCount((prev) => prev + 1);
          }
        } else if (message.type === 'reaction.received') {
          const payload = message.payload as { emoji: string; sender: string; participant_id: string };
          if (payload?.emoji) {
            triggerReaction(payload.emoji, payload.sender || 'Participant', payload.participant_id);
          }
        } else if (message.type === 'participant.removed') {
          toast.error('You were removed from the meeting by the host');
          localStream?.getTracks().forEach((track) => track.stop());
          peerManagerRef.current?.close();
          setRemoteStreams({});
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem(`room_${code}_join`);
            window.location.href = '/home';
          }
        } else if (message.type === 'host.muted_all') {
          Object.values(participants).forEach((p) => {
            if (p.role !== 'host') {
              updateMediaState(p.id, false, p.video);
            }
          });
          if (self?.role !== 'host') {
            localStream?.getAudioTracks().forEach((t) => { t.enabled = false; });
            toast.warning('You have been muted by the host');
          }
        } else if (message.type === 'host.muted') {
          const payload = message.payload as { participant_id: string };
          if (payload?.participant_id) {
            const p = participants[payload.participant_id];
            if (p) updateMediaState(payload.participant_id, false, p.video);
            if (payload.participant_id === selfId) {
              localStream?.getAudioTracks().forEach((t) => { t.enabled = false; });
              toast.warning('You have been muted by the host');
            }
          }
        }
      }
    );

    socketClientRef.current = client;
    const peerManager = new RoomPeerManager(
      parsed.participant_id,
      parsed.ice_servers,
      (type, payload) => client.send(type, payload),
      handleRemoteStream
    );
    peerManagerRef.current = peerManager;
    client.connect();

    navigator.mediaDevices?.getUserMedia({ video: true, audio: true }).then((stream) => {
      stream.getAudioTracks().forEach((t) => {
        t.enabled = initialMedia.audio;
      });
      stream.getVideoTracks().forEach((t) => {
        t.enabled = initialMedia.video;
      });
      setLocalStream(stream);
      peerManager.addLocalStream(stream);
    }).catch(() => {
      toast.info('Camera or microphone unavailable. You joined in avatar mode.');
    });

    // Broadcast initial media state
    setTimeout(() => {
      client.send('media.state', {
        audio: initialMedia.audio,
        video: initialMedia.video,
      });
      updateMediaState(parsed.participant_id, initialMedia.audio, initialMedia.video);
    }, 500);

    return () => {
      client.disconnect();
      peerManager.close();
      localStream?.getTracks().forEach((track) => track.stop());
      setRemoteStreams({});
    };
  }, [code, router, setSelfId, updateMediaState]);

  // Sync physical microphone/camera tracks when media state changes
  useEffect(() => {
    if (!localStream || !self) return;
    localStream.getAudioTracks().forEach((track) => {
      if (track.enabled !== self.audio) {
        track.enabled = self.audio;
      }
    });
    localStream.getVideoTracks().forEach((track) => {
      if (track.enabled !== self.video) {
        track.enabled = self.video;
      }
    });
  }, [self?.audio, self?.video, localStream]);

  useEffect(() => {
    const peerManager = peerManagerRef.current;
    if (!peerManager || !selfId) return;
    participantList.forEach((participant) => {
      if (participant.id !== selfId) {
        void peerManager.connectTo(participant.id, selfId < participant.id);
      }
    });
  }, [participantList, selfId]);

  // Keyboard shortcuts: Alt+A (mute), Alt+V (video), Alt+U (participants), Alt+H (chat), Alt+Y (hand), Alt+Q (leave)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 'a') {
          e.preventDefault();
          toggleAudio();
        } else if (key === 'v') {
          e.preventDefault();
          toggleVideo();
        } else if (key === 'u') {
          e.preventDefault();
          setPanel(panel === 'participants' ? 'none' : 'participants');
        } else if (key === 'h') {
          e.preventDefault();
          setPanel(panel === 'chat' ? 'none' : 'chat');
        } else if (key === 'y') {
          e.preventDefault();
          toggleHand();
        } else if (key === 'q') {
          e.preventDefault();
          setShowEndMenu(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [self, panel, allowSelfUnmute, localStream]);

  const toggleAudio = () => {
    if (!self) return;
    if (!self.audio && !allowSelfUnmute && !isHost && !isCoHost) {
      toast.error('The host has muted participants and disabled unmuting');
      return;
    }
    const newAudio = !self.audio;
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = newAudio;
      });
    }
    socketClientRef.current?.send('media.state', {
      audio: newAudio,
      video: self.video,
    });
    updateMediaState(self.id, newAudio, self.video);
  };

  const toggleVideo = () => {
    if (!self) return;
    const newVideo = !self.video;
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = newVideo;
      });
    }
    socketClientRef.current?.send('media.state', {
      audio: self.audio,
      video: newVideo,
    });
    updateMediaState(self.id, self.audio, newVideo);
  };

  const toggleHand = () => {
    if (!self) return;
    const newHand = !self.hand_raised;
    socketClientRef.current?.send('hand.toggle', { hand_raised: newHand });
    setHandRaised(self.id, newHand);
  };

  const handleMuteAll = () => {
    if (!isHost && !isCoHost) return;
    socketClientRef.current?.send('host.mute_all', {
      allow_self_unmute: true,
    });
    Object.values(participants).forEach((p) => {
      if (p.role !== 'host') {
        updateMediaState(p.id, false, p.video);
      }
    });
    toast.success('Muted all participants');
  };

  const handleMuteParticipant = (targetId: string) => {
    socketClientRef.current?.send('host.mute', { participant_id: targetId });
    const p = participants[targetId];
    if (p) {
      updateMediaState(targetId, false, p.video);
    }
    toast.success('Muted participant');
  };

  const handleRemoveParticipant = (targetId: string) => {
    socketClientRef.current?.send('host.remove', { participant_id: targetId });
    peerManagerRef.current?.remove(targetId);
    setRemoteStreams((prev) => {
      const copy = { ...prev };
      delete copy[targetId];
      return copy;
    });
    removeParticipant(targetId);
    toast.info('Participant removed');
  };

  const handleEndMeeting = () => {
    socketClientRef.current?.send('host.end', {});
    localStream?.getTracks().forEach((track) => track.stop());
    peerManagerRef.current?.close();
    setRemoteStreams({});
    router.push(ROUTES.HOME);
  };

  const handleLeaveMeeting = () => {
    socketClientRef.current?.disconnect();
    localStream?.getTracks().forEach((track) => track.stop());
    peerManagerRef.current?.close();
    setRemoteStreams({});
    router.push(ROUTES.HOME);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !self) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgId = crypto.randomUUID();
    const newMsg = {
      id: msgId,
      sender: self.display_name,
      text: chatInput.trim(),
      time: timeStr,
    };

    setChatMessages((prev) => [...prev, newMsg]);
    socketClientRef.current?.send('chat.message', {
      id: msgId,
      text: chatInput.trim(),
      sender: self.display_name,
      time: timeStr,
    });
    setChatInput('');
  };

  const handleSendReaction = (emoji: string) => {
    if (!self) return;
    socketClientRef.current?.send('reaction.send', { emoji });
    setShowReactions(false);
  };

  const gridLayout = useMemo(() => {
    return computeGrid(
      Math.max(participantList.length, 1),
      containerDim.width - 32,
      containerDim.height - 32
    );
  }, [participantList.length, containerDim]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--room-bg)] text-white select-none">
      {/* aria-live announcer for screen readers */}
      <div aria-live="polite" className="sr-only" id="room-aria-announcer" />

      {/* Reconnecting banner */}
      {connectionState === 'reconnecting' && (
        <div className="bg-amber-600 text-white text-xs font-semibold py-1 px-4 text-center z-50">
          Reconnecting to meeting room...
        </div>
      )}

      {/* TOP BAR (48px) */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-4 bg-[var(--room-bg)] z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowInfoPopover(!showInfoPopover)}
            className="flex items-center gap-1.5 rounded-pill bg-white/10 px-3 py-1 text-xs font-medium text-white/90 hover:bg-white/20 transition-colors"
            aria-label="Meeting Information"
          >
            <Shield size={14} className="text-[var(--zoom-green)]" />
            <span className="hidden sm:inline">Meeting Info</span>
            <ChevronDown size={12} className="opacity-60" />
          </button>

          {showInfoPopover && (
            <div
              className="absolute top-14 left-4 z-50 w-80 rounded-card bg-[#242424] p-4 text-xs shadow-2xl border border-white/10"
              role="dialog"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                <span className="font-bold text-sm text-white">Zoom Meeting</span>
                <button
                  onClick={() => setShowInfoPopover(false)}
                  className="text-white/60 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-white/50 block">Meeting ID</span>
                  <span className="font-mono text-white/90 font-medium">
                    {formatMeetingId(code)}
                  </span>
                </div>
                <div>
                  <span className="text-white/50 block">Host</span>
                  <span className="text-white/90">
                    {participantList.find((p) => p.role === 'host')?.display_name || 'Host'}
                  </span>
                </div>
                <div>
                  <span className="text-white/50 block">Invite Link</span>
                  <span className="font-mono text-[var(--zoom-blue)] text-[10px] break-all">
                    {typeof window !== 'undefined' ? `${window.location.origin}/j/${code}` : ''}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'gallery' ? 'speaker' : 'gallery')}
            className="rounded px-2.5 py-1 text-xs text-white/80 hover:bg-white/10 transition-colors"
          >
            {viewMode === 'gallery' ? 'Speaker View' : 'Gallery View'}
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-white/80 hover:bg-white/10 rounded transition-colors"
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </header>

      {/* Remote Audio Playback Elements (never unmounted on video toggle) */}
      <div className="hidden" aria-hidden="true">
        {Object.entries(remoteStreams).map(([peerId, stream]) => (
          <audio
            key={`remote-audio-${peerId}`}
            autoPlay
            playsInline
            ref={(element) => {
              if (element && element.srcObject !== stream) {
                element.srcObject = stream;
              }
            }}
          />
        ))}
      </div>

      {/* Floating Reactions Overlay (Zero white background, dark theme floating animation) */}
      <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
        {reactions.map((r, idx) => (
          <div
            key={r.id}
            className="animate-float-up absolute bottom-24 flex items-center gap-2 rounded-full bg-[#181818]/90 backdrop-blur-md px-4 py-2 border border-white/20 shadow-2xl"
            style={{ left: `${15 + (idx % 6) * 14}%` }}
          >
            <span className="text-3xl leading-none">{r.emoji}</span>
            <span className="text-xs font-bold text-white/90">{r.sender}</span>
          </div>
        ))}
      </div>

      {/* STAGE (Dynamic Video Grid + Docked Side Panel) */}
      <main className="flex flex-1 overflow-hidden relative">
        <div
          ref={gridContainerRef}
          className="flex flex-1 items-center justify-center p-4 overflow-hidden"
        >
          <div
            className="grid gap-3 transition-all duration-200"
            style={{
              gridTemplateColumns: `repeat(${gridLayout.cols}, ${gridLayout.tileWidth}px)`,
              gridAutoRows: `${gridLayout.tileHeight}px`,
              justifyContent: 'center',
              alignContent: 'center',
            }}
          >
            {participantList.map((p) => {
              const isSelf = p.id === selfId;
              const hasVideo = isSelf ? self?.video : p.video;
              const hasAudio = isSelf ? self?.audio : p.audio;
              const isSpeaking = p.id === activeSpeakerId;
              const activeTileReaction = reactions.find((r) => r.participantId === p.id);

              return (
                <div
                  key={p.id}
                  className={`group relative rounded-xl overflow-hidden bg-[var(--room-tile)] flex items-center justify-center border-2 transition-all shadow-md ${
                    isSpeaking ? 'border-[var(--zoom-green)]' : 'border-transparent'
                  }`}
                  style={{ width: `${gridLayout.tileWidth}px`, height: `${gridLayout.tileHeight}px` }}
                >
                  {/* Video track or large Initials Avatar */}
                  {hasVideo ? (
                    <div className="h-full w-full bg-black/40 flex items-center justify-center">
                      {isSelf ? (
                        <video
                          autoPlay
                          muted
                          playsInline
                          ref={(element) => {
                            if (element && element.srcObject !== localStream) {
                              element.srcObject = localStream;
                            }
                          }}
                          className="h-full w-full object-cover transform -scale-x-100"
                        />
                      ) : remoteStreams[p.id] ? (
                        <video
                          autoPlay
                          muted
                          playsInline
                          ref={(element) => {
                            if (element && element.srcObject !== remoteStreams[p.id]) {
                              element.srcObject = remoteStreams[p.id];
                            }
                          }}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-white/40 text-sm font-medium">
                          Video Stream
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      className="flex h-20 w-20 items-center justify-center rounded-full text-white text-2xl font-bold shadow-lg"
                      style={{ background: 'var(--zoom-blue)' }}
                    >
                      {getInitials(p.display_name)}
                    </div>
                  )}

                  {/* Top-Left: Active Reaction badge */}
                  {activeTileReaction && (
                    <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 rounded-full bg-black/80 px-2.5 py-1 text-sm shadow-2xl backdrop-blur-md border border-white/20 animate-in zoom-in-50 duration-200">
                      <span className="text-xl">{activeTileReaction.emoji}</span>
                    </div>
                  )}

                  {/* Top-Right: Raised Hand badge */}
                  {p.hand_raised && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-black shadow-md animate-bounce z-10">
                      <Hand size={12} />
                      <span>Hand Raised</span>
                    </div>
                  )}

                  {/* Top-Right: Quick Host Tile Controls */}
                  {(isHost || isCoHost) && !isSelf && (
                    <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 shadow-xl">
                      {p.audio && (
                        <button
                          onClick={() => handleMuteParticipant(p.id)}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/20 hover:bg-white/30 text-white transition-colors"
                          title="Mute participant"
                        >
                          Mute
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveParticipant(p.id)}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-600/80 hover:bg-red-600 text-white transition-colors"
                        title="Remove participant"
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  {/* Bottom-Left Name Pill */}
                  <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-md bg-black/70 px-2.5 py-1 text-xs text-white backdrop-blur-md">
                    {!hasAudio ? (
                      <MicOff size={12} className="text-[var(--zoom-red)] shrink-0" />
                    ) : (
                      <Mic size={12} className="text-white/70 shrink-0" />
                    )}
                    <span className="truncate max-w-[120px]">
                      {p.display_name} {isSelf && '(Me)'}
                    </span>
                    {p.role === 'host' && (
                      <span className="rounded bg-[var(--zoom-blue)] px-1 py-0.2 text-[10px] font-semibold text-white">
                        Host
                      </span>
                    )}
                    {p.role === 'co_host' && (
                      <span className="rounded bg-sky-600 px-1 py-0.2 text-[10px] font-semibold text-white">
                        Co-host
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SIDE PANEL (Participants or Chat) */}
        {panel !== 'none' && (
          <aside
            className="w-80 shrink-0 border-l border-white/10 bg-[#1e1e1e] flex flex-col z-10 animate-in slide-in-from-right duration-200"
            aria-label={panel === 'participants' ? 'Participants Panel' : 'Chat Panel'}
          >
            <div className="flex h-12 items-center justify-between border-b border-white/10 px-4">
              <h2 className="text-sm font-bold text-white capitalize">
                {panel === 'participants'
                  ? `Participants (${participantList.length})`
                  : 'In-Meeting Chat'}
              </h2>
              <button
                onClick={() => setPanel('none')}
                className="text-white/60 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
                aria-label="Close side panel"
              >
                <X size={16} />
              </button>
            </div>

            {/* Participants list tab */}
            {panel === 'participants' && (
              <div className="flex flex-1 flex-col overflow-hidden">
                {(isHost || isCoHost) && (
                  <div className="p-2 border-b border-white/10 bg-[#181818] flex items-center justify-between">
                    <span className="text-xs font-semibold text-white/70">Host Actions</span>
                    <button
                      onClick={handleMuteAll}
                      className="px-3 py-1 rounded bg-[var(--zoom-blue)] hover:bg-[var(--zoom-blue-hover)] text-xs font-semibold text-white transition-colors"
                    >
                      Mute All
                    </button>
                  </div>
                )}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {participantList.map((p) => {
                    const isSelf = p.id === selfId;
                    const canMute = canPerformAction(self, 'MUTE_PARTICIPANT', p) && !isSelf;
                    const canRemove = canPerformAction(self, 'REMOVE_PARTICIPANT', p) && !isSelf;

                    return (
                      <div
                        key={p.id}
                        className="group flex items-center justify-between rounded-lg px-3 py-2 hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                            style={{ background: 'var(--zoom-blue)' }}
                          >
                            {getInitials(p.display_name)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="truncate text-xs font-medium text-white/90">
                              {p.display_name} {isSelf && '(Me)'}
                            </span>
                            <span className="text-[10px] text-white/50 capitalize">
                              {p.role.replace('_', '-')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {p.audio ? (
                            <Mic size={14} className="text-white/60" />
                          ) : (
                            <MicOff size={14} className="text-[var(--zoom-red)]" />
                          )}
                          {p.video ? (
                            <Video size={14} className="text-white/60" />
                          ) : (
                            <VideoOff size={14} className="text-[var(--zoom-red)]" />
                          )}

                          {(canMute || canRemove) && (
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                              {canMute && p.audio && (
                                <button
                                  onClick={() => handleMuteParticipant(p.id)}
                                  className="px-2 py-0.5 rounded text-[11px] bg-white/10 hover:bg-white/20 text-white font-medium"
                                >
                                  Mute
                                </button>
                              )}
                              {canRemove && (
                                <button
                                  onClick={() => handleRemoveParticipant(p.id)}
                                  className="px-2 py-0.5 rounded text-[11px] bg-red-600/80 hover:bg-red-600 text-white font-medium"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Host Controls Footer */}
                {(isHost || isCoHost) && (
                  <div className="border-t border-white/10 p-3 bg-[#181818]">
                    <button
                      onClick={handleMuteAll}
                      className="w-full h-8 rounded-control bg-[var(--zoom-blue)] hover:bg-[var(--zoom-blue-hover)] text-xs font-semibold text-white transition-colors"
                    >
                      Mute All Participants
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Chat Tab */}
            {panel === 'chat' && (
              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {chatMessages.length === 0 ? (
                    <p className="text-center text-xs text-white/40 mt-8">
                      No messages yet. Send a message to everyone.
                    </p>
                  ) : (
                    chatMessages.map((msg) => (
                      <div key={msg.id} className="text-xs">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-[var(--zoom-blue)]">
                            {msg.sender}
                          </span>
                          <span className="text-[10px] text-white/40">{msg.time}</span>
                        </div>
                        <p className="text-white/90 rounded bg-white/5 p-2 break-words">
                          {msg.text}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleSendChat} className="border-t border-white/10 p-3 bg-[#181818]">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type message to everyone..."
                    maxLength={2000}
                    className="w-full h-9 rounded-control bg-white/10 border border-white/20 px-3 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-[var(--zoom-blue)]"
                  />
                </form>
              </div>
            )}
          </aside>
        )}
      </main>

      {/* BOTTOM TOOLBAR (80px) */}
      <footer
        className="flex h-20 shrink-0 items-center justify-between border-t border-white/10 px-4 bg-[var(--room-toolbar)] z-20"
        role="toolbar"
        aria-label="Meeting controls"
      >
        {/* Left cluster: Audio & Video */}
        <div className="flex items-center gap-1 sm:gap-2">
          <ToolbarButton
            icon={self?.audio ? <Mic size={20} /> : <MicOff size={20} />}
            label={self?.audio ? 'Mute' : 'Unmute'}
            onClick={toggleAudio}
            active={!self?.audio}
          />
          <ToolbarButton
            icon={self?.video ? <Video size={20} /> : <VideoOff size={20} />}
            label={self?.video ? 'Stop Video' : 'Start Video'}
            onClick={toggleVideo}
            active={!self?.video}
          />
        </div>

        {/* Center cluster: Security (Host), Participants, Chat, Share, Reactions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {(isHost || isCoHost) && (
            <div className="relative">
              <ToolbarButton
                icon={<Shield size={20} className="text-[var(--zoom-green)]" />}
                label="Security"
                onClick={() => setShowSecurityMenu(!showSecurityMenu)}
                active={showSecurityMenu}
              />
              {showSecurityMenu && (
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 w-52 rounded-card bg-[#242424] p-2 shadow-2xl border border-white/10 text-xs">
                  <div className="px-2 py-1 text-[10px] font-bold text-white/50 uppercase tracking-wider border-b border-white/10 mb-1">
                    Host Controls
                  </div>
                  <button
                    onClick={() => {
                      handleMuteAll();
                      setShowSecurityMenu(false);
                    }}
                    className="flex items-center gap-2 w-full rounded px-2.5 py-2 text-left font-medium text-white hover:bg-white/10 transition-colors"
                  >
                    <MicOff size={14} className="text-[var(--zoom-red)]" />
                    <span>Mute All</span>
                  </button>
                  <button
                    onClick={() => {
                      socketClientRef.current?.send('host.mute_all', { allow_self_unmute: false });
                      toast.success('Muted all and locked unmute');
                      setShowSecurityMenu(false);
                    }}
                    className="flex items-center gap-2 w-full rounded px-2.5 py-2 text-left font-medium text-white hover:bg-white/10 transition-colors"
                  >
                    <Shield size={14} className="text-amber-400" />
                    <span>Lock Unmute</span>
                  </button>
                </div>
              )}
            </div>
          )}

          <ToolbarButton
            icon={<Users size={20} />}
            label="Participants"
            onClick={() => setPanel(panel === 'participants' ? 'none' : 'participants')}
            badge={participantList.length}
            active={panel === 'participants'}
          />
          <ToolbarButton
            icon={<MessageSquare size={20} />}
            label="Chat"
            onClick={() => {
              if (panel !== 'chat') setUnreadChatCount(0);
              setPanel(panel === 'chat' ? 'none' : 'chat');
            }}
            badge={unreadChatCount}
            active={panel === 'chat'}
          />
          <ToolbarButton
            icon={<Monitor size={20} className="text-[var(--zoom-green)]" />}
            label="Share Screen"
            onClick={() => toast.info('Screen share coming soon in P2')}
          />
          <div className="relative">
            <ToolbarButton
              icon={<Smile size={20} />}
              label="Reactions"
              onClick={() => setShowReactions(!showReactions)}
              active={showReactions || self?.hand_raised}
            />

            {showReactions && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 rounded-2xl bg-[#242424]/95 backdrop-blur-md p-3 shadow-2xl border border-white/15 text-white">
                <div className="flex items-center gap-2 text-2xl p-1">
                  {['👍', '👏', '❤️', '😂', '🎉', '😮', '🔥', '🙌'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleSendReaction(emoji)}
                      className="hover:scale-125 transition-transform p-1.5 rounded-lg hover:bg-white/10"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    toggleHand();
                    setShowReactions(false);
                  }}
                  className="flex items-center gap-1.5 w-full justify-center rounded-pill bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                >
                  <Hand size={14} />
                  {self?.hand_raised ? 'Lower Hand' : 'Raise Hand'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right cluster: End / Leave button */}
        <div className="relative">
          {isHost ? (
            <div>
              <button
                onClick={() => setShowEndMenu(!showEndMenu)}
                className="rounded-control bg-[var(--zoom-red)] hover:bg-red-700 px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors"
              >
                End
              </button>

              {showEndMenu && (
                <div className="absolute bottom-14 right-0 z-50 w-48 rounded-card bg-[#242424] p-1.5 shadow-2xl border border-white/10 text-xs">
                  <button
                    onClick={handleEndMeeting}
                    className="w-full rounded px-3 py-2 text-left font-semibold text-red-400 hover:bg-white/10 transition-colors"
                  >
                    End Meeting for All
                  </button>
                  <button
                    onClick={handleLeaveMeeting}
                    className="w-full rounded px-3 py-2 text-left text-white hover:bg-white/10 transition-colors"
                  >
                    Leave Meeting
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={handleLeaveMeeting}
              className="rounded-control bg-[var(--zoom-red)] hover:bg-red-700 px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors"
            >
              Leave
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

function ToolbarButton({
  icon,
  label,
  onClick,
  active,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-white/10 ${
        active ? 'text-[var(--zoom-red)]' : 'text-white/85'
      }`}
    >
      <div className="relative">
        {icon}
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--zoom-red)] px-1 text-[10px] font-bold text-white shadow">
            {badge}
          </span>
        )}
      </div>
      <span className="text-[11px] leading-none">{label}</span>
    </button>
  );
}
