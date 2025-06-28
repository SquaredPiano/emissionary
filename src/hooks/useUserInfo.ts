'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';

interface DatabaseUser {
  id: string;
  clerkId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  bio: string | null;
  location: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useUserInfo() {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const [databaseUser, setDatabaseUser] = useState<DatabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && isSignedIn && clerkUser) {
      fetchUserFromDatabase();
    } else if (isLoaded && !isSignedIn) {
      setLoading(false);
      setDatabaseUser(null);
    }
  }, [isLoaded, isSignedIn, clerkUser]);

  const fetchUserFromDatabase = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/users/sync');
      
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const data = await response.json();
      
      if (data.success) {
        setDatabaseUser(data.user);
      } else {
        throw new Error(data.error || 'Failed to fetch user data');
      }
    } catch (err) {
      console.error('Error fetching user:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfile = async (updates: Partial<DatabaseUser>) => {
    try {
      setError(null);

      const response = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const data = await response.json();
      
      if (data.success) {
        setDatabaseUser(data.user);
        return data.user;
      } else {
        throw new Error(data.error || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  return {
    user: databaseUser,
    clerkUser,
    loading,
    error,
    isSignedIn,
    isLoaded,
    refetch: fetchUserFromDatabase,
    updateProfile: updateUserProfile,
  };
}
