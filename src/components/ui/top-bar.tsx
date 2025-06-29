"use client";
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { UserButton } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';

export function TopBar() {
  const pathname = usePathname();
  const isLanding = pathname === '/';
  const isSignIn = pathname.startsWith('/sign-in');
  return (
    <div className="w-full flex justify-end items-center gap-4 px-6 py-4 bg-transparent z-50">
      {!(isLanding || isSignIn) && <ThemeToggle />}
      <UserButton afterSignOutUrl="/" />
    </div>
  );
} 