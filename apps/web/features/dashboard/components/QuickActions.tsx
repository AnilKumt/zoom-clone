'use client';

import { useRouter } from 'next/navigation';
import { Calendar, Plus, Camera, Copy, Check, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/lib/api-client';
import { formatMeetingId } from '@/lib/utils';
import { toast } from 'sonner';
import { ROUTES } from '@/constants/routes';

// Quick action tiles + Personal Meeting ID with MD3 feel and micro-interactions
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
    toast.success('Meeting ID copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const tiles = [
    {
      icon: <Calendar size={30} className="text-white transition-transform group-hover:scale-110 duration-200" />,
      label: 'Schedule',
      bg: 'var(--zoom-blue)',
      onClick: () => router.push(ROUTES.SCHEDULE),
      tooltip: 'Schedule a future meeting',
    },
    {
      icon: <Plus size={32} className="text-white transition-transform group-hover:scale-110 duration-200" />,
      label: 'Join',
      bg: 'var(--zoom-blue)',
      onClick: () => router.push(ROUTES.JOIN),
      tooltip: 'Join with Meeting ID',
    },
    {
      icon: <Camera size={30} className="text-white transition-transform group-hover:scale-110 duration-200" />,
      label: 'New Meeting',
      bg: 'var(--zoom-orange)',
      onClick: handleNewMeeting,
      tooltip: 'Start instant meeting',
    },
  ];

  return (
    <div className="card p-7 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-300">
      {/* Quick action tiles */}
      <div className="flex justify-around items-center mb-6">
        {tiles.map((tile) => (
          <button
            key={tile.label}
            onClick={tile.onClick}
            title={tile.tooltip}
            disabled={tile.label === 'New Meeting' && loading}
            className="group flex flex-col items-center gap-2.5 focus-visible:outline-none disabled:opacity-60"
          >
            <div
              className="flex h-20 w-20 items-center justify-center rounded-[24px] shadow-md group-hover:shadow-xl group-hover:-translate-y-1.5 group-active:scale-95 transition-all duration-200 ease-out"
              style={{ background: tile.bg }}
            >
              {tile.icon}
            </div>
            <span className="text-xs font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {tile.label}
            </span>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t my-4" style={{ borderColor: 'var(--border)' }} />

      {/* Personal Meeting ID */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Personal Meeting ID (PMI)
          </h3>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--surface-tonal)] text-[var(--text-secondary)]">
            Permanent
          </span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--surface-tonal)] border border-slate-100">
          <span className="text-base font-bold font-mono tracking-wide" style={{ color: 'var(--text-primary)' }}>
            {formatMeetingId(user?.personal_meeting_id ?? '000 000 0000')}
          </span>
          <button
            onClick={handleCopyPmi}
            aria-label="Copy Personal Meeting ID"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white shadow-xs hover:shadow-sm hover:bg-slate-50 active:scale-95 transition-all"
            style={{ color: copied ? 'var(--zoom-green)' : 'var(--zoom-blue)' }}
          >
            {copied ? (
              <>
                <Check size={14} /> Copied
              </>
            ) : (
              <>
                <Copy size={14} /> Copy ID
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
