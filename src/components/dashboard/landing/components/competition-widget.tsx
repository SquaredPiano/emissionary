'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Star, Flame, Award, TrendingUp, Zap, Crown } from 'lucide-react';
import { motion } from 'framer-motion';
import { UserCompetitionData } from '@/lib/services/competition';

interface CompetitionWidgetProps {
  className?: string;
}

// Add mock data for demo
const mockCompetitionData = {
  level: 5,
  experience: 420,
  nextLevelExperience: 500,
  progressToNextLevel: 0.84,
  totalPoints: 2150,
  currentStreak: 7,
  longestStreak: 21,
  greenChoices: 12,
  achievements: [
    {
      id: '1',
      name: 'First Upload',
      description: 'Upload your first receipt',
      icon: '📄',
      rarity: 'COMMON',
      points: 10,
      requirement: 'FIRST_UPLOAD',
      isCompleted: true,
      progress: 1,
      requirementValue: 1,
      requirementDescription: 'Upload your first receipt',
    },
    {
      id: '2',
      name: 'Upload Streak 3',
      description: 'Upload receipts for 3 consecutive days',
      icon: '🔥',
      rarity: 'COMMON',
      points: 15,
      requirement: 'UPLOAD_STREAK_3',
      isCompleted: true,
      progress: 3,
      requirementValue: 3,
      requirementDescription: 'Upload receipts for 3 consecutive days',
    },
    {
      id: '3',
      name: 'Green Week',
      description: 'Have a week with emissions below 50kg CO₂e',
      icon: '🌱',
      rarity: 'RARE',
      points: 40,
      requirement: 'LOW_EMISSIONS_WEEK',
      isCompleted: false,
      progress: 0,
      requirementValue: 1,
      requirementDescription: 'Have a week with emissions below 50kg CO₂e',
    },
  ],
};

export function CompetitionWidget({ className }: CompetitionWidgetProps) {
  const [competitionData, setCompetitionData] = useState<UserCompetitionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Always use mock data for demo
    setCompetitionData(mockCompetitionData);
    setLoading(false);
  }, []);

  const fetchCompetitionData = async () => {
    // Always use mock data for demo
    setLoading(true);
    setTimeout(() => {
      setCompetitionData(mockCompetitionData);
      setLoading(false);
    }, 500);
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'COMMON': return 'bg-gray-500';
      case 'RARE': return 'bg-blue-500';
      case 'EPIC': return 'bg-purple-500';
      case 'LEGENDARY': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span>Competition</span>
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

  if (!competitionData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span>Competition</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">Failed to load competition data</p>
            <Button onClick={fetchCompetitionData} size="sm">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const completedAchievements = competitionData.achievements.filter(a => a.isCompleted);
  const recentAchievements = completedAchievements.slice(-3);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <span>Competition</span>
        </CardTitle>
        <CardDescription>
          Level {competitionData.level} • {competitionData.totalPoints} points
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Level Progress */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Experience</span>
            <span>{competitionData.experience} / {competitionData.nextLevelExperience} XP</span>
          </div>
          <Progress 
            value={competitionData.progressToNextLevel * 100} 
            className="h-2"
          />
          <p className="text-xs text-muted-foreground text-center">
            {competitionData.nextLevelExperience - competitionData.experience} XP to Level {competitionData.level + 1}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
            <div className="text-lg font-bold text-orange-600">{competitionData.currentStreak}</div>
            <div className="text-xs text-muted-foreground">Streak</div>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <div className="text-lg font-bold text-green-600">{completedAchievements.length}</div>
            <div className="text-xs text-muted-foreground">Badges</div>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <div className="text-lg font-bold text-blue-600">{competitionData.greenChoices}</div>
            <div className="text-xs text-muted-foreground">Green</div>
          </div>
        </div>

        {/* Recent Achievements */}
        {recentAchievements.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center space-x-2">
              <Award className="h-4 w-4 text-yellow-500" />
              <span>Recent Badges</span>
            </h4>
            <div className="space-y-2">
              {recentAchievements.map((achievement) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center space-x-3 p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg"
                >
                  <div className="text-lg">{achievement.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{achievement.name}</div>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${getRarityColor(achievement.rarity)}`}
                    >
                      {achievement.rarity.toLowerCase()}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Call to Action */}
        <div className="text-center pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => window.location.href = '/competition'}
          >
            View Full Competition
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 