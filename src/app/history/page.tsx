import { DashboardPageHeader } from '@/components/dashboard/layout/dashboard-page-header';
import { HistoryTable } from '@/components/history/history-table';
import { auth } from '@clerk/nextjs/server';
import { DashboardLayout } from '@/components/dashboard/layout/dashboard-layout';

export default async function HistoryPage() {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('User not authenticated');
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col w-full max-w-7xl mx-auto px-4 pb-12">
        <DashboardPageHeader pageTitle="Receipt History" />
      <HistoryTable />
      </div>
    </DashboardLayout>
  );
} 