'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { syncUserData } from '@/lib/actions/users';

export function useUserSync() {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && isSignedIn && clerkUser && !synced) {
      syncUser();
    }
  }, [isLoaded, isSignedIn, clerkUser, synced]);

  const syncUser = async () => {
    try {
      setSyncing(true);
      setError(null);

      const result = await syncUserData();
      
      if (result.success) {
        setSynced(true);
      } else {
        setError(result.error || 'Failed to sync user data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSyncing(false);
    }
  };

  const retrySync = () => {
    setSynced(false);
    setError(null);
    syncUser();
  };

  return {
    syncing,
    synced,
    error,
    retrySync,
  };
} 