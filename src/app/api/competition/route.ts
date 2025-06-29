import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { CompetitionService } from '@/lib/services/competition';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const competitionData = await CompetitionService.getUserCompetitionData(userId);
    
    return NextResponse.json({
      success: true,
      data: competitionData
    });
  } catch (error) {
    console.error('Error fetching competition data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch competition data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'process_upload':
        const result = await CompetitionService.processReceiptUpload(userId, data);
        return NextResponse.json({
          success: true,
          data: result
        });
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error processing competition action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process competition action' },
      { status: 500 }
    );
  }
} 