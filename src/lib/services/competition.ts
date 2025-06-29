import { db } from '@/lib/services/database';
import { auth } from '@clerk/nextjs/server';

export interface BadgeData {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  points: number;
  requirement: string;
  isCompleted: boolean;
  progress: number;
  requirementValue: number;
  requirementDescription: string;
}

export interface UserCompetitionData {
  level: number;
  experience: number;
  nextLevelExperience: number;
  progressToNextLevel: number;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  totalReceipts: number;
  totalEmissions: number;
  greenChoices: number;
  weeklyGreenWeeks: number;
  achievements: BadgeData[];
  newAchievements: BadgeData[];
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatar?: string;
  level: number;
  totalPoints: number;
  currentStreak: number;
  totalReceipts: number;
  totalEmissions: number;
}

export class CompetitionService {
  private static readonly XP_PER_LEVEL = 100;
  private static readonly LOW_EMISSION_THRESHOLD = 50; // kg CO2e per week

  static async getUserCompetitionData(userId: string): Promise<UserCompetitionData> {
    const user = await db.user.findUnique({
      where: { clerkId: userId },
      include: {
        userAchievements: {
          include: {
            badge: true
          }
        },
        receipts: {
          orderBy: { date: 'desc' }
        }
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Calculate level and experience
    const level = user.level;
    const experience = user.experience;
    const nextLevelExperience = level * this.XP_PER_LEVEL;
    const progressToNextLevel = experience / nextLevelExperience;

    // Get all badges with user progress
    const allBadges = await this.getAllBadges();
    const userAchievements = user.userAchievements;
    
    const achievements = allBadges.map(badge => {
      const userAchievement = userAchievements.find(ua => ua.badgeId === badge.id);
      const { progress, requirementValue, requirementDescription } = this.calculateBadgeProgress(badge, user);
      
      return {
        id: badge.id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        rarity: badge.rarity,
        points: badge.points,
        requirement: badge.requirement,
        isCompleted: userAchievement?.isCompleted || false,
        progress,
        requirementValue,
        requirementDescription
      };
    });

    // Check for new achievements
    const newAchievements = achievements.filter(a => 
      a.isCompleted && !userAchievements.find(ua => ua.badgeId === a.id && ua.isCompleted)
    );

    return {
      level,
      experience,
      nextLevelExperience,
      progressToNextLevel,
      totalPoints: user.totalPoints,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      totalReceipts: user.totalReceipts,
      totalEmissions: Number(user.totalEmissions),
      greenChoices: user.greenChoices,
      weeklyGreenWeeks: user.weeklyGreenWeeks,
      achievements,
      newAchievements
    };
  }

  static async processReceiptUpload(userId: string, receiptData: any): Promise<{
    newAchievements: BadgeData[];
    levelUp: boolean;
    newLevel?: number;
    experienceGained: number;
  }> {
    const user = await db.user.findUnique({
      where: { clerkId: userId },
      include: {
        userAchievements: {
          include: {
            badge: true
          }
        },
        receipts: {
          orderBy: { date: 'desc' }
        }
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    let experienceGained = 0;
    const newAchievements: BadgeData[] = [];
    let levelUp = false;
    let newLevel = user.level;

    // Update user stats
    const updates: any = {
      totalReceipts: user.totalReceipts + 1,
      totalEmissions: user.totalEmissions + receiptData.totalCarbonEmissions,
      lastUploadDate: new Date()
    };

    // Check for green choice (low emission receipt)
    if (receiptData.totalCarbonEmissions < 5) { // Less than 5kg CO2e
      updates.greenChoices = user.greenChoices + 1;
      experienceGained += 5; // Bonus XP for green choice
    }

    // Update streak
    const today = new Date();
    const lastUpload = user.lastUploadDate;
    
    if (lastUpload) {
      const daysDiff = Math.floor((today.getTime() - lastUpload.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 1) {
        // Consecutive day
        updates.currentStreak = user.currentStreak + 1;
        if (updates.currentStreak > user.longestStreak) {
          updates.longestStreak = updates.currentStreak;
        }
      } else if (daysDiff > 1) {
        // Streak broken
        updates.currentStreak = 1;
      }
    } else {
      // First upload
      updates.currentStreak = 1;
    }

    // Check weekly emissions
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weeklyReceipts = user.receipts.filter(r => 
      r.date >= weekStart && r.date <= weekEnd
    );

    const weeklyEmissions = weeklyReceipts.reduce((sum, r) => sum + Number(r.totalCarbonEmissions), 0) + Number(receiptData.totalCarbonEmissions);

    if (weeklyEmissions < this.LOW_EMISSION_THRESHOLD) {
      updates.weeklyGreenWeeks = user.weeklyGreenWeeks + 1;
      experienceGained += 10; // Bonus XP for green week
    }

    // Base XP for upload
    experienceGained += 10;

    // Check for achievements
    const allBadges = await this.getAllBadges();
    const userAchievements = user.userAchievements;

    for (const badge of allBadges) {
      const existingAchievement = userAchievements.find(ua => ua.badgeId === badge.id);
      
      if (!existingAchievement || !existingAchievement.isCompleted) {
        const { progress, requirementValue } = this.calculateBadgeProgress(badge, {
          ...user,
          ...updates
        });

        if (progress >= requirementValue && !existingAchievement?.isCompleted) {
          // New achievement earned!
          newAchievements.push({
            id: badge.id,
            name: badge.name,
            description: badge.description,
            icon: badge.icon,
            rarity: badge.rarity,
            points: badge.points,
            requirement: badge.requirement,
            isCompleted: true,
            progress,
            requirementValue,
            requirementDescription: this.getRequirementDescription(badge.requirement)
          });

          experienceGained += badge.points;
        }

        // Update or create user achievement
        if (existingAchievement) {
          await db.userAchievement.update({
            where: { id: existingAchievement.id },
            data: { progress, isCompleted: progress >= requirementValue }
          });
        } else {
          await db.userAchievement.create({
            data: {
              userId: user.id,
              badgeId: badge.id,
              progress,
              isCompleted: progress >= requirementValue
            }
          });
        }
      }
    }

    // Update level
    const totalExperience = user.experience + experienceGained;
    const newLevelCalculated = Math.floor(totalExperience / this.XP_PER_LEVEL) + 1;
    
    if (newLevelCalculated > user.level) {
      levelUp = true;
      newLevel = newLevelCalculated;
      experienceGained += 50; // Bonus XP for level up
    }

    // Update user
    await db.user.update({
      where: { clerkId: userId },
      data: {
        ...updates,
        experience: totalExperience,
        level: newLevelCalculated,
        totalPoints: user.totalPoints + experienceGained
      }
    });

    return {
      newAchievements,
      levelUp,
      newLevel,
      experienceGained
    };
  }

  static async getLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
    const users = await db.user.findMany({
      orderBy: [
        { totalPoints: 'desc' },
        { level: 'desc' },
        { currentStreak: 'desc' }
      ],
      take: limit,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
        level: true,
        totalPoints: true,
        currentStreak: true,
        totalReceipts: true,
        totalEmissions: true
      }
    });

    return users.map(user => ({
      id: user.id,
      name: `${user.firstName || 'User'} ${user.lastName || ''}`.trim() || 'Anonymous',
      avatar: user.avatar || undefined,
      level: user.level,
      totalPoints: user.totalPoints,
      currentStreak: user.currentStreak,
      totalReceipts: user.totalReceipts,
      totalEmissions: Number(user.totalEmissions)
    }));
  }

  private static async getAllBadges() {
    return await db.badge.findMany({
      orderBy: [
        { rarity: 'asc' },
        { points: 'asc' }
      ]
    });
  }

  private static calculateBadgeProgress(badge: any, user: any): {
    progress: number;
    requirementValue: number;
    requirementDescription: string;
  } {
    const requirement = badge.requirement;
    
    switch (requirement) {
      case 'FIRST_UPLOAD':
        return {
          progress: user.totalReceipts > 0 ? 1 : 0,
          requirementValue: 1,
          requirementDescription: 'Upload your first receipt'
        };
      
      case 'UPLOAD_STREAK_3':
        return {
          progress: Math.min(user.currentStreak, 3),
          requirementValue: 3,
          requirementDescription: 'Upload receipts for 3 consecutive days'
        };
      
      case 'UPLOAD_STREAK_7':
        return {
          progress: Math.min(user.currentStreak, 7),
          requirementValue: 7,
          requirementDescription: 'Upload receipts for 7 consecutive days'
        };
      
      case 'UPLOAD_STREAK_30':
        return {
          progress: Math.min(user.currentStreak, 30),
          requirementValue: 30,
          requirementDescription: 'Upload receipts for 30 consecutive days'
        };
      
      case 'TOTAL_RECEIPTS_10':
        return {
          progress: Math.min(user.totalReceipts, 10),
          requirementValue: 10,
          requirementDescription: 'Upload 10 receipts total'
        };
      
      case 'TOTAL_RECEIPTS_50':
        return {
          progress: Math.min(user.totalReceipts, 50),
          requirementValue: 50,
          requirementDescription: 'Upload 50 receipts total'
        };
      
      case 'TOTAL_RECEIPTS_100':
        return {
          progress: Math.min(user.totalReceipts, 100),
          requirementValue: 100,
          requirementDescription: 'Upload 100 receipts total'
        };
      
      case 'LOW_EMISSIONS_WEEK':
        return {
          progress: user.weeklyGreenWeeks > 0 ? 1 : 0,
          requirementValue: 1,
          requirementDescription: 'Have a week with emissions below 50kg CO₂e'
        };
      
      case 'GREEN_WEEKS_5':
        return {
          progress: Math.min(user.weeklyGreenWeeks, 5),
          requirementValue: 5,
          requirementDescription: 'Have 5 weeks with emissions below 50kg CO₂e'
        };
      
      case 'GREEN_WEEKS_10':
        return {
          progress: Math.min(user.weeklyGreenWeeks, 10),
          requirementValue: 10,
          requirementDescription: 'Have 10 weeks with emissions below 50kg CO₂e'
        };
      
      case 'TOTAL_EMISSIONS_1000':
        return {
          progress: Math.min(Number(user.totalEmissions), 1000),
          requirementValue: 1000,
          requirementDescription: 'Track 1000kg CO₂e total emissions'
        };
      
      case 'GREEN_CHOICES_10':
        return {
          progress: Math.min(user.greenChoices, 10),
          requirementValue: 10,
          requirementDescription: 'Make 10 low-emission food choices'
        };
      
      case 'GREEN_CHOICES_50':
        return {
          progress: Math.min(user.greenChoices, 50),
          requirementValue: 50,
          requirementDescription: 'Make 50 low-emission food choices'
        };
      
      case 'PERFECT_WEEK':
        return {
          progress: user.weeklyGreenWeeks > 0 ? 1 : 0,
          requirementValue: 1,
          requirementDescription: 'Have a perfect green week'
        };
      
      case 'EARLY_ADOPTER':
        return {
          progress: user.totalReceipts > 0 ? 1 : 0,
          requirementValue: 1,
          requirementDescription: 'Be an early adopter of carbon tracking'
        };
      
      default:
        return {
          progress: 0,
          requirementValue: 1,
          requirementDescription: 'Complete this achievement'
        };
    }
  }

  private static getRequirementDescription(requirement: string): string {
    switch (requirement) {
      case 'FIRST_UPLOAD': return 'Upload your first receipt';
      case 'UPLOAD_STREAK_3': return 'Upload receipts for 3 consecutive days';
      case 'UPLOAD_STREAK_7': return 'Upload receipts for 7 consecutive days';
      case 'UPLOAD_STREAK_30': return 'Upload receipts for 30 consecutive days';
      case 'TOTAL_RECEIPTS_10': return 'Upload 10 receipts total';
      case 'TOTAL_RECEIPTS_50': return 'Upload 50 receipts total';
      case 'TOTAL_RECEIPTS_100': return 'Upload 100 receipts total';
      case 'LOW_EMISSIONS_WEEK': return 'Have a week with emissions below 50kg CO₂e';
      case 'GREEN_WEEKS_5': return 'Have 5 weeks with emissions below 50kg CO₂e';
      case 'GREEN_WEEKS_10': return 'Have 10 weeks with emissions below 50kg CO₂e';
      case 'TOTAL_EMISSIONS_1000': return 'Track 1000kg CO₂e total emissions';
      case 'GREEN_CHOICES_10': return 'Make 10 low-emission food choices';
      case 'GREEN_CHOICES_50': return 'Make 50 low-emission food choices';
      case 'PERFECT_WEEK': return 'Have a perfect green week';
      case 'EARLY_ADOPTER': return 'Be an early adopter of carbon tracking';
      default: return 'Complete this achievement';
    }
  }
} 