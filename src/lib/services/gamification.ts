import { prisma } from '../prisma';
import { logger } from '../logger';

export interface AchievementRequirement {
  type: 'upload_count' | 'streak_days' | 'total_emissions' | 'low_emissions_weeks' | 'green_choices';
  value: number;
  description: string;
}

export interface AchievementData {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: string;
  points: number;
  requirement: AchievementRequirement;
  progress: number;
  isCompleted: boolean;
  earnedAt?: Date;
}

export interface UserGamificationData {
  level: number;
  experience: number;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  achievements: AchievementData[];
  nextLevelExperience: number;
  experienceToNextLevel: number;
  progressToNextLevel: number;
}

export class GamificationService {
  private static readonly EXPERIENCE_PER_LEVEL = 100;
  private static readonly POINTS_PER_UPLOAD = 10;
  private static readonly POINTS_PER_LOW_EMISSIONS_WEEK = 25;
  private static readonly POINTS_PER_GREEN_CHOICE = 5;

  // Predefined achievements
  private static readonly ACHIEVEMENTS = [
    {
      name: 'First Upload',
      description: 'Upload your first receipt',
      icon: '📄',
      category: 'upload',
      rarity: 'common',
      points: 10,
      requirement: { type: 'upload_count', value: 1, description: 'Upload 1 receipt' }
    },
    {
      name: 'Getting Started',
      description: 'Upload 5 receipts',
      icon: '📊',
      category: 'upload',
      rarity: 'common',
      points: 20,
      requirement: { type: 'upload_count', value: 5, description: 'Upload 5 receipts' }
    },
    {
      name: 'Receipt Collector',
      description: 'Upload 25 receipts',
      icon: '📁',
      category: 'upload',
      rarity: 'rare',
      points: 50,
      requirement: { type: 'upload_count', value: 25, description: 'Upload 25 receipts' }
    },
    {
      name: 'Receipt Master',
      description: 'Upload 100 receipts',
      icon: '👑',
      category: 'upload',
      rarity: 'epic',
      points: 100,
      requirement: { type: 'upload_count', value: 100, description: 'Upload 100 receipts' }
    },
    {
      name: 'Week Warrior',
      description: 'Maintain a 7-day upload streak',
      icon: '🔥',
      category: 'streak',
      rarity: 'rare',
      points: 30,
      requirement: { type: 'streak_days', value: 7, description: '7-day upload streak' }
    },
    {
      name: 'Month Master',
      description: 'Maintain a 30-day upload streak',
      icon: '⚡',
      category: 'streak',
      rarity: 'epic',
      points: 75,
      requirement: { type: 'streak_days', value: 30, description: '30-day upload streak' }
    },
    {
      name: 'Green Week',
      description: 'Have a week with emissions below 50kg CO₂e',
      icon: '🌱',
      category: 'emissions',
      rarity: 'rare',
      points: 40,
      requirement: { type: 'low_emissions_weeks', value: 1, description: '1 week below 50kg CO₂e' }
    },
    {
      name: 'Eco Champion',
      description: 'Have 5 weeks with emissions below 50kg CO₂e',
      icon: '🌍',
      category: 'emissions',
      rarity: 'epic',
      points: 80,
      requirement: { type: 'low_emissions_weeks', value: 5, description: '5 weeks below 50kg CO₂e' }
    },
    {
      name: 'Carbon Conscious',
      description: 'Track 1000kg CO₂e total emissions',
      icon: '📈',
      category: 'milestone',
      rarity: 'rare',
      points: 60,
      requirement: { type: 'total_emissions', value: 1000, description: 'Track 1000kg CO₂e' }
    },
    {
      name: 'Green Pioneer',
      description: 'Make 50 green choices',
      icon: '🌿',
      category: 'social',
      rarity: 'legendary',
      points: 150,
      requirement: { type: 'green_choices', value: 50, description: '50 green choices' }
    }
  ];

  /**
   * Initialize achievements in the database
   */
  static async initializeAchievements() {
    try {
      for (const achievement of this.ACHIEVEMENTS) {
        await prisma.achievement.upsert({
          where: { name: achievement.name },
          update: {},
          create: {
            name: achievement.name,
            description: achievement.description,
            icon: achievement.icon,
            category: achievement.category,
            rarity: achievement.rarity,
            points: achievement.points,
            requirement: JSON.stringify(achievement.requirement),
            requirementValue: achievement.requirement.value
          }
        });
      }
      logger.info('Achievements initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize achievements', error);
    }
  }

  /**
   * Get user's gamification data
   */
  static async getUserGamificationData(userId: string): Promise<UserGamificationData> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          userAchievements: {
            include: {
              achievement: true
            }
          },
          userStreaks: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const achievements = user.userAchievements.map(ua => ({
        id: ua.achievement.id,
        name: ua.achievement.name,
        description: ua.achievement.description,
        icon: ua.achievement.icon,
        category: ua.achievement.category,
        rarity: ua.achievement.rarity,
        points: ua.achievement.points,
        requirement: JSON.parse(ua.achievement.requirement) as AchievementRequirement,
        progress: ua.progress,
        isCompleted: ua.isCompleted,
        earnedAt: ua.isCompleted ? ua.earnedAt : undefined
      }));

      const nextLevelExperience = (user.level + 1) * this.EXPERIENCE_PER_LEVEL;
      const experienceToNextLevel = nextLevelExperience - user.experience;
      const progressToNextLevel = (user.experience % this.EXPERIENCE_PER_LEVEL) / this.EXPERIENCE_PER_LEVEL;

      return {
        level: user.level,
        experience: user.experience,
        totalPoints: user.totalPoints,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        achievements,
        nextLevelExperience,
        experienceToNextLevel,
        progressToNextLevel
      };
    } catch (error) {
      logger.error('Failed to get user gamification data', error);
      throw error;
    }
  }

  /**
   * Process achievements for a user
   */
  static async processAchievements(userId: string): Promise<AchievementData[]> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          receipts: true,
          userAchievements: {
            include: {
              achievement: true
            }
          },
          userStreaks: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const newAchievements: AchievementData[] = [];
      const allAchievements = await prisma.achievement.findMany();

      for (const achievement of allAchievements) {
        const userAchievement = user.userAchievements.find(ua => ua.achievementId === achievement.id);
        const requirement = JSON.parse(achievement.requirement) as AchievementRequirement;

        // Skip if already completed
        if (userAchievement?.isCompleted) {
          continue;
        }

        const progress = await this.calculateProgress(user, requirement);
        const isCompleted = progress >= requirement.value;

        if (isCompleted && !userAchievement?.isCompleted) {
          // Award achievement
          await this.awardAchievement(userId, achievement.id, progress);
          
          newAchievements.push({
            id: achievement.id,
            name: achievement.name,
            description: achievement.description,
            icon: achievement.icon,
            category: achievement.category,
            rarity: achievement.rarity,
            points: achievement.points,
            requirement,
            progress,
            isCompleted: true,
            earnedAt: new Date()
          });

          // Add experience and points
          await this.addExperience(userId, achievement.points);
        } else if (userAchievement && userAchievement.progress !== progress) {
          // Update progress
          await prisma.userAchievement.update({
            where: { id: userAchievement.id },
            data: { progress }
          });
        }
      }

      return newAchievements;
    } catch (error) {
      logger.error('Failed to process achievements', error);
      throw error;
    }
  }

  /**
   * Calculate progress for a specific achievement requirement
   */
  private static async calculateProgress(user: any, requirement: AchievementRequirement): Promise<number> {
    switch (requirement.type) {
      case 'upload_count':
        return user.receipts.length;

      case 'streak_days':
        const uploadStreak = user.userStreaks.find((s: any) => s.type === 'upload');
        return uploadStreak?.currentStreak || 0;

      case 'total_emissions':
        return user.receipts.reduce((sum: number, receipt: any) => 
          sum + Number(receipt.totalCarbonEmissions), 0);

      case 'low_emissions_weeks':
        return await this.calculateLowEmissionsWeeks(user.id);

      case 'green_choices':
        // Mock implementation - could be based on user actions
        return Math.floor(Math.random() * 20); // Random for demo

      default:
        return 0;
    }
  }

  /**
   * Calculate weeks with low emissions
   */
  private static async calculateLowEmissionsWeeks(userId: string): Promise<number> {
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const weeklyEmissions = await prisma.receipt.groupBy({
      by: ['date'],
      where: {
        userId,
        date: { gte: fourWeeksAgo }
      },
      _sum: {
        totalCarbonEmissions: true
      }
    });

    let lowEmissionsWeeks = 0;
    const weeklyData = new Map<string, number>();

    // Group by week
    weeklyEmissions.forEach(week => {
      const weekStart = new Date(week.date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      const current = weeklyData.get(weekKey) || 0;
      weeklyData.set(weekKey, current + Number(week._sum.totalCarbonEmissions || 0));
    });

    // Count weeks below 50kg
    weeklyData.forEach(emissions => {
      if (emissions < 50) {
        lowEmissionsWeeks++;
      }
    });

    return lowEmissionsWeeks;
  }

  /**
   * Award an achievement to a user
   */
  private static async awardAchievement(userId: string, achievementId: string, progress: number) {
    await prisma.userAchievement.upsert({
      where: {
        userId_achievementId: {
          userId,
          achievementId
        }
      },
      update: {
        progress,
        isCompleted: true,
        earnedAt: new Date()
      },
      create: {
        userId,
        achievementId,
        progress,
        isCompleted: true,
        earnedAt: new Date()
      }
    });
  }

  /**
   * Add experience and points to user
   */
  private static async addExperience(userId: string, points: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) return;

    const newExperience = user.experience + points;
    const newLevel = Math.floor(newExperience / this.EXPERIENCE_PER_LEVEL) + 1;
    const newTotalPoints = user.totalPoints + points;

    await prisma.user.update({
      where: { id: userId },
      data: {
        experience: newExperience,
        level: newLevel,
        totalPoints: newTotalPoints
      }
    });
  }

  /**
   * Update user streak
   */
  static async updateStreak(userId: string, type: string = 'upload') {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const userStreak = await prisma.userStreak.findUnique({
        where: {
          userId_type: {
            userId,
            type
          }
        }
      });

      if (!userStreak) {
        // Create new streak
        await prisma.userStreak.create({
          data: {
            userId,
            type,
            currentStreak: 1,
            longestStreak: 1,
            lastActivityDate: today
          }
        });
      } else {
        const lastActivity = userStreak.lastActivityDate;
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        let newStreak = userStreak.currentStreak;
        if (lastActivity && lastActivity >= yesterday) {
          // Consecutive day
          newStreak++;
        } else {
          // Reset streak
          newStreak = 1;
        }

        await prisma.userStreak.update({
          where: { id: userStreak.id },
          data: {
            currentStreak: newStreak,
            longestStreak: Math.max(newStreak, userStreak.longestStreak),
            lastActivityDate: today
          }
        });
      }

      // Update main user streak
      await prisma.user.update({
        where: { id: userId },
        data: {
          currentStreak: 1, // This will be updated based on the specific streak type
          lastActivityDate: today
        }
      });
    } catch (error) {
      logger.error('Failed to update streak', error);
    }
  }

  /**
   * Get leaderboard data
   */
  static async getLeaderboard(limit: number = 10) {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
          level: true,
          totalPoints: true,
          currentStreak: true,
          _count: {
            select: {
              receipts: true
            }
          }
        },
        orderBy: [
          { totalPoints: 'desc' },
          { level: 'desc' },
          { currentStreak: 'desc' }
        ],
        take: limit
      });

      return users.map(user => ({
        id: user.id,
        name: `${user.firstName || 'User'} ${user.lastName || ''}`.trim() || 'Anonymous',
        avatar: user.avatar,
        level: user.level,
        totalPoints: user.totalPoints,
        currentStreak: user.currentStreak,
        totalReceipts: user._count.receipts
      }));
    } catch (error) {
      logger.error('Failed to get leaderboard', error);
      throw error;
    }
  }
} 