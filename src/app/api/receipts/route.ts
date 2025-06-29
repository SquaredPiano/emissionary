import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserReceipts, getUserEmissionsStats } from '@/lib/actions/receipts';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { serializePrismaResult } from '@/lib/utils/prisma-serializer';

// Query validation schema
const GetReceiptsQuerySchema = z.object({
  page: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(1)).default("1"),
  limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(1).max(100)).default("10"),
  search: z.string().optional(),
  startDate: z.string().transform(val => new Date(val)).optional(),
  endDate: z.string().transform(val => new Date(val)).optional(),
  merchant: z.string().optional(),
});

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

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryData = Object.fromEntries(searchParams.entries());
    const validatedQuery = GetReceiptsQuerySchema.parse(queryData);

    logger.info("Get receipts request received", { 
      userId, 
      page: validatedQuery.page,
      limit: validatedQuery.limit,
      search: validatedQuery.search,
      merchant: validatedQuery.merchant
    });

    // Get user receipts
    const result = await getUserReceipts(validatedQuery);

    if (!result.success) {
      logger.error("Get receipts failed", undefined, { 
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

    logger.info("Get receipts completed successfully", { 
      userId, 
      receiptsCount: serializedData?.receipts?.length || 0,
      totalReceipts: serializedData?.pagination?.total || 0
    });

    return NextResponse.json({
      success: true,
      data: serializedData,
    });

  } catch (error) {
    logger.error("Get receipts API error", error instanceof Error ? error : new Error(String(error)));
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid query parameters',
          details: error.errors.map(e => e.message)
        },
        { status: 400 }
      );
    }

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