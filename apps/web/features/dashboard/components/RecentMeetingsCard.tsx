'use client';

import { useQuery } from '@tanstack/react-query';
import { MoreHorizontal } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatMeetingId } from '@/lib/utils';
import type { ApiList, Meeting } from '@/types/api';
import { format } from 'date-fns';

export function RecentMeetingsCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['meetings', 'previous'],
    queryFn: () => apiClient.get<ApiList<Meeting>>('/meetings?scope=previous&limit=5'),
  });

  const meetings = data?.items ?? [];

  return (
    <div className="card p-6">
      <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
        Recent meetings
      </h2>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : meetings.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          No recent meetings
        </p>
      ) : (
        <div className="space-y-4">
          {meetings.map((meeting) => (
            <div
              key={meeting.id}
              className="flex gap-4 p-3 rounded-lg border"
              style={{ borderColor: 'var(--border)' }}
            >
              {/* Thumbnail placeholder — real recordings would render an actual image here */}
              <div
                className="shrink-0 h-[90px] w-[120px] rounded-lg"
                style={{ background: '#E8E8EF' }}
                aria-label="Meeting thumbnail"
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium" style={{ color: 'var(--zoom-blue)' }}>
                  {meeting.title}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  ended on{' '}
                  {meeting.ended_at
                    ? format(new Date(meeting.ended_at), 'MMM d, yyyy')
                    : '—'}{' '}
                  by {meeting.host_name}
                </p>

                {/* Badge */}
                <span
                  className="inline-block mt-2 text-xs px-2 py-0.5 border rounded"
                  style={{ borderColor: 'var(--zoom-orange)', color: 'var(--zoom-orange)' }}
                >
                  Meeting
                </span>
              </div>

              {/* More menu */}
              <button
                className="shrink-0 p-1 h-8 w-8 flex items-center justify-center rounded hover:bg-gray-100"
                aria-label="More options"
              >
                <MoreHorizontal size={16} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
