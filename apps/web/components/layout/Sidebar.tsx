'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { SIDEBAR_ITEMS } from '@/constants/sidebar';
import { cn } from '@/lib/utils';

// Left sidebar navigation with Material Design 3 Navigation Drawer styling
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden md:flex flex-col w-[260px] shrink-0 border-r bg-white/70 backdrop-blur-sm overflow-y-auto"
      style={{ borderColor: 'var(--border)' }}
      aria-label="Side navigation"
    >
      <div className="px-5 pt-6 pb-2">
        <p
          className="text-xs font-bold uppercase tracking-wider px-3 py-1"
          style={{ color: 'var(--text-tertiary)' }}
        >
          My Products
        </p>
      </div>

      <nav className="flex flex-col gap-1 px-3 pb-6">
        {SIDEBAR_ITEMS.map((item) => {
          const isActive = item.isActive ? item.isActive(pathname) : false;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center justify-between rounded-full px-4 py-2.5 text-sm transition-all duration-200',
                isActive
                  ? 'font-bold shadow-xs'
                  : 'text-[var(--text-primary)] hover:bg-[var(--surface-tonal)] font-medium active:scale-[0.98]'
              )}
              style={{
                background: isActive ? 'var(--zoom-blue-tint)' : undefined,
                color: isActive ? 'var(--zoom-blue)' : undefined,
              }}
              aria-current={isActive ? 'page' : undefined}
            >
              <span>{item.label}</span>
              <span className="flex items-center gap-1.5">
                {item.badge && (
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-full font-bold shadow-xs"
                    style={{ background: 'var(--zoom-blue)', color: 'white' }}
                  >
                    {item.badge}
                  </span>
                )}
                {item.isExternal && (
                  <ExternalLink size={13} style={{ color: 'var(--text-tertiary)' }} />
                )}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
