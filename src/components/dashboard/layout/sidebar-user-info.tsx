'use client';

import { Separator } from '@/components/ui/separator';
import { useClerk } from '@clerk/nextjs';
import { MouseEvent } from 'react';
import { useUserInfo } from '@/hooks/useUserInfo';

export function SidebarUserInfo() {
  const { signOut } = useClerk();
  const { user, clerkUser } = useUserInfo();

  const displayName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : clerkUser?.fullName || user?.firstName || 'User';

  return (
    <div className={'flex flex-col items-start pb-8 px-2 text-sm font-medium lg:px-4'}>
      <Separator className={'relative mt-6 dashboard-sidebar-highlight bg-[#283031]'} />
      <div className={'flex w-full flex-row mt-6 items-center justify-between'}>
        <div className={'flex flex-col items-start justify-center overflow-hidden text-ellipsis'}>
          <div className={'text-sm leading-5 font-semibold w-full overflow-hidden text-ellipsis text-black dark:text-white'}>
            {displayName}
          </div>
          <div className={'text-sm leading-5 text-gray-600 dark:text-gray-300 w-full overflow-hidden text-ellipsis'}>
            {user?.email || clerkUser?.primaryEmailAddress?.emailAddress}
          </div>
        </div>
      </div>
    </div>
  );
}
