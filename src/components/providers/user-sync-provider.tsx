'use client';

import { ReactNode, useEffect } from 'react';
import { useUserSync } from '@/hooks/useUserSync';

interface UserSyncProviderProps {
  children: ReactNode;
}

export function UserSyncProvider({ children }: UserSyncProviderProps) {
  const { isSyncing, syncError } = useUserSync();

  useEffect(() => {
    if (syncError) {
      console.error('User sync error:', syncError);
      // You could show a toast notification here
    }
  }, [syncError]);

  // Optionally show a loading state while syncing
  if (isSyncing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Setting up your account...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
} 