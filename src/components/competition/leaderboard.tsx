'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Medal, Crown, Star, TrendingUp, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LeaderboardEntry } from '@/lib/services/competition';

interface LeaderboardProps {
  limit?: number;
  leaderboard?: LeaderboardEntry[];
}

// Add mock leaderboard data for demo
const mockLeaderboardData = [
  {
    id: '1',
    name: 'Alice Johnson',
    level: 7,
    totalPoints: 3200,
    totalReceipts: 45,
    currentStreak: 12,
    avatar: '🦸‍♀️',
    isCurrentUser: false,
  },
  {
    id: '2',
    name: 'Bob Smith',
    level: 6,
    totalPoints: 2950,
    totalReceipts: 38,
    currentStreak: 7,
    avatar: '🧑‍🚀',
    isCurrentUser: true,
  },
  {
    id: '3',
    name: 'Charlie Brown',
    level: 5,
    totalPoints: 2150,
    totalReceipts: 32,
    currentStreak: 5,
    avatar: '🦸‍♂️',
    isCurrentUser: false,
  },
  {
    id: '4',
    name: 'Diana Prince',
    level: 4,
    totalPoints: 1800,
    totalReceipts: 28,
    currentStreak: 3,
    avatar: '🧙‍♀️',
    isCurrentUser: false,
  },
  {
    id: '5',
    name: 'Eve Wilson',
    level: 3,
    totalPoints: 1200,
    totalReceipts: 22,
    currentStreak: 2,
    avatar: '🧝‍♀️',
    isCurrentUser: false,
  },
  {
    id: '6',
    name: 'Frank Miller',
    level: 3,
    totalPoints: 950,
    totalReceipts: 18,
    currentStreak: 1,
    avatar: '🧙‍♂️',
    isCurrentUser: false,
  },
  {
    id: '7',
    name: 'Grace Lee',
    level: 2,
    totalPoints: 750,
    totalReceipts: 15,
    currentStreak: 0,
    avatar: '🧚‍♀️',
    isCurrentUser: false,
  },
];

export function Leaderboard({ limit = 10, leaderboard }: LeaderboardProps) {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Use provided leaderboard or mock data
    const dataToUse = leaderboard || mockLeaderboardData;
    setLeaderboardData(dataToUse.slice(0, limit));
    setLoading(false);
  }, [limit, leaderboard]);

  const fetchLeaderboard = async () => {
    // Always use mock data for demo
    setLoading(true);
    setTimeout(() => {
      const dataToUse = leaderboard || mockLeaderboardData;
      setLeaderboardData(dataToUse.slice(0, limit));
      setLoading(false);
    }, 500);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <Star className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <Badge className="bg-yellow-500 text-white">🥇 1st</Badge>;
      case 2:
        return <Badge className="bg-gray-400 text-white">🥈 2nd</Badge>;
      case 3:
        return <Badge className="bg-amber-600 text-white">🥉 3rd</Badge>;
      default:
        return <Badge variant="secondary">#{rank}</Badge>;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span>Leaderboard</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span>Leaderboard</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchLeaderboard} size="sm">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <span>Leaderboard</span>
        </CardTitle>
        <CardDescription>
          Top {limit} users by points and achievements
        </CardDescription>
      </CardHeader>
      <CardContent>
        {leaderboardData.length > 0 ? (
          <div className="space-y-3">
            {leaderboardData.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                  index === 0 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-yellow-200' :
                  index === 1 ? 'bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/20 border-gray-200' :
                  index === 2 ? 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200' :
                  'bg-background hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {getRankIcon(index + 1)}
                    <span className="font-bold text-lg">{index + 1}</span>
                  </div>
                  
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="text-sm font-medium">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <div className="font-semibold">{user.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Level {user.level} • {user.totalReceipts} receipts
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="font-bold text-lg">{user.totalPoints}</div>
                    <div className="text-xs text-muted-foreground">points</div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-semibold text-sm">{user.currentStreak}</div>
                    <div className="text-xs text-muted-foreground">streak</div>
                  </div>
                  
                  {getRankBadge(index + 1)}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No users found</p>
            <p className="text-sm text-muted-foreground">Be the first to join the leaderboard!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 