'use client';

import { useUserInfo } from '@/hooks/useUserInfo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, User, Database, CheckCircle, AlertCircle } from 'lucide-react';

export function UserSyncTest() {
  const { user, clerkUser, loading, error, isSignedIn, refetch } = useUserInfo();

  if (!isSignedIn) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Authentication Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Please sign in to view user information.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          User Database Sync Status
        </CardTitle>
        <CardDescription>
          Verification that user data is properly synced between Clerk and our database
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Clerk User Info */}
        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <User className="h-4 w-4" />
            Clerk User Data
          </h4>
          <div className="text-sm space-y-1">
            <p><strong>ID:</strong> {clerkUser?.id}</p>
            <p><strong>Email:</strong> {clerkUser?.primaryEmailAddress?.emailAddress}</p>
            <p><strong>Name:</strong> {clerkUser?.firstName} {clerkUser?.lastName}</p>
          </div>
        </div>

        {/* Database User Info */}
        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <Database className="h-4 w-4" />
            Database User Data
          </h4>
          {loading ? (
            <div className="flex items-center gap-2 text-sm">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading user data...
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              Error: {error}
            </div>
          ) : user ? (
            <div className="space-y-2">
              <div className="text-sm space-y-1">
                <p><strong>Database ID:</strong> {user.id}</p>
                <p><strong>Clerk ID:</strong> {user.clerkId}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Name:</strong> {user.firstName} {user.lastName}</p>
                <p><strong>Created:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
              </div>
              <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                <CheckCircle className="h-3 w-3" />
                Synced Successfully
              </Badge>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No user data found in database
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            onClick={refetch} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 