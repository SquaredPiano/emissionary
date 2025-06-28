import { DashboardUsageCardGroup } from '@/components/dashboard/landing/components/dashboard-usage-card-group';
import { EmissionsChart } from '@/components/dashboard/landing/components/emissions-chart';
import { CategoryBreakdown } from '@/components/dashboard/landing/components/category-breakdown';
import { RecentActivity } from '@/components/dashboard/landing/components/recent-activity';
import { ActionableTips } from '@/components/dashboard/landing/components/actionable-tips';

export function DashboardLandingPage() {
  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardUsageCardGroup />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <EmissionsChart />
        <CategoryBreakdown />
      </div>

      {/* Activity and Tips Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentActivity />
        <ActionableTips />
      </div>
    </div>
  );
}
