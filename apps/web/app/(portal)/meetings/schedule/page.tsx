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
  // Round up to next 15-minute slot for a sensible default start time
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

      // Invalidate upcoming list so dashboard refreshes immediately
      await queryClient.invalidateQueries({ queryKey: ['meetings', 'upcoming'] });
      toast.success('Meeting scheduled!');
      router.push(ROUTES.meetingDetail(meeting.meeting_code));
    } catch (err) {
      toast.error(apiClient.isApiError(err) ? err.message : 'Failed to schedule meeting');
    } finally {
      setLoading(false);
    }
  };

  const labelClass = 'text-sm font-medium text-right pr-4 pt-2.5 shrink-0';
  const controlClass = 'w-full h-9 px-3 border rounded-control text-sm';

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Schedule a Meeting</h1>

      <div className="card p-8">
        <div className="space-y-5">
          {/* Topic */}
          <div className="grid" style={{ gridTemplateColumns: '180px 1fr' }}>
            <label className={labelClass}>Topic</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={controlClass}
              style={{ borderColor: 'var(--border)' }}
            />
          </div>

          {/* Description */}
          <div className="grid" style={{ gridTemplateColumns: '180px 1fr' }}>
            <label className={labelClass} style={{ color: 'var(--text-secondary)' }}>
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border rounded-control text-sm resize-none"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>

          {/* When */}
          <div className="grid" style={{ gridTemplateColumns: '180px 1fr' }}>
            <label className={labelClass}>When</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-9 px-2 border rounded-control text-sm"
                style={{ borderColor: 'var(--border)' }}
              />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                step="900"
                className="h-9 px-2 border rounded-control text-sm"
                style={{ borderColor: 'var(--border)' }}
              />
            </div>
          </div>

          {/* Duration */}
          <div className="grid" style={{ gridTemplateColumns: '180px 1fr' }}>
            <label className={labelClass}>Duration</label>
            <div className="flex gap-2">
              <select
                value={durationHr}
                onChange={(e) => setDurationHr(Number(e.target.value))}
                className="h-9 px-2 border rounded-control text-sm"
                style={{ borderColor: 'var(--border)' }}
              >
                {Array.from({ length: 25 }, (_, i) => (
                  <option key={i} value={i}>{i} hr</option>
                ))}
              </select>
              <select
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                className="h-9 px-2 border rounded-control text-sm"
                style={{ borderColor: 'var(--border)' }}
              >
                {[0, 15, 30, 45].map((m) => (
                  <option key={m} value={m}>{m} min</option>
                ))}
              </select>
            </div>
          </div>

          {/* Timezone */}
          <div className="grid" style={{ gridTemplateColumns: '180px 1fr' }}>
            <label className={labelClass}>Time Zone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="h-9 px-2 border rounded-control text-sm"
              style={{ borderColor: 'var(--border)' }}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>

          {/* Meeting ID */}
          <div className="grid" style={{ gridTemplateColumns: '180px 1fr' }}>
            <label className={labelClass}>Meeting ID</label>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="meetingId"
                  value="generate"
                  checked={meetingIdType === 'generate'}
                  onChange={() => setMeetingIdType('generate')}
                />
                Generate Automatically
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="meetingId"
                  value="personal"
                  checked={meetingIdType === 'personal'}
                  onChange={() => setMeetingIdType('personal')}
                />
                Personal Meeting ID{' '}
                {user?.personal_meeting_id ? formatMeetingId(user.personal_meeting_id) : ''}
              </label>
            </div>
          </div>

          {/* Passcode */}
          <div className="grid" style={{ gridTemplateColumns: '180px 1fr' }}>
            <label className={labelClass}>Security</label>
            <div>
              <label className="flex items-center gap-2 text-sm mb-2">
                <input
                  type="checkbox"
                  checked={usePasscode}
                  onChange={(e) => setUsePasscode(e.target.checked)}
                />
                Passcode
              </label>
              {usePasscode && (
                <input
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="h-9 px-3 border rounded-control text-sm w-32 font-mono"
                  style={{ borderColor: 'var(--border)' }}
                  maxLength={10}
                />
              )}
            </div>
          </div>

          {/* Video */}
          <div className="grid" style={{ gridTemplateColumns: '180px 1fr' }}>
            <label className={labelClass}>Video</label>
            <div className="space-y-1.5">
              <div className="flex items-center gap-8 text-sm">
                <span className="w-24">Host</span>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="hostVideo"
                    checked={hostVideo}
                    onChange={() => setHostVideo(true)}
                  />{' '}
                  On
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="hostVideo"
                    checked={!hostVideo}
                    onChange={() => setHostVideo(false)}
                  />{' '}
                  Off
                </label>
              </div>
              <div className="flex items-center gap-8 text-sm">
                <span className="w-24">Participant</span>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="partVideo"
                    checked={participantVideo}
                    onChange={() => setParticipantVideo(true)}
                  />{' '}
                  On
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="partVideo"
                    checked={!participantVideo}
                    onChange={() => setParticipantVideo(false)}
                  />{' '}
                  Off
                </label>
              </div>
            </div>
          </div>

          {/* Options (collapsible) */}
          <div className="grid" style={{ gridTemplateColumns: '180px 1fr' }}>
            <label className={labelClass}>Options</label>
            <div>
              <button
                onClick={() => setShowOptions(!showOptions)}
                className="text-sm mb-2"
                style={{ color: 'var(--zoom-blue)' }}
              >
                {showOptions ? 'Hide options ▴' : 'Show options ▾'}
              </button>
              {showOptions && (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={muteOnEntry}
                      onChange={(e) => setMuteOnEntry(e.target.checked)}
                    />
                    Mute participants upon entry
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={joinBeforeHost}
                      onChange={(e) => setJoinBeforeHost(e.target.checked)}
                    />
                    Allow participants to join before host
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={waitingRoom}
                      onChange={(e) => setWaitingRoom(e.target.checked)}
                    />
                    Enable waiting room
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 h-10 rounded-control text-sm font-semibold"
            style={{ background: 'var(--zoom-blue)', color: 'white' }}
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => router.back()}
            className="px-6 h-10 rounded-control text-sm font-medium border"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
