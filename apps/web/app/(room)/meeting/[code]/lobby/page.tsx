'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Mic, MicOff, Video, VideoOff, Settings, Shield, Sparkles } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { ROUTES } from '@/constants/routes';
import { formatMeetingId } from '@/lib/utils';
import type { JoinResult, PublicMeeting } from '@/types/api';

export default function LobbyPage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;
  const { user } = useAuth();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [rememberName, setRememberName] = useState(true);
  const [meetingInfo, setMeetingInfo] = useState<PublicMeeting | null>(null);
  const [loading, setLoading] = useState(false);
  const [mediaError, setMediaError] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.name);
    } else {
      const saved = localStorage.getItem('zoom_clone_display_name');
      if (saved) setDisplayName(saved);
    }
  }, [user]);

  useEffect(() => {
    apiClient
      .get<PublicMeeting>(`/meetings/${code}/public`)
      .then((data) => setMeetingInfo(data))
      .catch(() => {
        toast.error('Meeting not found');
      });
  }, [code]);

  useEffect(() => {
    let localStream: MediaStream | null = null;
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: true })
      .then((s) => {
        localStream = s;
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch(() => {
        setMediaError(true);
      });

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const toggleAudio = () => {
    if (stream) {
      stream.getAudioTracks().forEach((t) => {
        t.enabled = !audioEnabled;
      });
    }
    setAudioEnabled(!audioEnabled);
  };

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach((t) => {
        t.enabled = !videoEnabled;
      });
    }
    setVideoEnabled(!videoEnabled);
  };

  const handleJoin = async () => {
    if (!displayName.trim() || loading) return;
    setLoading(true);

    try {
      if (rememberName && !user) {
        localStorage.setItem('zoom_clone_display_name', displayName.trim());
      }

      const result = await apiClient.post<JoinResult>(`/meetings/${code}/join`, {
        display_name: displayName.trim(),
        passcode: meetingInfo?.requires_passcode ? passcode : undefined,
      });

      sessionStorage.setItem(`room_${code}_join`, JSON.stringify(result));
      sessionStorage.setItem(
        `room_${code}_initial_media`,
        JSON.stringify({ audio: audioEnabled, video: videoEnabled })
      );

      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }

      router.push(ROUTES.meeting(code));
    } catch (err) {
      if (apiClient.isApiError(err)) {
        if (err.details?.reason === 'wrong_passcode') {
          toast.error('Incorrect meeting passcode');
        } else if (err.details?.reason === 'ended') {
          toast.error('This meeting has already ended');
        } else if (err.details?.reason === 'not_started') {
          toast.error('The meeting has not been started by the host yet');
        } else {
          toast.error(err.message || 'Failed to join meeting');
        }
      } else {
        toast.error('Could not connect to meeting');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--room-bg)] p-4 text-white">
      <div className="w-full max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-2xl font-black tracking-tight">
            <span style={{ color: 'var(--zoom-blue)' }}>zoom</span>
            <span className="text-white/60 text-xs font-mono font-medium">| ID: {formatMeetingId(code)}</span>
          </div>
          {meetingInfo?.title && (
            <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold text-white/90 backdrop-blur-md">
              <Shield size={14} className="text-[var(--zoom-green)]" />
              {meetingInfo.title}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-8 items-center bg-[#1C1E22] rounded-3xl p-6 sm:p-10 shadow-2xl border border-white/10">
          {/* Camera preview */}
          <div className="flex flex-col items-center">
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[var(--room-tile)] shadow-inner border border-white/10 flex items-center justify-center">
              {videoEnabled && !mediaError ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
              ) : (
                <div
                  className="flex h-24 w-24 items-center justify-center rounded-3xl text-white text-3xl font-black shadow-lg"
                  style={{ background: 'var(--zoom-blue)' }}
                >
                  {displayName.slice(0, 2).toUpperCase() || 'U'}
                </div>
              )}

              {/* Status Overlay */}
              <div className="absolute bottom-3.5 left-3.5 flex items-center gap-2 rounded-full bg-black/70 px-3.5 py-1 text-xs font-semibold backdrop-blur-md">
                <span>{displayName || 'Preview'}</span>
                {!audioEnabled && <MicOff size={13} className="text-[var(--zoom-red)]" />}
              </div>
            </div>

            {/* Media controls */}
            <div className="mt-6 flex items-center gap-4">
              <button
                onClick={toggleAudio}
                className={`flex h-12 w-12 items-center justify-center rounded-full shadow-md active:scale-95 transition-all duration-200 ${
                  audioEnabled
                    ? 'bg-white/15 hover:bg-white/25 text-white'
                    : 'bg-[var(--zoom-red)] hover:bg-red-700 text-white shadow-red-900/30'
                }`}
                aria-label={audioEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
              >
                {audioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
              </button>

              <button
                onClick={toggleVideo}
                className={`flex h-12 w-12 items-center justify-center rounded-full shadow-md active:scale-95 transition-all duration-200 ${
                  videoEnabled
                    ? 'bg-white/15 hover:bg-white/25 text-white'
                    : 'bg-[var(--zoom-red)] hover:bg-red-700 text-white shadow-red-900/30'
                }`}
                aria-label={videoEnabled ? 'Stop Video' : 'Start Video'}
              >
                {videoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
              </button>
            </div>

            {mediaError && (
              <p className="mt-3 text-xs text-amber-400 font-medium">
                Camera/mic permission was blocked. You can join in audio/avatar mode.
              </p>
            )}
          </div>

          {/* Join details form */}
          <div className="flex flex-col gap-5 border-t md:border-t-0 md:border-l border-white/10 pt-6 md:pt-0 md:pl-8">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Ready to join?</h2>
              <p className="text-xs text-white/60 mt-1">
                Configure your display name before entering the room
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/80 mb-1.5 uppercase tracking-wider">
                  Your Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  placeholder="e.g. Anil Kumawat"
                  maxLength={60}
                  className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/20 text-white text-sm placeholder:text-white/30 focus:border-[var(--zoom-blue)] focus:ring-2 focus:ring-[var(--zoom-blue)]/20 focus:outline-none transition-all"
                />
              </div>

              {meetingInfo?.requires_passcode && (
                <div>
                  <label className="block text-xs font-bold text-white/80 mb-1.5 uppercase tracking-wider">
                    Meeting Passcode
                  </label>
                  <input
                    type="password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                    placeholder="Enter passcode"
                    className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/20 text-white text-sm font-mono placeholder:text-white/30 focus:border-[var(--zoom-blue)] focus:ring-2 focus:ring-[var(--zoom-blue)]/20 focus:outline-none transition-all"
                  />
                </div>
              )}

              {!user && (
                <label className="flex items-center gap-2.5 text-xs text-white/70 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={rememberName}
                    onChange={(e) => setRememberName(e.target.checked)}
                    className="rounded-md border-white/30 text-[var(--zoom-blue)] focus:ring-0 accent-[var(--zoom-blue)]"
                  />
                  Remember my name for future meetings
                </label>
              )}
            </div>

            <button
              onClick={handleJoin}
              disabled={!displayName.trim() || loading}
              className="mt-2 w-full h-12 rounded-full font-bold text-sm shadow-md hover:shadow-lg active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'var(--zoom-blue)', color: 'white' }}
            >
              {loading ? 'Connecting to Room...' : 'Join Meeting'}
            </button>

            <p className="text-[11px] leading-relaxed text-white/40 text-center">
              By clicking Join, you agree to our Terms of Service & Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
