'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export function useUserSync() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      syncUserToDatabase();
    }
  }, [isLoaded, isSignedIn, user]);

  const syncUserToDatabase = async () => {
    if (!user) return;

    setIsSyncing(true);
    setSyncError(null);

    try {
      const response = await fetch('/api/users/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerkId: user.id,
          email: user.primaryEmailAddress?.emailAddress,
          firstName: user.firstName,
          lastName: user.lastName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to sync user to database');
      }

      const result = await response.json();
      console.log('User synced successfully:', result);
    } catch (error) {
      console.error('Error syncing user:', error);
      setSyncError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    isSyncing,
    syncError,
    syncUserToDatabase,
  };
} 