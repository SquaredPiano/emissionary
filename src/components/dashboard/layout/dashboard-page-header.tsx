'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MobileSidebar } from '@/components/dashboard/layout/mobile-sidebar';

interface DashboardPageHeaderProps {
  pageTitle: string;
  showBackButton?: boolean;
}

export function DashboardPageHeader({ pageTitle, showBackButton = false }: DashboardPageHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  // Show back button if not on dashboard and showBackButton is true or we're on upload/history/settings
  const shouldShowBack = showBackButton || (pathname !== '/dashboard' && (pathname.includes('/upload') || pathname.includes('/history') || pathname.includes('/settings')));

  const handleBack = () => {
    router.push('/dashboard');
  };

  return (
    <div>
      {/* Green highlight at the very top */}
      <Separator className="relative bg-border mb-6 dashboard-header-highlight" />
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white">{pageTitle}</h1>
            <p className="text-black dark:text-muted-foreground">
              {pathname === '/dashboard' && 'Track your carbon footprint and emissions'}
              {pathname.includes('/upload') && 'Upload and process your grocery receipts'}
              {pathname.includes('/history') && 'View your receipt history and emissions data'}
              {pathname.includes('/settings') && 'Manage your emission goals, notifications, and privacy'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <MobileSidebar />
        </div>
      </div>
    </div>
  );
}
