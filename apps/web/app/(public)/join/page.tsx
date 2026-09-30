'use client';

import { useState, useId } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { isValidMeetingInput, parseMeetingCode } from '@/lib/meeting-code';
import { ChatFab } from '@/components/layout/ChatFab';
import { ROUTES } from '@/constants/routes';
import { Video, ArrowRight, ShieldCheck } from 'lucide-react';

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
    setTimeout(() => setShaking(false), 250);
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

      const info = await apiClient.get<{ exists: boolean; status: string }>(
        `/meetings/${code}/public`
      );
      if (!info.exists || info.status === 'ended' || info.status === 'cancelled') {
        setError('Meeting not found or already ended.');
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
    <div className="flex min-h-dvh flex-col" style={{ background: 'var(--page-bg)' }}>
      {/* Top navigation */}
      <header
        className="flex h-16 items-center justify-between px-6 bg-white/90 backdrop-blur-md border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <Link href={ROUTES.HOME} className="text-2xl font-black tracking-tight" style={{ color: 'var(--zoom-blue)' }}>
          zoom
        </Link>
        <div className="flex items-center gap-2">
          <Link href={ROUTES.SCHEDULE} className="text-xs font-bold px-4 py-2 rounded-full hover:bg-[var(--surface-tonal)] transition-colors" style={{ color: 'var(--text-primary)' }}>
            Schedule
          </Link>
          <Link href={ROUTES.JOIN} className="text-xs font-bold px-4 py-2 rounded-full bg-[var(--zoom-blue-tint)]" style={{ color: 'var(--zoom-blue)' }}>
            Join
          </Link>
          <Link href={ROUTES.HOME} className="text-xs font-bold px-4 py-2 rounded-full hover:bg-[var(--surface-tonal)] transition-colors" style={{ color: 'var(--text-primary)' }}>
            Host
          </Link>
        </div>
      </header>

      {/* Centered join card */}
      <main className="flex flex-1 items-center justify-center px-4 py-12 relative">
        <div className="card p-8 md:p-10 w-full max-w-[460px] shadow-[var(--shadow-card-hover)] border border-slate-100">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Join Meeting
            </h1>
            <p className="text-xs font-medium text-[var(--text-secondary)] mt-1">
              Enter your Meeting ID or Personal Link to connect
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <label
                htmlFor={inputId}
                className="block text-xs font-bold uppercase tracking-wider mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                Meeting ID or Personal Link Name
              </label>
              <input
                id={inputId}
                type="text"
                value={value}
                onChange={(e) => { setValue(e.target.value); setError(null); }}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                placeholder="e.g. 833 834 7512"
                className={[
                  'w-full h-12 px-4 rounded-xl border text-base font-medium outline-none transition-all duration-200 bg-white',
                  shaking ? 'animate-shake' : '',
                  error
                    ? 'border-red-500 ring-2 ring-red-100'
                    : isValid
                    ? 'border-[var(--zoom-blue)] ring-2 ring-blue-100'
                    : 'border-slate-200 focus:border-[var(--zoom-blue)] focus:ring-2 focus:ring-blue-100',
                ].join(' ')}
                aria-describedby={error ? 'join-error' : undefined}
                aria-invalid={!!error}
                autoComplete="off"
              />
              {error && (
                <p id="join-error" className="mt-2 text-xs font-bold text-red-600" role="alert">
                  {error}
                </p>
              )}
            </div>

            <button
              onClick={handleJoin}
              disabled={!isValid || loading}
              className="w-full h-12 rounded-full text-sm font-bold shadow-sm hover:shadow-md active:scale-95 transition-all duration-200"
              style={{
                background: isValid ? 'var(--zoom-blue)' : '#E8EAED',
                color: isValid ? 'white' : '#8D929A',
                cursor: isValid && !loading ? 'pointer' : 'not-allowed',
              }}
            >
              {loading ? 'Validating Meeting...' : 'Join Meeting'}
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <button className="text-xs font-semibold text-[var(--zoom-blue)] hover:underline">
              Join from an H.323/SIP room system
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="py-4 px-6 flex items-center justify-between text-xs font-medium border-t border-slate-100 bg-white"
        style={{ color: 'var(--text-tertiary)' }}
      >
        <span>
          &copy; 2026 Zoom Video Communications Clone
        </span>
        <button className="border border-slate-200 rounded-full px-3 py-1 bg-white hover:bg-slate-50 transition-colors">
          English ▾
        </button>
      </footer>

      <ChatFab />
    </div>
  );
}
