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

    // Map items for frontend
    const items = (result.data?.ocrResult?.items || []).map((item: any) => ({
      name: item.canonical_name || item.name,
      category: item.category || 'unknown',
      carbon_emissions: item.estimated_carbon_emissions_kg ?? item.carbon_emissions ?? 0,
      confidence: item.confidence ?? 0.8,
      source: item.source || '',
      status: item.is_food_item === false ? 'Unknown' : 'Mapped',
      estimated_weight_kg: item.estimated_weight_kg ?? null,
      unit_price: item.unit_price ?? null,
      total_price: item.total_price ?? null,
    }));
    logger.info('API: Returning mapped items to frontend', { items });

    logger.info("Receipt processing completed successfully", { 
      userId, 
      receiptId: serializedData?.receiptId,
      totalEmissions: serializedData?.totalEmissions,
      itemsCount: items.length
    });

    return NextResponse.json({
      success: true,
      data: {
        ...serializedData,
        items,
        totalEmissions: serializedData?.totalEmissions ?? 0,
        itemsCount: items.length,
      },
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