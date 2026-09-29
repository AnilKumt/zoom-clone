'use client';

import { useAuth } from '@/providers/AuthProvider';
import { getInitials } from '@/lib/utils';

export function ProfileCard() {
  const { user } = useAuth();
  const name = user?.name ?? 'Loading...';

  return (
    <div className="card p-6">
      <div className="flex items-center gap-6">
        {/* Avatar */}
        <div
          className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg text-white text-3xl font-bold"
          style={{ background: 'var(--zoom-blue)' }}
          aria-label={`${name}'s avatar`}
        >
          {getInitials(name)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h2
            className="text-[28px] font-bold leading-tight truncate"
            style={{ color: 'var(--text-primary)' }}
          >
            {name}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Plan:</span>
            <span className="text-sm font-medium">Workplace Basic</span>
          </div>
        </div>

        {/* Actions */}
        <div className="hidden sm:flex flex-col items-end gap-2">
          <button
            className="px-4 py-2 rounded-pill text-sm font-medium transition-colors"
            style={{ background: 'var(--zoom-blue-tint)', color: 'var(--zoom-blue)' }}
          >
            Manage Plan
          </button>
          <button
            className="text-sm font-medium"
            style={{ color: 'var(--zoom-blue)' }}
          >
            View Plan Details
          </button>
        </div>
      </div>
    </div>
  );
}
