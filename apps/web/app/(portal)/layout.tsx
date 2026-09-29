import { TopNav } from '@/components/layout/TopNav';
import { Sidebar } from '@/components/layout/Sidebar';

/**
 * Portal layout wraps all authenticated portal pages with TopNav + Sidebar.
 * The main content area has the Zoom portal background.
 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-dvh" style={{ background: 'var(--page-bg)' }}>
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main
          id="main-content"
          className="flex-1 overflow-y-auto"
          style={{ background: 'var(--page-bg)' }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
