import Link from 'next/link';
import { ROUTES } from '@/constants/routes';

export const metadata = { title: 'Welcome to zoom' };

export default function WelcomePage() {
  const authMode = process.env.NEXT_PUBLIC_AUTH_MODE ?? 'demo';

  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center px-4"
      style={{ background: 'white' }}
    >
      {/* Logo area */}
      <div className="mb-8 text-center">
        <span
          className="text-4xl font-black tracking-tight"
          style={{ color: 'var(--zoom-blue)' }}
        >
          zoom
        </span>
        <p className="mt-1 text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Workplace
        </p>
      </div>

      {/* Auth buttons */}
      <div className="flex flex-col gap-2 w-[200px]">
        <Link
          href={ROUTES.SIGN_IN}
          className="flex items-center justify-center h-8 rounded-control text-sm font-semibold"
          style={{ background: 'var(--zoom-blue)', color: 'white' }}
        >
          Sign In
        </Link>
        <Link
          href={ROUTES.SIGN_UP}
          className="flex items-center justify-center h-8 rounded-control text-sm font-medium border"
          style={{ borderColor: 'var(--zoom-blue)', color: 'var(--zoom-blue)' }}
        >
          Sign Up
        </Link>
        <Link
          href={ROUTES.JOIN}
          className="flex items-center justify-center h-8 rounded-control text-sm font-medium border"
          style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        >
          Join Meeting
        </Link>
      </div>

      {/* Demo mode shortcut — skip auth in demo deployments */}
      {authMode === 'demo' && (
        <Link
          href={ROUTES.HOME}
          className="mt-6 text-xs"
          style={{ color: 'var(--text-secondary)' }}
        >
          Continue as demo user
        </Link>
      )}

      {/* Footer */}
      <footer
        className="mt-auto pb-6 flex items-center gap-4 text-xs"
        style={{ color: 'var(--text-secondary)' }}
      >
        <span>About Zoom</span>
        <button
          className="flex items-center gap-1 border rounded px-2 py-1"
          style={{ borderColor: 'var(--border)' }}
        >
          English ▾
        </button>
      </footer>
    </div>
  );
}
