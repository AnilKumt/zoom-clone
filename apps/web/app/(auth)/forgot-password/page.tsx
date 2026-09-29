'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { ROUTES } from '@/constants/routes';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post('/auth/password/forgot', { email });
      setSent(true);
      toast.success('Reset instructions sent if email exists');
    } finally {
      // Always show success to avoid email enumeration
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
          <h1 className="text-xl font-bold mb-6">Forgot Password</h1>
          {sent ? (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              If {email} has an account, reset instructions have been sent.
            </p>
          ) : (
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
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-control text-sm font-semibold"
                style={{ background: 'var(--zoom-blue)', color: 'white' }}
              >
                {loading ? 'Sending...' : 'Reset Password'}
              </button>
            </form>
          )}
          <Link
            href={ROUTES.SIGN_IN}
            className="block mt-4 text-center text-sm"
            style={{ color: 'var(--zoom-blue)' }}
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
