'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useUserSync } from '@/hooks/useUserSync';

interface UserSyncContextType {
  syncing: boolean;
  synced: boolean;
  error: string | null;
  retrySync: () => void;
}

const UserSyncContext = createContext<UserSyncContextType | undefined>(undefined);

export function UserSyncProvider({ children }: { children: ReactNode }) {
  const userSync = useUserSync();

  return (
    <UserSyncContext.Provider value={userSync}>
      {children}
    </UserSyncContext.Provider>
  );
}

export function useUserSyncContext() {
  const context = useContext(UserSyncContext);
  if (context === undefined) {
    throw new Error('useUserSyncContext must be used within a UserSyncProvider');
  }
  return context;
} 