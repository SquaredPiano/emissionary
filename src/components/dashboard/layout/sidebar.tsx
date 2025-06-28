'use client';

import { Home, Upload, History, Settings, Leaf } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { UserButton } from '@clerk/nextjs';
import { ModeToggle } from '@/components/mode-toggle';

const sidebarItems = [
  {
    title: 'Dashboard',
    icon: <Home className="h-6 w-6" />,
    href: '/dashboard' as const,
  },
  {
    title: 'Upload Receipt',
    icon: <Upload className="h-6 w-6" />,
    href: '/upload' as const,
  },
  {
    title: 'Emissions History',
    icon: <History className="h-6 w-6" />,
    href: '/history' as const,
  },
  {
    title: 'Carbon Insights',
    icon: <Leaf className="h-6 w-6" />,
    href: '/insights' as const,
  },
  {
    title: 'Settings',
    icon: <Settings className="h-6 w-6" />,
    href: '/settings' as const,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col grow justify-between items-start px-2 text-sm font-medium lg:px-4">
      <div className={'w-full'}>
        {sidebarItems.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className={cn('flex items-center text-base gap-3 px-4 py-3 rounded-xxs dashboard-sidebar-items', {
              'dashboard-sidebar-items-active':
                item.href === '/dashboard' ? pathname === item.href : pathname.includes(item.href),
            })}
          >
            {item.icon}
            {item.title}
          </Link>
        ))}
      </div>
      <div className={'w-full'}>
          <UserButton/>
          <ModeToggle/>
      </div>
    </nav>
  );
}
