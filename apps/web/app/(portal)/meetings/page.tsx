'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatMeetingId } from '@/lib/utils';
import type { ApiList, Meeting } from '@/types/api';
import { ROUTES } from '@/constants/routes';

type Tab = 'upcoming' | 'previous';

export default function MeetingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('upcoming');

  const { data, isLoading } = useQuery({
    queryKey: ['meetings', tab],
    queryFn: () => apiClient.get<ApiList<Meeting>>(`/meetings?scope=${tab}&limit=20`),
  });

  const meetings = data?.items ?? [];

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Meetings</h1>
        <Link
          href={ROUTES.SCHEDULE}
          className="flex items-center gap-1.5 px-4 py-2 rounded-control text-sm font-semibold"
          style={{ background: 'var(--zoom-blue)', color: 'white' }}
        >
          <Plus size={16} /> Schedule
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-6" style={{ borderColor: 'var(--border)' }}>
        {(['upcoming', 'previous'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2.5 text-sm font-medium capitalize border-b-2 -mb-px transition-colors"
            style={{
              borderColor: tab === t ? 'var(--zoom-blue)' : 'transparent',
              color: tab === t ? 'var(--zoom-blue)' : 'var(--text-secondary)',
            }}
          >
            {t === 'upcoming' ? 'Upcoming' : 'Previous'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : meetings.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
            No {tab} meetings
          </p>
          {tab === 'upcoming' && (
            <Link
              href={ROUTES.SCHEDULE}
              className="inline-block mt-4 px-4 py-2 rounded-control text-sm font-medium"
              style={{ background: 'var(--zoom-blue)', color: 'white' }}
            >
              Schedule a Meeting
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting) => (
            <div key={meeting.id} className="card p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <Link
                  href={ROUTES.meetingDetail(meeting.meeting_code)}
                  className="font-semibold hover:underline"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {meeting.title}
                </Link>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {meeting.scheduled_start_at
                      ? format(new Date(meeting.scheduled_start_at), 'MMM d, yyyy h:mm a')
                      : meeting.status === 'live'
                      ? 'In progress'
                      : 'No time set'}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    ID: {formatMeetingId(meeting.meeting_code)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {meeting.status === 'scheduled' && (
                  <button
                    onClick={() => router.push(ROUTES.lobby(meeting.meeting_code))}
                    className="px-3 py-1.5 rounded-control text-sm font-medium"
                    style={{ background: 'var(--zoom-blue)', color: 'white' }}
                  >
                    Start
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
