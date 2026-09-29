'use client';

import { MessageCircle, X } from 'lucide-react';
import { useState } from 'react';

// Floating action button for help/chat — decorative per spec
export function ChatFab() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div
          className="absolute bottom-16 right-0 w-72 rounded-card bg-white shadow-lg border p-4"
          style={{ borderColor: 'var(--border)' }}
          role="dialog"
          aria-label="Help"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Need help?</h3>
            <button onClick={() => setOpen(false)} aria-label="Close help">
              <X size={14} />
            </button>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            This is a Zoom clone demo. For the real Zoom, visit zoom.us.
          </p>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105"
        style={{ background: 'var(--zoom-blue)' }}
        aria-label="Open help"
      >
        <MessageCircle size={24} className="text-white" />
      </button>
    </div>
  );
}
