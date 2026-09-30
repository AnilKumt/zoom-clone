'use client';

import { useAuth } from '@/providers/AuthProvider';
import { getInitials } from '@/lib/utils';
import { ShieldCheck, Sparkles } from 'lucide-react';

export function ProfileCard() {
  const { user } = useAuth();
  const name = user?.name ?? 'Loading...';

  return (
    <div className="card p-7 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center gap-6">
        {/* Squircle Avatar */}
        <div
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[22px] text-white text-2xl font-black shadow-md"
          style={{ background: 'var(--zoom-blue)' }}
          aria-label={`${name}'s avatar`}
        >
          {getInitials(name)}
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2
              className="text-2xl font-black leading-tight tracking-tight truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {name}
            </h2>
            <ShieldCheck size={18} className="text-[var(--zoom-blue)] shrink-0" />
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span
              className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full"
              style={{ background: 'var(--zoom-blue-tint)', color: 'var(--zoom-blue)' }}
            >
              <Sparkles size={12} /> Workplace Basic Plan
            </span>
            <span className="text-xs text-[var(--text-secondary)] font-medium">
              {user?.email ?? 'demo@zoomclone.dev'}
            </span>
          </div>
        </div>

        {/* MD3 Pill Actions */}
        <div className="flex sm:flex-col items-center sm:items-end gap-2.5 shrink-0 pt-2 sm:pt-0">
          <button
            className="px-5 py-2 rounded-full text-xs font-bold transition-all shadow-xs hover:shadow-sm active:scale-95"
            style={{ background: 'var(--zoom-blue-tint)', color: 'var(--zoom-blue)' }}
          >
            Manage Plan
          </button>
          <button
            className="text-xs font-bold px-3 py-1.5 rounded-full hover:bg-[var(--surface-tonal)] active:scale-95 transition-all"
            style={{ color: 'var(--zoom-blue)' }}
          >
            View Plan Details
          </button>
        </div>
      </div>
    </div>
  );
}
