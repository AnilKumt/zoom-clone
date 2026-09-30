'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { Copy, Check, ArrowLeft, Video, Shield, Calendar, Clock, Globe } from 'lucide-react';
import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { formatMeetingId } from '@/lib/utils';
import type { Meeting } from '@/types/api';
import { ROUTES } from '@/constants/routes';
import { toast } from 'sonner';

export default function MeetingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;
  const [copied, setCopied] = useState(false);

  const { data: meeting, isLoading, error } = useQuery({
    queryKey: ['meeting', code],
    queryFn: () => apiClient.get<Meeting>(`/meetings/${code}`),
  });

  const handleCopyInvite = async () => {
    if (!meeting) return;
    await navigator.clipboard.writeText(meeting.invite_url);
    setCopied(true);
    toast.success('Invitation link copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartMeeting = async () => {
    try {
      await apiClient.post<Meeting>(`/meetings/${code}/start`);
      router.push(ROUTES.lobby(code));
    } catch {
      toast.error('Unable to start meeting');
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="h-64 rounded-card bg-white animate-pulse shadow-card p-6" />
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="card p-8 text-center">
          <p className="text-base font-medium" style={{ color: 'var(--text-secondary)' }}>
            Meeting not found or you do not have permission to view it.
          </p>
          <Link href={ROUTES.MEETINGS} className="btn-primary mt-4 inline-block text-sm">
            Back to Meetings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href={ROUTES.MEETINGS}
          className="flex items-center gap-1.5 text-sm font-medium text-[var(--zoom-blue)] hover:underline"
        >
          <ArrowLeft size={16} /> All Meetings
        </Link>
        <span
          className="px-3 py-1 rounded-pill text-xs font-semibold uppercase tracking-wider"
          style={{
            background: meeting.status === 'live' ? 'var(--zoom-green)' : 'var(--zoom-blue-tint)',
            color: meeting.status === 'live' ? 'white' : 'var(--zoom-blue)',
          }}
        >
          {meeting.status}
        </span>
      </div>

      <div className="card p-8">
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
          {meeting.title}
        </h1>

        {meeting.description && (
          <p className="text-sm mb-6 pb-6 border-b" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>
            {meeting.description}
          </p>
        )}

        <div className="space-y-4 text-sm">
          <div className="flex items-start gap-4">
            <Calendar size={18} className="text-[var(--text-secondary)] shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block text-[var(--text-primary)]">Time</span>
              <span className="text-[var(--text-secondary)]">
                {meeting.scheduled_start_at
                  ? format(new Date(meeting.scheduled_start_at), 'EEEE, MMMM d, yyyy · h:mm a')
                  : 'Instant / Anytime'}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <Clock size={18} className="text-[var(--text-secondary)] shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block text-[var(--text-primary)]">Duration</span>
              <span className="text-[var(--text-secondary)]">
                {meeting.duration_minutes ? `${meeting.duration_minutes} minutes` : 'No duration limit'}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <Video size={18} className="text-[var(--text-secondary)] shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block text-[var(--text-primary)]">Meeting ID</span>
              <span className="font-mono text-base font-semibold text-[var(--text-primary)]">
                {formatMeetingId(meeting.meeting_code)}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <Globe size={18} className="text-[var(--text-secondary)] shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block text-[var(--text-primary)]">Invite Link</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="truncate text-[var(--zoom-blue)] font-mono text-xs select-all">
                  {meeting.invite_url}
                </span>
                <button
                  onClick={handleCopyInvite}
                  className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                  aria-label="Copy invitation link"
                >
                  {copied ? (
                    <Check size={16} className="text-[var(--zoom-green)]" />
                  ) : (
                    <Copy size={16} className="text-[var(--zoom-blue)]" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {meeting.requires_passcode && (
            <div className="flex items-start gap-4">
              <Shield size={18} className="text-[var(--text-secondary)] shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block text-[var(--text-primary)]">Passcode</span>
                <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">
                  {meeting.passcode ?? 'Required (Protected)'}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mt-8 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={handleStartMeeting}
            className="btn-primary flex items-center gap-2 px-6 py-2.5 text-sm font-semibold"
          >
            <Video size={16} /> Start Meeting
          </button>
          <button
            onClick={handleCopyInvite}
            className="btn-outline flex items-center gap-2 px-4 py-2.5 text-sm font-medium"
          >
            <Copy size={16} /> Copy Invitation
          </button>
        </div>
      </div>
    </div>
  );
}
