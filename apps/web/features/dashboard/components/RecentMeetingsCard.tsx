'use client';

import { useQuery } from '@tanstack/react-query';
import { MoreHorizontal, History, Video } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import type { ApiList, Meeting } from '@/types/api';
import { format } from 'date-fns';

export function RecentMeetingsCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['meetings', 'previous'],
    queryFn: () => apiClient.get<ApiList<Meeting>>('/meetings?scope=previous&limit=5'),
  });

  const meetings = data?.items ?? [];

  return (
    <div className="card p-7 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-300">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <History size={20} className="text-[var(--zoom-blue)]" />
          <h2 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Recent Meetings
          </h2>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : meetings.length === 0 ? (
        <div
          className="rounded-2xl p-6 text-center border border-dashed border-slate-200"
          style={{ background: 'var(--surface-tonal)' }}
        >
          <p className="text-sm font-semibold text-[var(--text-secondary)]">No recent meetings found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting) => (
            <div
              key={meeting.id}
              className="flex items-center gap-4 p-3.5 rounded-2xl bg-[var(--surface-tonal)]/70 border border-slate-100 hover:bg-white hover:shadow-md hover:border-slate-200 transition-all duration-200"
            >
              {/* Thumbnail placeholder */}
              <div
                className="shrink-0 h-16 w-20 rounded-xl flex items-center justify-center bg-slate-200/80 text-slate-500 shadow-xs"
                aria-label="Meeting thumbnail"
              >
                <Video size={20} className="text-slate-400" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate" style={{ color: 'var(--zoom-blue)' }}>
                  {meeting.title}
                </p>
                <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Ended {meeting.ended_at ? format(new Date(meeting.ended_at), 'MMM d, yyyy') : 'Recently'} &middot; by {meeting.host_name}
                </p>

                {/* Badge */}
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span
                    className="inline-block text-[11px] px-2.5 py-0.5 rounded-full font-bold shadow-xs"
                    style={{ background: 'rgba(242, 109, 33, 0.1)', color: 'var(--zoom-orange)' }}
                  >
                    Recorded
                  </span>
                </div>
              </div>

              {/* More options button */}
              <button
                className="shrink-0 p-2 h-9 w-9 flex items-center justify-center rounded-full hover:bg-[var(--surface-tonal)] active:scale-90 transition-all"
                aria-label="More options"
              >
                <MoreHorizontal size={18} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
