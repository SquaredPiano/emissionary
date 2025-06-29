import { DashboardUsageCardGroup } from '@/components/dashboard/landing/components/dashboard-usage-card-group';
import { EmissionsChart } from '@/components/dashboard/landing/components/emissions-chart';
import { CategoryBreakdown } from '@/components/dashboard/landing/components/category-breakdown';
import { RecentActivity } from '@/components/dashboard/landing/components/recent-activity';
import { ActionableTips } from '@/components/dashboard/landing/components/actionable-tips';

interface DashboardLandingPageProps {
  user?: any;
  stats?: any;
  receipts?: any;
  emissions?: any;
  highlightedReceiptId?: string;
}

export function DashboardLandingPage({
  user,
  stats,
  receipts,
  emissions,
  highlightedReceiptId,
}: DashboardLandingPageProps) {
  return (
    <div className="flex flex-col gap-10 w-full max-w-7xl mx-auto px-4 pb-12">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardUsageCardGroup 
          user={user}
          stats={stats}
          emissions={emissions}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <EmissionsChart emissions={emissions} />
        <CategoryBreakdown emissions={emissions} />
      </div>

      {/* Activity and Tips Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RecentActivity 
          receipts={receipts}
          highlightedReceiptId={highlightedReceiptId}
        />
        <ActionableTips emissions={emissions} />
      </div>
    </div>
  );
}
