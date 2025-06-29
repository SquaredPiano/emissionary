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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    logger.info("Get leaderboard request received", { userId, limit });

    // Get leaderboard data
    const leaderboard = await GamificationService.getLeaderboard(limit);

    // Serialize data before sending to client
    const serializedData = serializePrismaResult(leaderboard);

    logger.info("Get leaderboard completed successfully", { 
      userId, 
      leaderboardSize: serializedData.length
    });

    return NextResponse.json({
      success: true,
      data: serializedData,
    });

  } catch (error) {
    logger.error("Get leaderboard API error", error instanceof Error ? error : new Error(String(error)));
    
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