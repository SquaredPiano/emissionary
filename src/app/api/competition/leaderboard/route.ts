import { NextRequest, NextResponse } from 'next/server';
import { CompetitionService } from '@/lib/services/competition';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const leaderboard = await CompetitionService.getLeaderboard(limit);
    
    return NextResponse.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
} 