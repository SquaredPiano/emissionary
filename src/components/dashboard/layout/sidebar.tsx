'use client';

import { Home, Upload, History, Settings, Leaf, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

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
    title: 'Analytics',
    icon: <BarChart3 className="h-5 w-5" />,
    href: '/charts' as const,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col grow justify-between items-start px-2 text-sm font-medium lg:px-4 bg-background min-h-screen">
      <div className={'w-full'}>
        {/* Logo/Brand */}
        <div className="flex items-center gap-2 px-4 py-3 mb-4">
          <Leaf className="h-6 w-6 text-green-600" />
          <span className="font-bold text-lg text-black dark:text-white">Emissionary</span>
        </div>
        {/* Navigation Items */}
        {sidebarItems.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className={cn(
              'flex items-center text-base gap-3 px-4 py-3 rounded-lg transition-colors',
              'text-black dark:text-white',
              pathname === item.href
                ? 'bg-muted font-semibold'
                : 'hover:bg-muted/60',
            )}
            style={{ marginBottom: 4 }}
          >
            {item.icon}
            {item.title}
          </Link>
        ))}
      </div>
    </nav>
  );
}
