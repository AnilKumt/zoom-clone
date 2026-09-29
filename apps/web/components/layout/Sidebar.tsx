'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { SIDEBAR_ITEMS } from '@/constants/sidebar';
import { cn } from '@/lib/utils';

// Left sidebar navigation — 260px wide, matches Zoom portal
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden md:flex flex-col w-[260px] shrink-0 border-r bg-white overflow-y-auto"
      style={{ borderColor: 'var(--border)' }}
      aria-label="Side navigation"
    >
      <div className="px-4 pt-5 pb-2">
        <p
          className="text-xs font-medium uppercase tracking-wider px-3 py-1"
          style={{ color: 'var(--text-secondary)' }}
        >
          My Products
        </p>
      </div>

      <nav className="flex flex-col gap-0.5 px-3">
        {SIDEBAR_ITEMS.map((item) => {
          const isActive = item.isActive ? item.isActive(pathname) : false;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center justify-between rounded-lg px-3 py-2.5 text-base transition-colors duration-150',
                isActive
                  ? 'font-medium'
                  : 'hover:bg-gray-50'
              )}
              style={{
                background: isActive ? 'var(--zoom-blue-tint)' : undefined,
                color: isActive ? 'var(--zoom-blue)' : 'var(--text-primary)',
              }}
              aria-current={isActive ? 'page' : undefined}
            >
              <span>{item.label}</span>
              <span className="flex items-center gap-1">
                {item.badge && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-pill font-medium"
                    style={{ background: 'var(--zoom-blue)', color: 'white' }}
                  >
                    {item.badge}
                  </span>
                )}
                {item.isExternal && (
                  <ExternalLink size={12} style={{ color: 'var(--text-secondary)' }} />
                )}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
