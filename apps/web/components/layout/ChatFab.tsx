'use client';

import { MessageCircle, X, HelpCircle, ExternalLink } from 'lucide-react';
import { useState } from 'react';

// Floating action button for help/chat with Material Design 3 styling
export function ChatFab() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div
          className="absolute bottom-16 right-0 w-80 rounded-3xl bg-white shadow-2xl border border-slate-100 p-5 animate-scale-in"
          role="dialog"
          aria-label="Help"
        >
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <HelpCircle size={18} className="text-[var(--zoom-blue)]" />
              <h3 className="font-bold text-sm text-[var(--text-primary)]">Zoom Clone Assistant</h3>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-full hover:bg-[var(--surface-tonal)] text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Close help"
            >
              <X size={16} />
            </button>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Welcome to the Zoom Web Conferencing Platform clone! You can create instant meetings, schedule upcoming calls, join with 10-digit IDs, and test live WebRTC video and host controls.
          </p>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="flex h-14 w-14 items-center justify-center rounded-full shadow-lg hover:shadow-2xl hover:scale-105 active:scale-90 transition-all duration-200"
        style={{ background: 'var(--zoom-blue)' }}
        aria-label="Open help"
      >
        <MessageCircle size={26} className="text-white" />
      </button>
    </div>
  );
}
