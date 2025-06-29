import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { processReceiptImage } from '@/lib/actions/receipts';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { serializePrismaResult } from '@/lib/utils/prisma-serializer';

// Request validation schema
const ProcessReceiptRequestSchema = z.object({
  imageUrl: z.string().url(),
  imageType: z.string().min(1),
  fileName: z.string().min(1),
});

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

    // Parse and validate request body
    const body = await request.json();
    const validatedBody = ProcessReceiptRequestSchema.parse(body);

    logger.info("Receipt processing request received", { 
      userId, 
      fileName: validatedBody.fileName,
      imageType: validatedBody.imageType 
    });

    // Process receipt through OCR and save to database
    const result = await processReceiptImage(validatedBody);

    if (!result.success) {
      logger.error("Receipt processing failed", undefined, { 
        userId, 
        error: result.error,
        fileName: validatedBody.fileName 
      });

      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // Serialize any Prisma Decimal objects before sending to client
    const serializedData = serializePrismaResult(result.data);

    logger.info("Receipt processing completed successfully", { 
      userId, 
      receiptId: serializedData?.receiptId,
      totalEmissions: serializedData?.totalEmissions,
      itemsCount: serializedData?.itemsCount
    });

    return NextResponse.json({
      success: true,
      data: serializedData,
    });

  } catch (error) {
    logger.error("Receipt processing API error", error instanceof Error ? error : new Error(String(error)));
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request format',
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