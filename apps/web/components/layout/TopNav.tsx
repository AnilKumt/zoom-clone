'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ChevronDown, Video, Monitor, VideoOff } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { formatMeetingId } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { ROUTES } from '@/constants/routes';

// Zoom-style top navigation bar
export function TopNav() {
  const { user, refetch } = useAuth();
  const router = useRouter();
  const [hostMenuOpen, setHostMenuOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);

  const handleNewMeeting = async (_videoMode: 'on' | 'off' | 'screen') => {
    try {
      setHostMenuOpen(false);
      const meeting = await apiClient.post<{ meeting_code: string }>('/meetings/instant');
      router.push(ROUTES.lobby(meeting.meeting_code));
    } catch {
      toast.error('Failed to create meeting');
    }
  };

  const handleSignOut = async () => {
    try {
      await apiClient.post('/auth/logout');
      await refetch();
      router.push(ROUTES.WELCOME);
    } catch {
      toast.error('Sign out failed');
    }
  };

  return (
    <header
      className="sticky top-0 z-40 flex h-14 items-center border-b px-6 bg-white"
      style={{ borderColor: 'var(--border)' }}
    >
      {/* Wordmark */}
      <Link
        href={ROUTES.HOME}
        className="mr-8 text-[34px] font-black tracking-tight leading-none"
        style={{ color: 'var(--zoom-blue)' }}
        aria-label="zoom home"
      >
        zoom
      </Link>

      {/* Nav links */}
      <nav className="hidden md:flex items-center gap-6" aria-label="main navigation">
        {['Products', 'Solutions', 'Resources', 'Plans & Pricing'].map((label) => (
          <button
            key={label}
            className="flex items-center gap-0.5 text-base font-medium hover:text-[var(--zoom-blue)] transition-colors"
            style={{ color: 'var(--text-primary)' }}
          >
            {label}
            {label !== 'Plans & Pricing' && <ChevronDown size={14} className="opacity-60" />}
          </button>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        {/* Schedule */}
        <Link
          href={ROUTES.SCHEDULE}
          className="hidden sm:block text-sm font-medium px-3 py-1.5 rounded-control hover:bg-[var(--zoom-blue-tint)] transition-colors"
          style={{ color: 'var(--text-primary)' }}
        >
          Schedule
        </Link>

        {/* Join */}
        <Link
          href={ROUTES.JOIN}
          className="hidden sm:block text-sm font-medium px-3 py-1.5 rounded-control hover:bg-[var(--zoom-blue-tint)] transition-colors"
          style={{ color: 'var(--text-primary)' }}
        >
          Join
        </Link>

        {/* Host dropdown */}
        <div className="relative">
          <button
            onClick={() => setHostMenuOpen(!hostMenuOpen)}
            className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-control hover:bg-[var(--zoom-blue-tint)] transition-colors"
            style={{ color: 'var(--text-primary)' }}
            aria-expanded={hostMenuOpen}
          >
            Host <ChevronDown size={14} />
          </button>
          {hostMenuOpen && (
            <div
              className="absolute right-0 mt-1 w-48 rounded-control bg-white shadow-lg border py-1 z-50"
              style={{ borderColor: 'var(--border)' }}
            >
              <button
                onClick={() => handleNewMeeting('on')}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-50 text-left"
              >
                <Video size={14} /> With Video On
              </button>
              <button
                onClick={() => handleNewMeeting('off')}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-50 text-left"
              >
                <VideoOff size={14} /> With Video Off
              </button>
              <button
                onClick={() => handleNewMeeting('screen')}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-50 text-left"
              >
                <Monitor size={14} /> Screen Share Only
              </button>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="relative">
          <button
            onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white text-xs font-bold"
            style={{ background: 'var(--zoom-blue)' }}
            aria-label="Account menu"
            aria-expanded={avatarMenuOpen}
          >
            {user?.name?.slice(0, 2).toUpperCase() ?? 'U'}
          </button>
          {avatarMenuOpen && (
            <div
              className="absolute right-0 mt-1 w-56 rounded-control bg-white shadow-lg border py-2 z-50"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  {user?.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {user?.email}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Plan: Workplace Basic
                </p>
                {user?.is_demo && (
                  <span
                    className="inline-block mt-1 text-xs px-2 py-0.5 rounded-pill font-medium"
                    style={{ background: 'var(--zoom-blue-tint)', color: 'var(--zoom-blue)' }}
                  >
                    Demo mode
                  </span>
                )}
              </div>
              <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">
                Profile
              </button>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                style={{ color: 'var(--text-primary)' }}
              >
                {user?.is_demo ? 'Sign in' : 'Sign out'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close menus — covers whole viewport */}
      {(hostMenuOpen || avatarMenuOpen) && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => { setHostMenuOpen(false); setAvatarMenuOpen(false); }}
        />
      )}
    </header>
  );
}
