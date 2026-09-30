'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { ROUTES } from '@/constants/routes';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'request' | 'verify' | 'reset'>('request');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post('/auth/password/forgot', { email });
      setStep('verify');
      toast.success('Reset instructions sent if email exists');
    } finally {
      // Always show success to avoid email enumeration
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await apiClient.post<{ reset_token: string }>('/auth/password/verify-otp', {
        email,
        otp,
      });
      setResetToken(result.reset_token);
      setStep('reset');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post('/auth/password/reset', {
        reset_token: resetToken,
        new_password: newPassword,
      });
      toast.success('Password reset successfully');
      setStep('request');
      setOtp('');
      setNewPassword('');
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
          <h1 className="text-xl font-bold mb-6">Forgot Password</h1>
          {step === 'request' && (
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
          {step === 'verify' && (
            <form onSubmit={handleVerify} className="space-y-4">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Enter the six-digit code sent to {email}.
              </p>
              <input
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                className="w-full h-10 px-3 border rounded-control text-sm"
                style={{ borderColor: 'var(--border)' }}
                required
              />
              <button type="submit" disabled={loading} className="btn-primary w-full h-10 text-sm">
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
            </form>
          )}
          {step === 'reset' && (
            <form onSubmit={handleReset} className="space-y-4">
              <label className="block text-sm font-medium">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                className="w-full h-10 px-3 border rounded-control text-sm"
                style={{ borderColor: 'var(--border)' }}
                required
              />
              <button type="submit" disabled={loading} className="btn-primary w-full h-10 text-sm">
                {loading ? 'Saving...' : 'Set New Password'}
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
