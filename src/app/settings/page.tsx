import { DashboardPageHeader } from '@/components/dashboard/layout/dashboard-page-header';
import { SettingsForm } from '@/components/settings/settings-form';
import { auth } from '@clerk/nextjs/server';

export default async function SettingsPage() {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('User not authenticated');
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-8">
      <DashboardPageHeader pageTitle="Settings" showBackButton={true} />
      <SettingsForm />
    </main>
  );
} 