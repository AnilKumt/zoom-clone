import Link from 'next/link';
import { ROUTES } from '@/constants/routes';
import { Video, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';

export const metadata = { title: 'Welcome to zoom' };

export default function WelcomePage() {
  const authMode = process.env.NEXT_PUBLIC_AUTH_MODE ?? 'demo';

  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'var(--page-bg)' }}
    >
      {/* Background ambient decorative glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-[var(--zoom-blue)]/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-[var(--zoom-orange)]/5 blur-3xl pointer-events-none" />

      {/* Main card */}
      <div className="card p-10 max-w-[420px] w-full text-center shadow-[var(--shadow-card-hover)] border border-slate-100 relative z-10">
        {/* Logo area */}
        <div className="mb-8 text-center">
          <span
            className="text-4xl font-black tracking-tight"
            style={{ color: 'var(--zoom-blue)' }}
          >
            zoom
          </span>
          <p className="mt-1 text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Workplace
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-2 font-medium">
            Next-generation video communication platform
          </p>
        </div>

        {/* Auth buttons */}
        <div className="flex flex-col gap-3 w-full">
          <Link
            href={ROUTES.SIGN_IN}
            className="flex items-center justify-center h-12 rounded-full text-sm font-bold shadow-sm hover:shadow-md active:scale-95 transition-all"
            style={{ background: 'var(--zoom-blue)', color: 'white' }}
          >
            Sign In
          </Link>
          <Link
            href={ROUTES.SIGN_UP}
            className="flex items-center justify-center h-12 rounded-full text-sm font-bold border border-[var(--surface-border)] hover:border-[var(--zoom-blue)] hover:bg-[var(--zoom-blue-tint)] active:scale-95 transition-all"
            style={{ color: 'var(--zoom-blue)' }}
          >
            Sign Up Free
          </Link>
          <Link
            href={ROUTES.JOIN}
            className="flex items-center justify-center h-12 rounded-full text-sm font-semibold hover:bg-[var(--surface-tonal)] active:scale-95 transition-all"
            style={{ color: 'var(--text-primary)' }}
          >
            Join a Meeting
          </Link>
        </div>

        {/* Demo mode shortcut */}
        {authMode === 'demo' && (
          <div className="mt-8 pt-6 border-t border-slate-100">
            <Link
              href={ROUTES.HOME}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-[var(--zoom-blue-tint)] text-[var(--zoom-blue)] hover:bg-blue-100 active:scale-95 transition-all"
            >
              <Sparkles size={13} /> Continue as Demo User <ArrowRight size={13} />
            </Link>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer
        className="mt-8 flex items-center gap-4 text-xs font-medium"
        style={{ color: 'var(--text-tertiary)' }}
      >
        <span>&copy; 2026 Zoom Video Communications Clone</span>
        <span>&middot;</span>
        <button
          className="flex items-center gap-1 border border-slate-200 rounded-full px-3 py-1 bg-white hover:bg-slate-50 transition-colors"
        >
          English ▾
        </button>
      </footer>
    </div>
  );
}
