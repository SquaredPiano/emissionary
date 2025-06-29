import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserEmissionsStats } from '@/lib/actions/receipts';
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

    logger.info("Get emissions stats request received", { userId });

    // Get user emissions statistics
    const result = await getUserEmissionsStats();

    if (!result.success) {
      logger.error("Get emissions stats failed", undefined, { 
        userId, 
        error: result.error 
      });

      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // Serialize any Prisma Decimal objects before sending to client
    const serializedData = serializePrismaResult(result.data);

    logger.info("Get emissions stats completed successfully", { 
      userId, 
      totalEmissions: serializedData?.totalEmissions,
      totalReceipts: serializedData?.totalReceipts
    });

    return NextResponse.json({
      success: true,
      data: serializedData,
    });

  } catch (error) {
    logger.error("Get emissions stats API error", error instanceof Error ? error : new Error(String(error)));
    
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