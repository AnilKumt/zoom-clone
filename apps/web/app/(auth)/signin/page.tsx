'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';
import { ROUTES } from '@/constants/routes';

export default function SignInPage() {
  const router = useRouter();
  const { refetch } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiClient.post('/auth/login', { email, password });
      // Refresh auth context so TopNav/Sidebar render correctly
      await refetch();
      router.push(ROUTES.HOME);
    } catch (err) {
      if (apiClient.isApiError(err)) {
        setError(err.message);
      } else {
        setError('Sign in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-dvh items-center justify-center px-4"
      style={{ background: 'var(--page-bg)' }}
    >
      <div className="w-full max-w-sm">
        <Link
          href={ROUTES.HOME}
          className="block text-center text-3xl font-black mb-6"
          style={{ color: 'var(--zoom-blue)' }}
        >
          zoom
        </Link>
        <div className="card p-8">
          <h1 className="text-xl font-bold mb-6">Sign In</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3 border rounded-control text-sm"
                style={{ borderColor: 'var(--border)' }}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 px-3 border rounded-control text-sm"
                style={{ borderColor: 'var(--border)' }}
                required
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-control text-sm font-semibold"
              style={{ background: 'var(--zoom-blue)', color: 'white' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="mt-4 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            Don&apos;t have an account?{' '}
            <Link href={ROUTES.SIGN_UP} style={{ color: 'var(--zoom-blue)' }}>
              Sign Up
            </Link>
          </p>
          <Link
            href={ROUTES.FORGOT_PASSWORD}
            className="block mt-2 text-center text-sm"
            style={{ color: 'var(--zoom-blue)' }}
          >
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  );
}
