import { ReactNode } from 'react';
import { DashboardLayout } from '@/components/dashboard/layout/dashboard-layout';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

interface Props {
  children: ReactNode;
}

export default async function Layout({ children }: Props) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
