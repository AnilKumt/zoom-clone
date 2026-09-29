'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ROUTES } from '@/constants/routes';

export default function ComingSoonPage() {
  const params = useParams();
  const section = typeof params.section === 'string'
    ? params.section.charAt(0).toUpperCase() + params.section.slice(1)
    : 'Feature';

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center p-8 text-center">
      <div
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-2xl shadow-sm"
        style={{ background: 'var(--zoom-blue-tint)', color: 'var(--zoom-blue)' }}
      >
        ✦
      </div>
      <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
        {section} is coming soon
      </h1>
      <p className="mt-2 max-w-md text-sm" style={{ color: 'var(--text-secondary)' }}>
        We are building {section} integration for Zoom Workplace. Check back soon for updates.
      </p>
      <Link
        href={ROUTES.HOME}
        className="btn-primary mt-6 text-sm font-medium"
      >
        Back to Home
      </Link>
    </div>
  );
}
