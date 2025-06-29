import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getReceiptById, deleteReceipt } from '@/lib/actions/receipts';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { serializePrismaResult } from '@/lib/utils/prisma-serializer';

// Request validation schema
const ReceiptIdSchema = z.object({
  id: z.string().cuid(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    // Validate receipt ID
    const validatedParams = ReceiptIdSchema.parse(params);

    logger.info("Get receipt request received", { 
      userId, 
      receiptId: validatedParams.id 
    });

    // Get receipt
    const result = await getReceiptById(validatedParams.id);

    if (!result.success) {
      logger.error("Get receipt failed", undefined, { 
        userId, 
        receiptId: validatedParams.id,
        error: result.error 
      });

      return NextResponse.json(
        { success: false, error: result.error },
        { status: 404 }
      );
    }

    // Serialize any Prisma Decimal objects before sending to client
    const serializedData = serializePrismaResult(result.data);

    logger.info("Get receipt completed successfully", { 
      userId, 
      receiptId: validatedParams.id,
      itemsCount: serializedData?.receiptItems?.length || 0
    });

    return NextResponse.json({
      success: true,
      data: serializedData,
    });

  } catch (error) {
    logger.error("Get receipt API error", error instanceof Error ? error : new Error(String(error)));
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid receipt ID',
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    // Validate receipt ID
    const validatedParams = ReceiptIdSchema.parse(params);

    logger.info("Delete receipt request received", { 
      userId, 
      receiptId: validatedParams.id 
    });

    // Delete receipt
    const result = await deleteReceipt({ receiptId: validatedParams.id });

    if (!result.success) {
      logger.error("Delete receipt failed", undefined, { 
        userId, 
        receiptId: validatedParams.id,
        error: result.error 
      });

      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    logger.info("Delete receipt completed successfully", { 
      userId, 
      receiptId: validatedParams.id
    });

    return NextResponse.json({
      success: true,
      message: "Receipt deleted successfully",
    });

  } catch (error) {
    logger.error("Delete receipt API error", error instanceof Error ? error : new Error(String(error)));
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid receipt ID',
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