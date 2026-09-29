import { ProfileCard } from '@/features/dashboard/components/ProfileCard';
import { QuickActions } from '@/features/dashboard/components/QuickActions';
import { UpcomingMeetingsCard } from '@/features/dashboard/components/UpcomingMeetingsCard';
import { RecentMeetingsCard } from '@/features/dashboard/components/RecentMeetingsCard';
import { ChatFab } from '@/components/layout/ChatFab';

export const metadata = { title: 'Home — zoom' };

export default function HomePage() {
  return (
    <div className="p-6">
      {/* Two-column grid: main left, narrow right */}
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 xl:grid-cols-[1fr_410px] gap-6">
        {/* Left column */}
        <div className="space-y-6">
          <ProfileCard />
          <RecentMeetingsCard />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <QuickActions />
          <UpcomingMeetingsCard />
        </div>
      </div>
      <ChatFab />
    </div>
  );
}
