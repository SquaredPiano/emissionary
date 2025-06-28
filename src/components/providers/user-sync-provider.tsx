"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { ensureUserExists } from "@/lib/actions/users";
import { logger } from "@/lib/logger";

interface UserSyncProviderProps {
  children: React.ReactNode;
}

export function UserSyncProvider({ children }: UserSyncProviderProps) {
  const { isSignedIn, userId } = useAuth();
  const [isSynced, setIsSynced] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const syncUser = async () => {
      if (!isSignedIn || !userId || isSynced) {
        return;
      }

      setIsLoading(true);
      
      try {
        const result = await ensureUserExists();
        
        if (result.success) {
          logger.info("User sync completed", { 
            userId, 
            action: result.action 
          });
          setIsSynced(true);
        } else {
          logger.error("User sync failed", { 
            userId, 
            error: result.error 
          });
        }
      } catch (error) {
        logger.error("User sync error", error instanceof Error ? error : new Error(String(error)), { userId });
      } finally {
        setIsLoading(false);
      }
    };

    syncUser();
  }, [isSignedIn, userId, isSynced]);

  // Don't render children until user is synced or if there's no user
  if (isSignedIn && !isSynced && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Setting up your account...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
} 