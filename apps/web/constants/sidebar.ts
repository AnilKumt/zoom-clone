export interface SidebarItem {
  label: string;
  href: string;
  isExternal?: boolean;
  badge?: string;
  isActive?: (pathname: string) => boolean;
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { label: 'Home', href: '/home', isActive: (p) => p === '/home' },
  { label: 'Meetings', href: '/meetings', isActive: (p) => p.startsWith('/meetings') },
  { label: 'Recordings', href: '/recordings' },
  { label: 'Summaries', href: '/summaries' },
  { label: 'Hub', href: '/hub', badge: 'New', isExternal: true },
  { label: 'Whiteboards', href: '/whiteboards', isExternal: true },
  { label: 'Notes', href: '/notes' },
  { label: 'Clips', href: '/clips', isExternal: true },
  { label: 'Canvas', href: '/canvas', isExternal: true },
  { label: 'Paper', href: '/paper', isExternal: true },
  { label: 'Sheets', href: '/sheets', isExternal: true },
  { label: 'Slides', href: '/slides', isExternal: true },
  { label: 'Tasks', href: '/tasks', isExternal: true },
  { label: 'Scheduler', href: '/scheduler', isExternal: true },
];
