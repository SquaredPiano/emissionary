"use client";
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { UserButton } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

export function TopBar() {
  const pathname = usePathname();
  const isLanding = pathname === '/';
  const isSignIn = pathname.startsWith('/sign-in');

  // Sticky mini-bar logic
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isStuck, setIsStuck] = useState(false);
  useEffect(() => {
    const observer = new window.IntersectionObserver(
      ([entry]) => setIsStuck(!entry.isIntersecting),
      { root: null, threshold: 0, rootMargin: '0px' }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Sentinel for sticky mini-bar detection */}
      <div ref={sentinelRef} style={{ height: 1 }} />
      <div className="w-full flex justify-end items-center gap-4 px-6 py-4 bg-transparent z-50">
        {!(isLanding || isSignIn) && <ThemeToggle />}
        <UserButton afterSignOutUrl="/" />
      </div>
      {/* Sticky mini-bar at top right (not on /charts) */}
      {!(pathname.startsWith('/charts')) && (
        <AnimatePresence>
          {isStuck && (
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
              className="fixed top-4 right-4 z-[100] bg-white/90 dark:bg-zinc-900/90 border border-muted shadow-lg rounded-2xl px-4 py-2 flex items-center gap-3 backdrop-blur-lg"
            >
              <ThemeToggle />
              <UserButton afterSignOutUrl="/" />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </>
  );
} 