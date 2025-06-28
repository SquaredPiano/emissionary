import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { calculateTotalEmissions, getEmissionsFactor } from '@/lib/emissions-data';
import { PrismaClient } from '../../../../generated/prisma';

const prisma = new PrismaClient();

// Request schema
const EmissionsCalculationRequestSchema = z.object({
  items: z.array(z.object({
    name: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    totalPrice: z.number(),
    category: z.string().optional(),
    brand: z.string().optional(),
  })),
  merchant: z.string(),
  total: z.number(),
  date: z.string(),
});

// OpenAI item parsing schema
const ItemParsingSchema = z.object({
  items: z.array(z.object({
    name: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    totalPrice: z.number(),
    category: z.string().optional(),
    brand: z.string().optional(),
  })),
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
    const body = await request.json();
    const validatedRequest = EmissionsCalculationRequestSchema.parse(body);

    // If items are already parsed, use them directly
    let parsedItems = validatedRequest.items;

    // If items need parsing (e.g., from OCR text), use OpenAI
    if (validatedRequest.items.length === 0 || validatedRequest.items[0].name === '') {
      // This would be called when we have OCR text but need to parse items
      // For now, we'll assume items are already parsed
      return NextResponse.json(
        { error: 'No items provided for calculation' },
        { status: 400 }
      );
    }

    // Calculate emissions using our emissions data
    const emissionsResult = calculateTotalEmissions(parsedItems);

    // Get calculation method and carbon intensity
    const calculationMethod = 'FAO-based emissions factors with Canadian data';
    const carbonIntensity = emissionsResult.totalCO2 / emissionsResult.totalItems;

    // Create response
    const response = {
      success: true,
      totalCO2: emissionsResult.totalCO2,
      breakdown: emissionsResult.breakdown,
      calculationMethod,
      carbonIntensity,
      items: parsedItems,
      merchant: validatedRequest.merchant,
      total: validatedRequest.total,
      date: validatedRequest.date,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Emissions calculation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to parse items using OpenAI (for future use)
async function parseItemsWithOpenAI(ocrText: string): Promise<{
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    category?: string;
    brand?: string;
  }>;
  merchant?: string;
  total?: number;
  date?: string;
}> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = `
Parse the following receipt text and extract items, merchant, total, and date. Return as JSON.

Receipt text:
${ocrText}

Expected JSON format:
{
  "items": [
    {
      "name": "item name",
      "quantity": 1,
      "unitPrice": 2.99,
      "totalPrice": 2.99,
      "category": "optional category",
      "brand": "optional brand"
    }
  ],
  "merchant": "store name",
  "total": 25.50,
  "date": "2024-01-15"
}
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a receipt parsing assistant. Extract items, merchant, total, and date from receipt text. Return only valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    throw new Error('OpenAI API request failed');
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('No content received from OpenAI');
  }

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return ItemParsingSchema.parse(parsed);
  } catch (parseError) {
    throw new Error('Failed to parse OpenAI response as JSON');
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Emissions calculation API endpoint' });
} 