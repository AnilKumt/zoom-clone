'use client';

import { useState, useId } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { isValidMeetingInput, parseMeetingCode } from '@/lib/meeting-code';
import { ChatFab } from '@/components/layout/ChatFab';
import { ROUTES } from '@/constants/routes';

export default function JoinPage() {
  const router = useRouter();
  const inputId = useId();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shaking, setShaking] = useState(false);

  const isValid = isValidMeetingInput(value);

  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 200);
  };

  const handleJoin = async () => {
    if (!isValid || loading) return;
    setError(null);
    setLoading(true);

    try {
      const parsed = parseMeetingCode(value);
      if (!parsed) {
        setError('Invalid meeting ID. Check and try again.');
        triggerShake();
        return;
      }

      const code = parsed.type === 'numeric' ? parsed.code : parsed.name;

      // Validate meeting exists before navigating to lobby
      const info = await apiClient.get<{ exists: boolean; status: string }>(
        `/meetings/${code}/public`
      );
      if (!info.exists || info.status === 'ended' || info.status === 'cancelled') {
        setError('Invalid meeting ID. Check and try again.');
        triggerShake();
        return;
      }

      router.push(ROUTES.lobby(code));
    } catch {
      setError('Invalid meeting ID. Check and try again.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col" style={{ background: 'white' }}>
      {/* Slim nav */}
      <header
        className="flex h-14 items-center justify-between px-6 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <Link href={ROUTES.HOME} className="text-2xl font-black" style={{ color: 'var(--zoom-blue)' }}>
          zoom
        </Link>
        <div className="flex items-center gap-4">
          <Link href="#" className="text-sm" style={{ color: 'var(--text-primary)' }}>Support</Link>
          <Link href={ROUTES.SCHEDULE} className="text-sm" style={{ color: 'var(--text-primary)' }}>Schedule</Link>
          <Link href={ROUTES.JOIN} className="text-sm font-medium" style={{ color: 'var(--zoom-blue)' }}>Join</Link>
          <Link href={ROUTES.HOME} className="text-sm" style={{ color: 'var(--text-primary)' }}>Host</Link>
        </div>
      </header>

      {/* Centered form */}
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-[450px]">
          <h1 className="text-[32px] font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
            Join Meeting
          </h1>

          <div className="space-y-4">
            <div>
              <label
                htmlFor={inputId}
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-primary)' }}
              >
                Meeting ID or Personal Link Name
              </label>
              <input
                id={inputId}
                type="text"
                value={value}
                onChange={(e) => { setValue(e.target.value); setError(null); }}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                placeholder="Enter Meeting ID or Personal Link Name"
                className={[
                  'w-full h-12 px-4 rounded-control border text-base outline-none transition-all',
                  shaking ? 'animate-shake' : '',
                  error
                    ? 'border-red-500'
                    : isValid
                    ? 'border-[var(--zoom-blue)]'
                    : 'border-[var(--border)]',
                ].join(' ')}
                style={{
                  boxShadow: isValid ? '0 0 0 1px var(--zoom-blue)' : undefined,
                }}
                aria-describedby={error ? 'join-error' : undefined}
                aria-invalid={!!error}
                autoComplete="off"
              />
              {error && (
                <p id="join-error" className="mt-1.5 text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
            </div>

            <button
              onClick={handleJoin}
              disabled={!isValid || loading}
              className="w-full h-12 rounded-control text-base font-semibold transition-colors"
              style={{
                background: isValid ? 'var(--zoom-blue)' : '#EEEEF2',
                color: isValid ? 'white' : '#8D8D8D',
                cursor: isValid && !loading ? 'pointer' : 'not-allowed',
              }}
            >
              {loading ? 'Checking...' : 'Join'}
            </button>
          </div>

          <div className="mt-24">
            <button className="text-sm" style={{ color: 'var(--zoom-blue)' }}>
              Join a meeting from an H.323/SIP room system
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="py-4 px-6 flex items-center justify-between text-xs"
        style={{ color: 'var(--text-secondary)' }}
      >
        <span>
          &copy; 2026 Zoom Communications, Inc. All rights reserved. Privacy &amp; Legal Policies
        </span>
        <button className="border rounded px-2 py-1" style={{ borderColor: 'var(--border)' }}>
          English ▾
        </button>
      </footer>

      <ChatFab />
    </div>
  );
}
