'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Trophy, Star, Flame, Target, TrendingUp, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AchievementData, UserGamificationData } from '@/lib/services/gamification';

interface GamificationDashboardProps {
  initialData?: UserGamificationData;
}

export function GamificationDashboard({ initialData }: GamificationDashboardProps) {
  const [gamificationData, setGamificationData] = useState<UserGamificationData | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [newAchievements, setNewAchievements] = useState<AchievementData[]>([]);
  const [showAchievementModal, setShowAchievementModal] = useState(false);

  useEffect(() => {
    if (!initialData) {
      fetchGamificationData();
    }
  }, [initialData]);

  const fetchGamificationData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/gamification');
      const result = await response.json();
      
      if (result.success) {
        setGamificationData(result.data);
        if (result.data.newAchievements?.length > 0) {
          setNewAchievements(result.data.newAchievements);
          setShowAchievementModal(true);
        }
      }
    } catch (error) {
      console.error('Failed to fetch gamification data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-500';
      case 'rare': return 'bg-blue-500';
      case 'epic': return 'bg-purple-500';
      case 'legendary': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getRarityTextColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-600';
      case 'rare': return 'text-blue-600';
      case 'epic': return 'text-purple-600';
      case 'legendary': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!gamificationData) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Failed to load gamification data</p>
        <Button onClick={fetchGamificationData} className="mt-4">Retry</Button>
      </div>
    );
  }

  const completedAchievements = gamificationData.achievements.filter(a => a.isCompleted);
  const inProgressAchievements = gamificationData.achievements.filter(a => !a.isCompleted);

  return (
    <div className="space-y-6">
      {/* Level and Progress Section */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 border-0 shadow-lg">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Trophy className="h-8 w-8 text-yellow-500" />
            <CardTitle className="text-2xl">Level {gamificationData.level}</CardTitle>
          </div>
          <CardDescription>
            {gamificationData.experienceToNextLevel} XP to next level
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Experience</span>
              <span>{gamificationData.experience} / {gamificationData.nextLevelExperience} XP</span>
            </div>
            <Progress 
              value={gamificationData.progressToNextLevel * 100} 
              className="h-3"
            />
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{gamificationData.totalPoints}</div>
                <div className="text-sm text-muted-foreground">Total Points</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{gamificationData.currentStreak}</div>
                <div className="text-sm text-muted-foreground">Current Streak</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{completedAchievements.length}</div>
                <div className="text-sm text-muted-foreground">Achievements</div>
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
                <div className="text-2xl font-bold text-orange-600">{gamificationData.currentStreak}</div>
                <div className="text-sm text-muted-foreground">days</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div>
                <div className="font-semibold">Longest Streak</div>
                <div className="text-sm text-muted-foreground">Best record</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">{gamificationData.longestStreak}</div>
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
            <span>Recent Achievements</span>
          </CardTitle>
          <CardDescription>
            {completedAchievements.length} of {gamificationData.achievements.length} completed
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
                        {achievement.rarity}
                      </Badge>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No achievements earned yet</p>
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
                    {achievement.progress} / {achievement.requirement.value}
                  </span>
                </div>
                <Progress 
                  value={(achievement.progress / achievement.requirement.value) * 100} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {achievement.requirement.description}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Achievement Unlocked Modal */}
      <AnimatePresence>
        {showAchievementModal && newAchievements.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowAchievementModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-background p-6 rounded-lg shadow-xl max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="text-4xl mb-4">🎉</div>
                <h3 className="text-xl font-bold mb-2">Achievement Unlocked!</h3>
                {newAchievements.map((achievement) => (
                  <div key={achievement.id} className="mb-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 rounded-lg">
                    <div className="text-3xl mb-2">{achievement.icon}</div>
                    <div className="font-semibold">{achievement.name}</div>
                    <div className="text-sm text-muted-foreground">{achievement.description}</div>
                    <Badge 
                      variant="secondary" 
                      className={`mt-2 ${getRarityColor(achievement.rarity)}`}
                    >
                      {achievement.rarity} • +{achievement.points} XP
                    </Badge>
                  </div>
                ))}
                <Button 
                  onClick={() => setShowAchievementModal(false)}
                  className="w-full"
                >
                  Awesome!
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 