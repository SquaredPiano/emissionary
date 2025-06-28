'use client';

import { Home, Upload, History, Settings, Leaf } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { UserButton } from '@clerk/nextjs';

const sidebarItems = [
  {
    title: 'Dashboard',
    icon: <Home className="h-5 w-5" />,
    href: '/dashboard' as const,
  },
  {
    title: 'Upload Receipt',
    icon: <Upload className="h-5 w-5" />,
    href: '/upload' as const,
  },
  {
    title: 'History',
    icon: <History className="h-5 w-5" />,
    href: '/history' as const,
  },
  {
    title: 'Settings',
    icon: <Settings className="h-5 w-5" />,
    href: '/settings' as const,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col grow justify-between items-start px-2 text-sm font-medium lg:px-4">
      <div className={'w-full'}>
        {/* Logo/Brand */}
        <div className="flex items-center gap-2 px-4 py-3 mb-4">
          <Leaf className="h-6 w-6 text-green-600" />
          <span className="font-bold text-lg">Emissionary</span>
        </div>
        
        {/* Navigation Items */}
        {sidebarItems.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className={cn('flex items-center text-base gap-3 px-4 py-3 rounded-xxs dashboard-sidebar-items transition-colors', {
              'dashboard-sidebar-items-active bg-primary/10 text-primary':
                item.href === '/dashboard' ? pathname === item.href : pathname.includes(item.href),
            })}
          >
            {item.icon}
            {item.title}
          </Link>
        ))}
      </div>
      
      {/* User Profile */}
      <div className={'w-full'}>
        <UserButton />
      </div>
    </nav>
  );
}
