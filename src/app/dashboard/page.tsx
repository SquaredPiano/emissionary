import { Suspense } from 'react';
import { DashboardLandingPage } from '@/components/dashboard/landing/dashboard-landing-page';
import { LoadingScreen } from '@/components/dashboard/layout/loading-screen';
import { getCurrentUser, getUserStats } from '@/lib/actions/users';
import { getReceipts } from '@/lib/actions/receipts';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  // Fetch data in parallel
  const [userResult, statsResult, receiptsResult] = await Promise.allSettled([
    getCurrentUser(),
    getUserStats(),
    getReceipts({ pagination: { page: 1, limit: 5, sortOrder: "desc" } })
  ]);

  // Extract data safely
  const user = userResult.status === 'fulfilled' ? userResult.value : null;
  const stats = statsResult.status === 'fulfilled' ? statsResult.value : null;
  const receipts = receiptsResult.status === 'fulfilled' ? receiptsResult.value : null;

  return (
    <Suspense fallback={<LoadingScreen />}>
      <DashboardLandingPage />
    </Suspense>
  );
}
