'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Plus, Calendar, Play, Clock, Hash } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatMeetingId } from '@/lib/utils';
import type { ApiList, Meeting } from '@/types/api';
import { ROUTES } from '@/constants/routes';
import { toast } from 'sonner';

type Tab = 'upcoming' | 'previous';

export default function MeetingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('upcoming');

  const { data, isLoading } = useQuery({
    queryKey: ['meetings', tab],
    queryFn: () => apiClient.get<ApiList<Meeting>>(`/meetings?scope=${tab}&limit=20`),
  });

  const meetings = data?.items ?? [];

  const handleStart = async (code: string) => {
    try {
      await apiClient.post<Meeting>(`/meetings/${code}/start`);
      router.push(ROUTES.lobby(code));
    } catch {
      toast.error('Unable to start meeting');
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Meetings
          </h1>
          <p className="text-sm font-medium text-[var(--text-secondary)] mt-1">
            Manage your upcoming sessions and view past recordings
          </p>
        </div>
        <Link
          href={ROUTES.SCHEDULE}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold shadow-sm hover:shadow-md active:scale-95 transition-all"
          style={{ background: 'var(--zoom-blue)', color: 'white' }}
        >
          <Plus size={18} /> Schedule a Meeting
        </Link>
      </div>

      {/* MD3 Segmented Pill Tab Bar */}
      <div className="inline-flex p-1.5 rounded-full bg-[var(--surface-tonal)] border border-slate-200/60 mb-8">
        {(['upcoming', 'previous'] as Tab[]).map((t) => {
          const isActive = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-2 rounded-full text-xs font-bold capitalize transition-all duration-200 ${
                isActive
                  ? 'bg-white shadow-sm text-[var(--zoom-blue)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t === 'upcoming' ? 'Upcoming Meetings' : 'Previous Meetings'}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : meetings.length === 0 ? (
        <div className="card p-12 text-center border-dashed">
          <Calendar size={36} className="mx-auto text-slate-300 mb-3" />
          <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            No {tab} meetings found
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1 mb-6">
            {tab === 'upcoming' ? 'Plan ahead by scheduling your next collaboration' : 'Past completed meetings will appear here'}
          </p>
          {tab === 'upcoming' && (
            <Link
              href={ROUTES.SCHEDULE}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-xs font-bold shadow-xs hover:shadow-sm active:scale-95 transition-all"
              style={{ background: 'var(--zoom-blue)', color: 'white' }}
            >
              <Plus size={15} /> Schedule Now
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {meetings.map((meeting) => (
            <div
              key={meeting.id}
              className="card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-200"
            >
              <div className="flex-1 min-w-0">
                <Link
                  href={ROUTES.meetingDetail(meeting.meeting_code)}
                  className="text-base font-bold hover:text-[var(--zoom-blue)] transition-colors line-clamp-1"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {meeting.title}
                </Link>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--surface-tonal)] text-[var(--text-secondary)]">
                    <Clock size={12} />
                    {meeting.scheduled_start_at
                      ? format(new Date(meeting.scheduled_start_at), 'MMM d, yyyy · h:mm a')
                      : meeting.status === 'live'
                      ? 'In progress'
                      : 'Recurring'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-mono font-medium text-[var(--text-secondary)]">
                    <Hash size={12} />
                    ID: {formatMeetingId(meeting.meeting_code)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {meeting.status === 'scheduled' && (
                  <button
                    onClick={() => handleStart(meeting.meeting_code)}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-bold shadow-xs hover:shadow-md active:scale-95 transition-all"
                    style={{ background: 'var(--zoom-blue)', color: 'white' }}
                  >
                    <Play size={13} className="fill-current" /> Start
                  </button>
                )}
                <Link
                  href={ROUTES.meetingDetail(meeting.meeting_code)}
                  className="px-4 py-2 rounded-full text-xs font-bold border border-[var(--surface-border)] hover:bg-[var(--surface-tonal)] active:scale-95 transition-all"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
