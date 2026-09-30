'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, ArrowRight, Play } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatMeetingId } from '@/lib/utils';
import type { ApiList, Meeting } from '@/types/api';
import { ROUTES } from '@/constants/routes';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function UpcomingMeetingsCard() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ['meetings', 'upcoming'],
    queryFn: () => apiClient.get<ApiList<Meeting>>('/meetings?scope=upcoming&limit=5'),
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
    <div className="card p-7 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-300">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Calendar size={20} className="text-[var(--zoom-blue)]" />
          <h2 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Upcoming Meetings
          </h2>
        </div>
        <Link
          href={ROUTES.MEETINGS}
          className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-[var(--surface-tonal)] active:scale-95 transition-all"
          style={{ color: 'var(--zoom-blue)' }}
        >
          View All <ArrowRight size={13} />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : meetings.length === 0 ? (
        <div
          className="rounded-2xl p-6 text-center border border-dashed border-slate-200"
          style={{ background: 'var(--surface-tonal)' }}
        >
          <p className="text-sm font-semibold text-[var(--text-secondary)]">No upcoming meetings scheduled</p>
          <Link
            href={ROUTES.SCHEDULE}
            className="inline-block mt-3 px-5 py-2 rounded-full text-xs font-bold shadow-xs hover:shadow-sm active:scale-95 transition-all"
            style={{ background: 'var(--zoom-blue)', color: 'white' }}
          >
            Schedule a Meeting
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.slice(0, 5).map((meeting) => (
            <div
              key={meeting.id}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--surface-tonal)]/70 border border-slate-100 hover:bg-white hover:shadow-md hover:border-slate-200 transition-all duration-200"
            >
              <div className="min-w-0 pr-3">
                <p
                  className="text-sm font-bold truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {meeting.title}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white text-[var(--zoom-blue)] shadow-xs">
                    {meeting.scheduled_start_at
                      ? format(new Date(meeting.scheduled_start_at), 'MMM d, h:mm a')
                      : 'Anytime'}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)] font-mono">
                    ID: {formatMeetingId(meeting.meeting_code)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleStart(meeting.meeting_code)}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold shadow-xs hover:shadow-md active:scale-95 transition-all"
                style={{ background: 'var(--zoom-blue)', color: 'white' }}
              >
                <Play size={12} className="fill-current" /> Start
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
