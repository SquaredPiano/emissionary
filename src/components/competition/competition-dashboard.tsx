'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Trophy, Star, Flame, Target, TrendingUp, Award, Zap, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BadgeData, UserCompetitionData } from '@/lib/services/competition';

interface CompetitionDashboardProps {
  initialData?: UserCompetitionData;
}

export function CompetitionDashboard({ initialData }: CompetitionDashboardProps) {
  const [competitionData, setCompetitionData] = useState<UserCompetitionData | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [newAchievements, setNewAchievements] = useState<BadgeData[]>([]);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [levelUp, setLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState<number | null>(null);

  // Add mock data for demo
  const mockCompetitionData = {
    level: 5,
    experience: 420,
    nextLevelExperience: 500,
    progressToNextLevel: 0.84,
    totalPoints: 2150,
    currentStreak: 7,
    longestStreak: 21,
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
      {
        id: '4',
        name: 'Milestone Master',
        description: 'Reach 1000kg CO₂e total emissions',
        icon: '🏆',
        rarity: 'EPIC',
        points: 100,
        requirement: 'TOTAL_EMISSIONS_1000',
        isCompleted: false,
        progress: 800,
        requirementValue: 1000,
        requirementDescription: 'Track 1000kg CO₂e total emissions',
      },
    ],
    longestStreak: 21,
  };

  useEffect(() => {
    if (!initialData) {
      setCompetitionData(mockCompetitionData);
      setLoading(false);
    }
  }, [initialData]);

  const fetchCompetitionData = () => {
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

  const getRarityTextColor = (rarity: string) => {
    switch (rarity) {
      case 'COMMON': return 'text-gray-600';
      case 'RARE': return 'text-blue-600';
      case 'EPIC': return 'text-purple-600';
      case 'LEGENDARY': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getRarityIcon = (rarity: string) => {
    switch (rarity) {
      case 'COMMON': return <Star className="h-4 w-4" />;
      case 'RARE': return <Zap className="h-4 w-4" />;
      case 'EPIC': return <Award className="h-4 w-4" />;
      case 'LEGENDARY': return <Crown className="h-4 w-4" />;
      default: return <Star className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!competitionData) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Failed to load competition data</p>
        <Button onClick={fetchCompetitionData} className="mt-4">Retry</Button>
      </div>
    );
  }

  const completedAchievements = competitionData.achievements.filter(a => a.isCompleted);
  const inProgressAchievements = competitionData.achievements.filter(a => !a.isCompleted);

  return (
    <div className="space-y-6">
      {/* Level and Progress Section */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 border-0 shadow-lg">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Trophy className="h-8 w-8 text-yellow-500" />
            <CardTitle className="text-2xl">Level {competitionData.level}</CardTitle>
          </div>
          <CardDescription>
            {competitionData.nextLevelExperience - competitionData.experience} XP to next level
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Experience</span>
              <span>{competitionData.experience} / {competitionData.nextLevelExperience} XP</span>
            </div>
            <Progress 
              value={competitionData.progressToNextLevel * 100} 
              className="h-3"
            />
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{competitionData.totalPoints}</div>
                <div className="text-sm text-muted-foreground">Total Points</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{competitionData.currentStreak}</div>
                <div className="text-sm text-muted-foreground">Current Streak</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{completedAchievements.length}</div>
                <div className="text-sm text-muted-foreground">Badges</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Streaks Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <span>Your Streaks</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
              <div>
                <div className="font-semibold">Upload Streak</div>
                <div className="text-sm text-muted-foreground">Consecutive days</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-orange-600">{competitionData.currentStreak}</div>
                <div className="text-sm text-muted-foreground">days</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div>
                <div className="font-semibold">Longest Streak</div>
                <div className="text-sm text-muted-foreground">Best record</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">{competitionData.longestStreak}</div>
                <div className="text-sm text-muted-foreground">days</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Award className="h-5 w-5 text-yellow-500" />
            <span>Recent Badges</span>
          </CardTitle>
          <CardDescription>
            {completedAchievements.length} of {competitionData.achievements.length} completed
          </CardDescription>
        </CardHeader>
        <CardContent>
          {completedAchievements.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedAchievements.slice(-6).map((achievement) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 border rounded-lg bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20"
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{achievement.icon}</div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{achievement.name}</div>
                      <div className="text-xs text-muted-foreground">{achievement.description}</div>
                      <Badge 
                        variant="secondary" 
                        className={`mt-1 text-xs ${getRarityColor(achievement.rarity)}`}
                      >
                        {achievement.rarity.toLowerCase()}
                      </Badge>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No badges earned yet</p>
              <p className="text-sm text-muted-foreground">Start uploading receipts to earn your first badge!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress to Next Achievement */}
      {inProgressAchievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-500" />
              <span>Next Achievement</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {inProgressAchievements.slice(0, 3).map((achievement) => (
              <div key={achievement.id} className="mb-4 last:mb-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{achievement.icon}</span>
                    <span className="font-medium">{achievement.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {achievement.progress} / {achievement.requirementValue}
                  </span>
                </div>
                <Progress 
                  value={(achievement.progress / achievement.requirementValue) * 100} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {achievement.requirementDescription}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Achievement Unlocked Modal */}
      <AnimatePresence>
        {showAchievementModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAchievementModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-background rounded-lg p-6 max-w-md w-full text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-xl font-bold mb-2">Badge Unlocked!</h3>
              <p className="text-muted-foreground mb-4">
                You've earned a new achievement!
              </p>
              {newAchievements.map((achievement) => (
                <div key={achievement.id} className="p-4 border rounded-lg mb-4">
                  <div className="text-3xl mb-2">{achievement.icon}</div>
                  <div className="font-semibold">{achievement.name}</div>
                  <div className="text-sm text-muted-foreground">{achievement.description}</div>
                  <Badge 
                    variant="secondary" 
                    className={`mt-2 ${getRarityColor(achievement.rarity)}`}
                  >
                    {achievement.rarity.toLowerCase()} • +{achievement.points} XP
                  </Badge>
                </div>
              ))}
              <Button onClick={() => setShowAchievementModal(false)}>
                Continue
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level Up Modal */}
      <AnimatePresence>
        {levelUp && newLevel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setLevelUp(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-background rounded-lg p-6 max-w-md w-full text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-6xl mb-4">⭐</div>
              <h3 className="text-xl font-bold mb-2">Level Up!</h3>
              <p className="text-muted-foreground mb-4">
                Congratulations! You've reached Level {newLevel}!
              </p>
              <div className="text-2xl font-bold text-yellow-500 mb-4">
                +50 XP Bonus!
              </div>
              <Button onClick={() => setLevelUp(false)}>
                Continue
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 