import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';

// OCR response schema
const OCRResponseSchema = z.object({
  success: z.boolean(),
  text: z.string(),
  confidence: z.number().min(0).max(1),
  items: z.array(z.object({
    name: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    totalPrice: z.number(),
    category: z.string().optional(),
    brand: z.string().optional(),
  })).optional(),
  merchant: z.string().optional(),
  total: z.number().optional(),
  date: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    
    if (!imageFile) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    // Validate file type
    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Invalid file type. Please upload an image.' }, { status: 400 });
    }

    // Convert image to base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');

    // Call Python OCR microservice
    const ocrServiceUrl = process.env.OCR_SERVICE_URL || 'http://localhost:8000';
    
    const response = await fetch(`${ocrServiceUrl}/ocr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image,
        image_type: imageFile.type,
      }),
    });

    if (!response.ok) {
      console.error('OCR service error:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'OCR processing failed' },
        { status: 500 }
      );
    }

    const ocrResult = await response.json();
    
    // Validate OCR response
    const validatedResult = OCRResponseSchema.parse(ocrResult);

    return NextResponse.json(validatedResult);

  } catch (error) {
    console.error('OCR API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid OCR response format' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'OCR API endpoint' });
} 