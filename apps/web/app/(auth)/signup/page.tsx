'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { ROUTES } from '@/constants/routes';

type Step = 'email' | 'otp' | 'done';

export default function SignUpPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiClient.post('/auth/register/request-otp', { email, name });
      toast.success('OTP sent to your email');
      setStep('otp');
    } catch (err) {
      setError(apiClient.isApiError(err) ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiClient.post('/auth/register/verify', { email, name, otp, password });
      toast.success('Account created!');
      router.push(ROUTES.HOME);
    } catch (err) {
      setError(apiClient.isApiError(err) ? err.message : 'Verification failed');
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
          <h1 className="text-xl font-bold mb-6">Create Account</h1>

          {step === 'email' ? (
            <form onSubmit={requestOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 px-3 border rounded-control text-sm"
                  style={{ borderColor: 'var(--border)' }}
                  required
                  autoComplete="name"
                />
              </div>
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
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-control text-sm font-semibold"
                style={{ background: 'var(--zoom-blue)', color: 'white' }}
              >
                {loading ? 'Sending OTP...' : 'Continue'}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="space-y-4">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Enter the 6-digit code sent to {email}
              </p>
              <div>
                <label className="block text-sm font-medium mb-1">OTP Code</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full h-10 px-3 border rounded-control text-sm font-mono tracking-widest"
                  style={{ borderColor: 'var(--border)' }}
                  maxLength={6}
                  required
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
                  minLength={8}
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-control text-sm font-semibold"
                style={{ background: 'var(--zoom-blue)', color: 'white' }}
              >
                {loading ? 'Verifying...' : 'Create Account'}
              </button>
            </form>
          )}

          <p className="mt-4 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link href={ROUTES.SIGN_IN} style={{ color: 'var(--zoom-blue)' }}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
