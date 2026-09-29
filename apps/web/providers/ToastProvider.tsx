'use client';

import { Toaster } from 'sonner';

/** Renders the Sonner toast container at the app root */
export function ToastProvider() {
  return (
    <Toaster
      position="bottom-left"
      toastOptions={{
        duration: 3000,
        style: { fontFamily: 'var(--font-lato)' },
      }}
    />
  );
}
