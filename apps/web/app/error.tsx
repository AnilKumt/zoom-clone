'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html>
      <body className="flex min-h-dvh items-center justify-center bg-[var(--page-bg)]">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Something went wrong</h1>
          <p className="text-[var(--text-secondary)]">{error.message}</p>
          <button onClick={reset} className="btn-primary">
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
