import { DashboardPageHeader } from '@/components/dashboard/layout/dashboard-page-header';
import { DashboardLandingPage } from '@/components/dashboard/landing/dashboard-landing-page';
import { auth } from '@clerk/nextjs/server';
import { createUserIfNotExists } from '@/lib/auth';

export default async function DashboardPage() {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('User not authenticated');
  }

  // Ensure user exists in database (this will be handled by webhooks in production)
  try {
    await createUserIfNotExists(userId, 'user@example.com'); // Email will be updated by webhook
  } catch (error) {
    console.error('Error ensuring user exists:', error);
    // Continue anyway - webhook will handle user creation
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-8">
      <DashboardPageHeader pageTitle={'Dashboard'} />
      <DashboardLandingPage />
    </main>
  );
}
