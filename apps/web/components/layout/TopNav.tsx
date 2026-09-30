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

// Zoom-style top navigation bar with Material Design 3 surface & feel
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
      className="sticky top-0 z-40 flex h-16 items-center border-b px-6 bg-white/90 backdrop-blur-md transition-all"
      style={{ borderColor: 'var(--border)' }}
    >
      {/* Wordmark */}
      <Link
        href={ROUTES.HOME}
        className="mr-8 text-[32px] font-black tracking-tight leading-none hover:opacity-90 active:scale-95 transition-all"
        style={{ color: 'var(--zoom-blue)' }}
        aria-label="zoom home"
      >
        zoom
      </Link>

      {/* Nav links */}
      <nav className="hidden md:flex items-center gap-1" aria-label="main navigation">
        {['Products', 'Solutions', 'Resources', 'Plans & Pricing'].map((label) => (
          <button
            key={label}
            className="flex items-center gap-1 text-sm font-medium px-3.5 py-2 rounded-full hover:bg-[var(--surface-tonal)] active:scale-95 transition-all duration-200"
            style={{ color: 'var(--text-primary)' }}
          >
            {label}
            {label !== 'Plans & Pricing' && <ChevronDown size={14} className="opacity-60" />}
          </button>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2.5">
        {/* Schedule */}
        <Link
          href={ROUTES.SCHEDULE}
          className="hidden sm:inline-flex items-center text-sm font-semibold px-4 py-2 rounded-full hover:bg-[var(--zoom-blue-tint)] active:scale-95 transition-all duration-200"
          style={{ color: 'var(--text-primary)' }}
        >
          Schedule
        </Link>

        {/* Join */}
        <Link
          href={ROUTES.JOIN}
          className="hidden sm:inline-flex items-center text-sm font-semibold px-4 py-2 rounded-full hover:bg-[var(--zoom-blue-tint)] active:scale-95 transition-all duration-200"
          style={{ color: 'var(--text-primary)' }}
        >
          Join
        </Link>

        {/* Host dropdown */}
        <div className="relative">
          <button
            onClick={() => setHostMenuOpen(!hostMenuOpen)}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-full hover:bg-[var(--zoom-blue-tint)] active:scale-95 transition-all duration-200"
            style={{ color: 'var(--text-primary)' }}
            aria-expanded={hostMenuOpen}
          >
            Host <ChevronDown size={14} className={hostMenuOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>
          {hostMenuOpen && (
            <div
              className="absolute right-0 mt-2 w-52 rounded-2xl bg-white shadow-[var(--shadow-card-hover)] border py-2 z-50 animate-scale-in"
              style={{ borderColor: 'var(--border)' }}
            >
              <button
                onClick={() => handleNewMeeting('on')}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-medium hover:bg-[var(--surface-tonal)] text-left transition-colors"
              >
                <Video size={16} className="text-[var(--zoom-blue)]" /> With Video On
              </button>
              <button
                onClick={() => handleNewMeeting('off')}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-medium hover:bg-[var(--surface-tonal)] text-left transition-colors"
              >
                <VideoOff size={16} className="text-[var(--text-secondary)]" /> With Video Off
              </button>
              <button
                onClick={() => handleNewMeeting('screen')}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-medium hover:bg-[var(--surface-tonal)] text-left transition-colors"
              >
                <Monitor size={16} className="text-[var(--zoom-blue)]" /> Screen Share Only
              </button>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="relative">
          <button
            onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white text-xs font-bold shadow-sm hover:shadow-md hover:ring-2 hover:ring-[var(--zoom-blue)]/40 active:scale-90 transition-all duration-200"
            style={{ background: 'var(--zoom-blue)' }}
            aria-label="Account menu"
            aria-expanded={avatarMenuOpen}
          >
            {user?.name?.slice(0, 2).toUpperCase() ?? 'U'}
          </button>
          {avatarMenuOpen && (
            <div
              className="absolute right-0 mt-2 w-64 rounded-3xl bg-white shadow-[var(--shadow-card-hover)] border p-3 z-50 animate-scale-in"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="p-3 rounded-2xl bg-[var(--surface-tonal)] mb-2">
                <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                  {user?.name}
                </p>
                <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {user?.email}
                </p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/5">
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Workplace Basic
                  </span>
                  {user?.is_demo && (
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: 'var(--zoom-blue)', color: 'white' }}
                    >
                      Demo
                    </span>
                  )}
                </div>
              </div>
              <button className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium hover:bg-[var(--surface-tonal)] transition-colors">
                Profile Settings
              </button>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium hover:bg-red-50 text-red-600 transition-colors"
              >
                {user?.is_demo ? 'Sign In / Switch Account' : 'Sign Out'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close menus */}
      {(hostMenuOpen || avatarMenuOpen) && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => { setHostMenuOpen(false); setAvatarMenuOpen(false); }}
        />
      )}
    </header>
  );
}
