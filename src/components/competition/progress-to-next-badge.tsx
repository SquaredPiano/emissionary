'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { BadgeData } from '@/lib/services/competition';

interface ProgressToNextBadgeProps {
  achievements: BadgeData[];
  currentLevel: number;
  experience: number;
  nextLevelExperience: number;
}

export function ProgressToNextBadge({ 
  achievements, 
  currentLevel, 
  experience, 
  nextLevelExperience 
}: ProgressToNextBadgeProps) {
  const inProgressAchievements = achievements.filter(a => !a.isCompleted);
  const nextAchievement = inProgressAchievements[0]; // Get the first incomplete achievement

  const levelProgress = (experience % 100) / 100; // Assuming 100 XP per level
  const achievementProgress = nextAchievement 
    ? (nextAchievement.progress / nextAchievement.requirementValue) 
    : 1;

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'COMMON': return 'bg-gray-500';
      case 'RARE': return 'bg-blue-500';
      case 'EPIC': return 'bg-purple-500';
      case 'LEGENDARY': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 0.8) return 'bg-green-500';
    if (progress >= 0.5) return 'bg-yellow-500';
    if (progress >= 0.2) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getMotivationalMessage = (progress: number) => {
    if (progress >= 0.9) return "Almost there! You're so close! 🎯";
    if (progress >= 0.7) return "Great progress! Keep it up! 💪";
    if (progress >= 0.5) return "Halfway there! You're doing great! 🌟";
    if (progress >= 0.3) return "Making good progress! 🚀";
    if (progress >= 0.1) return "Getting started! Every step counts! 👣";
    return "Ready to begin your journey! 🌱";
  };

  return (
    <div className="space-y-4">
      {/* Level Progress */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-0">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            <span>Level Progress</span>
          </CardTitle>
          <CardDescription>
            Level {currentLevel} • {experience} / {nextLevelExperience} XP
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Experience</span>
              <span>{Math.round(levelProgress * 100)}%</span>
            </div>
            <Progress 
              value={levelProgress * 100} 
              className="h-3"
            />
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {nextLevelExperience - experience} XP to Level {currentLevel + 1}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Achievement Progress */}
      {nextAchievement && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Target className="h-5 w-5 text-green-500" />
              <span>Next Achievement</span>
            </CardTitle>
            <CardDescription>
              {getMotivationalMessage(achievementProgress)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                <div className="text-2xl">{nextAchievement.icon}</div>
                <div className="flex-1">
                  <div className="font-semibold">{nextAchievement.name}</div>
                  <div className="text-sm text-muted-foreground">{nextAchievement.description}</div>
                  <Badge 
                    variant="secondary" 
                    className={`mt-1 text-xs ${getRarityColor(nextAchievement.rarity)}`}
                  >
                    {nextAchievement.rarity.toLowerCase()} • +{nextAchievement.points} XP
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{nextAchievement.progress} / {nextAchievement.requirementValue}</span>
                </div>
                <div className="relative">
                  <Progress 
                    value={achievementProgress * 100} 
                    className={`h-3 ${getProgressColor(achievementProgress)}`}
                  />
                  <motion.div
                    className="absolute inset-0 bg-white/20 rounded-full"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: achievementProgress }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {nextAchievement.requirementDescription}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Achievement Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Award className="h-5 w-5 text-yellow-500" />
            <span>Achievement Stats</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {achievements.filter(a => a.isCompleted).length}
              </div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {inProgressAchievements.length}
              </div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Completion Rate</span>
              <span className="font-semibold">
                {Math.round((achievements.filter(a => a.isCompleted).length / achievements.length) * 100)}%
              </span>
            </div>
            <Progress 
              value={(achievements.filter(a => a.isCompleted).length / achievements.length) * 100} 
              className="h-2 mt-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-2xl mb-2">💡</div>
            <h4 className="font-semibold mb-2">Quick Tips</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• Upload receipts daily to maintain your streak</p>
              <p>• Choose low-emission foods to earn green badges</p>
              <p>• Complete weekly challenges for bonus XP</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 