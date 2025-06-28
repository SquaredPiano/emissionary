import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import UploadClient from './UploadClient';
import { DashboardLayout } from '@/components/dashboard/layout/dashboard-layout';

export default async function UploadPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  return (
    <DashboardLayout>
      <UploadClient />
    </DashboardLayout>
  );
} 