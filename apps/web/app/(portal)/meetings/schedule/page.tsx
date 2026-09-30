'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/lib/api-client';
import { formatMeetingId } from '@/lib/utils';
import type { Meeting } from '@/types/api';
import { ROUTES } from '@/constants/routes';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Calendar, Clock, Lock, Video, ChevronDown, Sparkles } from 'lucide-react';

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Los_Angeles', 'America/Chicago',
  'Europe/London', 'Europe/Paris', 'Asia/Kolkata', 'Asia/Tokyo', 'Asia/Singapore',
  'Australia/Sydney',
];

export default function SchedulePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const defaultTitle = user ? `${user.name}'s Zoom Meeting` : 'Zoom Meeting';
  const now = new Date();
  const roundedNow = new Date(Math.ceil(now.getTime() / (15 * 60 * 1000)) * (15 * 60 * 1000));

  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(roundedNow, 'yyyy-MM-dd'));
  const [time, setTime] = useState(format(roundedNow, 'HH:mm'));
  const [durationHr, setDurationHr] = useState(1);
  const [durationMin, setDurationMin] = useState(0);
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  );
  const [meetingIdType, setMeetingIdType] = useState<'generate' | 'personal'>('generate');
  const [usePasscode, setUsePasscode] = useState(true);
  const [passcode, setPasscode] = useState(
    () => Math.random().toString(36).slice(2, 8).toUpperCase()
  );
  const [hostVideo, setHostVideo] = useState(true);
  const [participantVideo, setParticipantVideo] = useState(true);
  const [muteOnEntry, setMuteOnEntry] = useState(false);
  const [joinBeforeHost, setJoinBeforeHost] = useState(false);
  const [waitingRoom, setWaitingRoom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const handleSave = async () => {
    const durationMinutes = durationHr * 60 + durationMin;
    if (durationMinutes < 5) {
      toast.error('Duration must be at least 5 minutes');
      return;
    }

    const scheduledAt = new Date(`${date}T${time}`);

    setLoading(true);
    try {
      const meeting = await apiClient.post<Meeting>('/meetings', {
        title,
        description: description || undefined,
        scheduled_start_at: scheduledAt.toISOString(),
        duration_minutes: durationMinutes,
        timezone,
        meeting_id_type: meetingIdType,
        passcode: usePasscode ? passcode : undefined,
        host_video_on: hostVideo,
        participant_video_on: participantVideo,
        mute_on_entry: muteOnEntry,
        join_before_host: joinBeforeHost,
        waiting_room: waitingRoom,
      });

      await queryClient.invalidateQueries({ queryKey: ['meetings', 'upcoming'] });
      toast.success('Meeting scheduled successfully!');
      router.push(ROUTES.meetingDetail(meeting.meeting_code));
    } catch (err) {
      toast.error(apiClient.isApiError(err) ? err.message : 'Failed to schedule meeting');
    } finally {
      setLoading(false);
    }
  };

  const labelClass = 'text-sm font-bold text-left md:text-right pr-4 pt-2.5 shrink-0 text-[var(--text-primary)]';
  const inputClass = 'w-full h-11 px-4 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[var(--zoom-blue)]/20 focus:border-[var(--zoom-blue)] outline-none transition-all duration-200';

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Schedule a Meeting
        </h1>
        <p className="text-sm font-medium text-[var(--text-secondary)] mt-1">
          Configure meeting settings, security, and timing
        </p>
      </div>

      <div className="card p-8 md:p-10 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-300">
        <div className="space-y-6">
          {/* Topic */}
          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-2 md:gap-4 items-start">
            <label className={labelClass}>Topic</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              placeholder="Meeting topic or title"
            />
          </div>

          {/* Description */}
          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-2 md:gap-4 items-start">
            <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[var(--zoom-blue)]/20 focus:border-[var(--zoom-blue)] outline-none resize-none transition-all duration-200"
              placeholder="Enter meeting agenda or notes (optional)"
            />
          </div>

          {/* When */}
          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-2 md:gap-4 items-start">
            <label className={labelClass}>When</label>
            <div className="flex flex-wrap gap-3">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-11 px-3 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[var(--zoom-blue)]/20 focus:border-[var(--zoom-blue)] outline-none transition-all duration-200"
              />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                step="900"
                className="h-11 px-3 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[var(--zoom-blue)]/20 focus:border-[var(--zoom-blue)] outline-none transition-all duration-200"
              />
            </div>
          </div>

          {/* Duration */}
          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-2 md:gap-4 items-start">
            <label className={labelClass}>Duration</label>
            <div className="flex gap-3">
              <select
                value={durationHr}
                onChange={(e) => setDurationHr(Number(e.target.value))}
                className="h-11 px-4 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[var(--zoom-blue)]/20 focus:border-[var(--zoom-blue)] outline-none transition-all duration-200"
              >
                {Array.from({ length: 25 }, (_, i) => (
                  <option key={i} value={i}>{i} hr</option>
                ))}
              </select>
              <select
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                className="h-11 px-4 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[var(--zoom-blue)]/20 focus:border-[var(--zoom-blue)] outline-none transition-all duration-200"
              >
                {[0, 15, 30, 45].map((m) => (
                  <option key={m} value={m}>{m} min</option>
                ))}
              </select>
            </div>
          </div>

          {/* Timezone */}
          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-2 md:gap-4 items-start">
            <label className={labelClass}>Time Zone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="h-11 px-4 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[var(--zoom-blue)]/20 focus:border-[var(--zoom-blue)] outline-none transition-all duration-200 max-w-sm"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>

          {/* Meeting ID */}
          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-2 md:gap-4 items-start">
            <label className={labelClass}>Meeting ID</label>
            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2.5 text-sm font-medium cursor-pointer">
                <input
                  type="radio"
                  name="meetingId"
                  value="generate"
                  checked={meetingIdType === 'generate'}
                  onChange={() => setMeetingIdType('generate')}
                  className="accent-[var(--zoom-blue)] h-4 w-4"
                />
                Generate Automatically
              </label>
              <label className="flex items-center gap-2.5 text-sm font-medium cursor-pointer">
                <input
                  type="radio"
                  name="meetingId"
                  value="personal"
                  checked={meetingIdType === 'personal'}
                  onChange={() => setMeetingIdType('personal')}
                  className="accent-[var(--zoom-blue)] h-4 w-4"
                />
                Personal Meeting ID{' '}
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-[var(--surface-tonal)] text-[var(--zoom-blue)]">
                  {user?.personal_meeting_id ? formatMeetingId(user.personal_meeting_id) : ''}
                </span>
              </label>
            </div>
          </div>

          {/* Passcode */}
          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-2 md:gap-4 items-start">
            <label className={labelClass}>Security</label>
            <div className="space-y-3 pt-1">
              <label className="flex items-center gap-2.5 text-sm font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={usePasscode}
                  onChange={(e) => setUsePasscode(e.target.checked)}
                  className="accent-[var(--zoom-blue)] h-4 w-4 rounded"
                />
                Require Passcode
              </label>
              {usePasscode && (
                <input
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="h-10 px-4 border border-slate-200 rounded-xl text-sm w-36 font-mono font-bold uppercase tracking-wider bg-white focus:ring-2 focus:ring-[var(--zoom-blue)]/20 focus:border-[var(--zoom-blue)] outline-none"
                  maxLength={10}
                />
              )}
            </div>
          </div>

          {/* Video */}
          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-2 md:gap-4 items-start">
            <label className={labelClass}>Video</label>
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-8 text-sm">
                <span className="w-24 font-medium text-[var(--text-secondary)]">Host</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="hostVideo"
                    checked={hostVideo}
                    onChange={() => setHostVideo(true)}
                    className="accent-[var(--zoom-blue)]"
                  />{' '}
                  On
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="hostVideo"
                    checked={!hostVideo}
                    onChange={() => setHostVideo(false)}
                    className="accent-[var(--zoom-blue)]"
                  />{' '}
                  Off
                </label>
              </div>
              <div className="flex items-center gap-8 text-sm">
                <span className="w-24 font-medium text-[var(--text-secondary)]">Participant</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="partVideo"
                    checked={participantVideo}
                    onChange={() => setParticipantVideo(true)}
                    className="accent-[var(--zoom-blue)]"
                  />{' '}
                  On
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="partVideo"
                    checked={!participantVideo}
                    onChange={() => setParticipantVideo(false)}
                    className="accent-[var(--zoom-blue)]"
                  />{' '}
                  Off
                </label>
              </div>
            </div>
          </div>

          {/* Options (collapsible) */}
          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-2 md:gap-4 items-start">
            <label className={labelClass}>Advanced</label>
            <div>
              <button
                onClick={() => setShowOptions(!showOptions)}
                className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-[var(--surface-tonal)] hover:bg-slate-200/60 active:scale-95 transition-all text-[var(--zoom-blue)] mb-3"
              >
                {showOptions ? 'Hide Meeting Options' : 'Show Meeting Options'}
                <ChevronDown size={14} className={showOptions ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
              {showOptions && (
                <div className="space-y-3 p-4 rounded-2xl bg-[var(--surface-tonal)] border border-slate-100 animate-scale-in">
                  <label className="flex items-center gap-2.5 text-sm font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={muteOnEntry}
                      onChange={(e) => setMuteOnEntry(e.target.checked)}
                      className="accent-[var(--zoom-blue)] h-4 w-4 rounded"
                    />
                    Mute participants upon entry
                  </label>
                  <label className="flex items-center gap-2.5 text-sm font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={joinBeforeHost}
                      onChange={(e) => setJoinBeforeHost(e.target.checked)}
                      className="accent-[var(--zoom-blue)] h-4 w-4 rounded"
                    />
                    Allow participants to join before host
                  </label>
                  <label className="flex items-center gap-2.5 text-sm font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={waitingRoom}
                      onChange={(e) => setWaitingRoom(e.target.checked)}
                      className="accent-[var(--zoom-blue)] h-4 w-4 rounded"
                    />
                    Enable waiting room
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 mt-10 pt-6 border-t border-slate-100">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-8 py-3 rounded-full text-sm font-bold shadow-sm hover:shadow-md active:scale-95 transition-all"
            style={{ background: 'var(--zoom-blue)', color: 'white' }}
          >
            {loading ? 'Scheduling...' : 'Schedule Meeting'}
          </button>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 rounded-full text-sm font-bold border border-[var(--surface-border)] hover:bg-[var(--surface-tonal)] active:scale-95 transition-all"
            style={{ color: 'var(--text-primary)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
