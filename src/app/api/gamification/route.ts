import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { GamificationService } from '@/lib/services/gamification';
import { logger } from '@/lib/logger';
import { serializePrismaResult } from '@/lib/utils/prisma-serializer';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    logger.info("Get gamification data request received", { userId });

    // Get user from database
    const { getCurrentUser } = await import('@/lib/auth');
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' }, 
        { status: 404 }
      );
    }

    // Get user gamification data
    const gamificationData = await GamificationService.getUserGamificationData(user.id);

    // Process achievements to check for new ones
    const newAchievements = await GamificationService.processAchievements(user.id);

    // Serialize data before sending to client
    const serializedData = serializePrismaResult({
      ...gamificationData,
      newAchievements
    });

    logger.info("Get gamification data completed successfully", { 
      userId, 
      level: serializedData.level,
      totalPoints: serializedData.totalPoints,
      newAchievementsCount: newAchievements.length
    });

    return NextResponse.json({
      success: true,
      data: serializedData,
    });

  } catch (error) {
    logger.error("Get gamification data API error", error instanceof Error ? error : new Error(String(error)));
    
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, type } = body;

    logger.info("Gamification action request received", { userId, action, type });

    // Get user from database
    const { getCurrentUser } = await import('@/lib/auth');
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' }, 
        { status: 404 }
      );
    }

    let result;

    switch (action) {
      case 'update_streak':
        await GamificationService.updateStreak(user.id, type || 'upload');
        result = { message: 'Streak updated successfully' };
        break;

      case 'process_achievements':
        const newAchievements = await GamificationService.processAchievements(user.id);
        result = { 
          message: 'Achievements processed successfully',
          newAchievements: serializePrismaResult(newAchievements)
        };
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    logger.info("Gamification action completed successfully", { 
      userId, 
      action,
      result: result.message
    });

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error) {
    logger.error("Gamification action API error", error instanceof Error ? error : new Error(String(error)));
    
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 