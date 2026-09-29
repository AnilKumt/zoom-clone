'use client';

import { useRouter } from 'next/navigation';
import { Calendar, Plus, Camera, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/lib/api-client';
import { formatMeetingId } from '@/lib/utils';
import { toast } from 'sonner';
import { ROUTES } from '@/constants/routes';

// Quick action tiles + Personal Meeting ID — matches Zoom portal home right column
export function QuickActions() {
  const router = useRouter();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleNewMeeting = async () => {
    if (loading) return;
    try {
      setLoading(true);
      const meeting = await apiClient.post<{ meeting_code: string }>('/meetings/instant');
      router.push(ROUTES.lobby(meeting.meeting_code));
    } catch {
      toast.error('Failed to start meeting');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPmi = async () => {
    const pmi = user?.personal_meeting_id ?? '';
    await navigator.clipboard.writeText(formatMeetingId(pmi));
    setCopied(true);
    toast.success('Copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const tiles = [
    {
      icon: <Calendar size={28} className="text-white" />,
      label: 'Schedule',
      bg: 'var(--zoom-blue)',
      onClick: () => router.push(ROUTES.SCHEDULE),
      tooltip: 'Schedule a meeting',
    },
    {
      icon: <Plus size={28} className="text-white" />,
      label: 'Join',
      bg: 'var(--zoom-blue)',
      onClick: () => router.push(ROUTES.JOIN),
      tooltip: 'Join a meeting',
    },
    {
      icon: <Camera size={28} className="text-white" />,
      label: 'New Meeting',
      bg: 'var(--zoom-orange)',
      onClick: handleNewMeeting,
      tooltip: 'Host a meeting',
    },
  ];

  return (
    <div className="card p-6">
      {/* Quick action tiles */}
      <div className="flex justify-center gap-6 mb-6">
        {tiles.map((tile) => (
          <button
            key={tile.label}
            onClick={tile.onClick}
            title={tile.tooltip}
            disabled={tile.label === 'New Meeting' && loading}
            className="flex flex-col items-center gap-2 disabled:opacity-60"
          >
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl transition-opacity hover:opacity-90"
              style={{ background: tile.bg }}
            >
              {tile.icon}
            </div>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {tile.label}
            </span>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t" style={{ borderColor: 'var(--border)' }} />

      {/* Personal Meeting ID */}
      <div className="mt-4">
        <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Personal Meeting ID
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-base font-mono" style={{ color: 'var(--text-secondary)' }}>
            {formatMeetingId(user?.personal_meeting_id ?? '000 000 0000')}
          </span>
          <button
            onClick={handleCopyPmi}
            aria-label="Copy Personal Meeting ID"
            className="p-1 rounded hover:bg-gray-100 transition-colors"
          >
            {copied ? (
              <Check size={16} style={{ color: 'var(--zoom-green)' }} />
            ) : (
              <Copy size={16} style={{ color: 'var(--zoom-blue)' }} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
