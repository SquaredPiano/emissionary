import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ocrService } from '@/lib/services/ocr';
import { OCRResponseSchema } from '@/lib/schemas';
import { z } from 'zod';
import { logger } from '@/lib/logger';

// Request validation schema
const OCRRequestSchema = z.object({
  image: z.string().min(1),
  image_type: z.string().min(1),
  user_id: z.string().optional(),
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
    const validatedBody = OCRRequestSchema.parse(body);

    logger.info("OCR API request received", { 
      userId, 
      imageType: validatedBody.image_type,
      imageSize: validatedBody.image.length 
    });

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(validatedBody.image, 'base64');

    // Process through OCR service
    const ocrResult = await ocrService.processReceiptImage(
      imageBuffer,
      validatedBody.image_type,
      { userId: validatedBody.user_id }
    );

    // Validate OCR response
    const validatedResult = OCRResponseSchema.parse(ocrResult);

    logger.info("OCR API processing completed", { 
      userId, 
      success: validatedResult.success,
      itemsCount: validatedResult.items?.length || 0,
      totalEmissions: validatedResult.total_carbon_emissions,
      processingTime: validatedResult.processing_time
    });

    return NextResponse.json({
      success: true,
      data: validatedResult,
    });

  } catch (error) {
    logger.error("OCR API error", error instanceof Error ? error : new Error(String(error)));
    
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
      // Handle specific error types
      if (error.message.includes('file too large')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 413 }
        );
      }
      
      if (error.message.includes('Invalid file type')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
        );
      }
      
      if (error.message.includes('OCR service temporarily unavailable')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 503 }
        );
      }
      
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

export async function GET() {
  try {
    // Health check endpoint
    const isHealthy = await ocrService.checkHealth();
    
    return NextResponse.json({
      success: true,
      data: {
        status: isHealthy ? 'healthy' : 'unhealthy',
        service: 'OCR-Pytesseract',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("OCR health check error", error instanceof Error ? error : new Error(String(error)));
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Health check failed',
        data: {
          status: 'unhealthy',
          service: 'OCR-Pytesseract',
          timestamp: new Date().toISOString(),
        }
      },
      { status: 503 }
    );
  }
} 