'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Upcoming meetings
        </h2>
        <Link
          href={ROUTES.MEETINGS}
          className="text-sm font-medium"
          style={{ color: 'var(--zoom-blue)' }}
        >
          Visit Meetings
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : meetings.length === 0 ? (
        // Empty state matches Zoom portal
        <div
          className="rounded-lg px-4 py-3 text-center"
          style={{ background: '#F5F5F5', color: 'var(--text-secondary)' }}
        >
          <p className="text-sm">No Upcoming Meetings</p>
          <button
            className="mt-3 px-4 py-1.5 rounded-pill text-sm font-medium transition-colors"
            style={{ background: 'var(--zoom-blue-tint)', color: 'var(--zoom-blue)' }}
          >
            Test Audio and Video
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.slice(0, 5).map((meeting) => (
            <div
              key={meeting.id}
              className="flex items-center justify-between py-2 border-b last:border-0"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="min-w-0">
                <p
                  className="text-sm font-medium truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {meeting.title}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {meeting.scheduled_start_at
                    ? format(new Date(meeting.scheduled_start_at), 'MMM d, h:mm a')
                    : 'Anytime'}{' '}
                  &middot; ID: {formatMeetingId(meeting.meeting_code)}
                </p>
              </div>
              <button
                onClick={() => handleStart(meeting.meeting_code)}
                className="ml-3 shrink-0 px-3 py-1 rounded-control text-sm font-medium"
                style={{ background: 'var(--zoom-blue)', color: 'white' }}
              >
                Start
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
