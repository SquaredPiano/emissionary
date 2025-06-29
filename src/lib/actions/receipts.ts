"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { 
  CreateReceiptFromOCRSchema,
  CreateReceiptItemFromOCRSchema,
  type OCRResponse,
  type OCRItem
} from "@/lib/schemas";
import { receiptProcessingService } from "@/lib/services/receipt-processing";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * Serialize Prisma results to remove Decimal objects
 * This ensures only plain objects are passed to client components
 */
function serializePrismaResult<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

// Validation schemas
const ProcessReceiptSchema = z.object({
  imageUrl: z.string().url(),
  imageType: z.string().default("image/jpeg"),
});

const GetReceiptsSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  merchant: z.string().optional(),
});

const DeleteReceiptSchema = z.object({
  receiptId: z.string().cuid(),
});

/**
 * Process receipt image through OCR and save to database
 */
export async function processReceiptImage(
  data: z.infer<typeof ProcessReceiptSchema>
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    // Get authenticated user
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Authentication required" };
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return { success: false, error: "User not found in database" };
    }

    logger.info("Processing receipt image", {
      userId: user.id,
      imageUrl: data.imageUrl,
      imageType: data.imageType,
    });

    // Download image from URL
    const imageResponse = await fetch(data.imageUrl);
    if (!imageResponse.ok) {
      return { success: false, error: "Failed to download image" };
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Process receipt with OCR and AI
    const processedData = await receiptProcessingService.processReceipt(
      imageBuffer,
      data.imageType,
      {
        userId: user.id,
        requestId: `req_${Date.now()}`,
        enableRetries: true,
        enableFallbacks: true,
        validateOcrQuality: true,
      }
    );

    if (!processedData.success) {
      logger.warn("Receipt processing failed", {
        userId: user.id,
        error: processedData.error,
      });
      
      // Don't fail completely - create receipt with available data
      const fallbackData = {
        imageUrl: data.imageUrl,
        merchant: "Unknown Merchant",
        total: 0,
        date: new Date(),
        currency: "USD",
        totalCarbonEmissions: 0,
        items: [],
      };

      // Create receipt with fallback data
      const receipt = await prisma.receipt.create({
        data: {
          userId: user.id,
          imageUrl: fallbackData.imageUrl,
          merchant: fallbackData.merchant,
          total: new Decimal(fallbackData.total),
          date: fallbackData.date,
          currency: fallbackData.currency,
          totalCarbonEmissions: new Decimal(fallbackData.totalCarbonEmissions),
        },
      });

      // Serialize the receipt data
      const serializedReceipt = serializePrismaResult(receipt);

      return {
        success: true,
        data: {
          receiptId: serializedReceipt.id,
          items: [],
          totalEmissions: 0,
          itemsCount: 0,
          processingSteps: processedData.processingSteps || [],
          warnings: processedData.warnings || ["Processing failed, using fallback data"],
        },
      };
    }

    // Transform processed data to database format
    const receiptData = {
      imageUrl: data.imageUrl,
      merchant: processedData.data?.merchant || "Unknown Merchant",
      total: processedData.data?.total || 0,
      date: new Date(),
      currency: "USD",
      taxAmount: undefined,
      tipAmount: undefined,
      paymentMethod: undefined,
      receiptNumber: undefined,
      totalCarbonEmissions: processedData.data?.total_carbon_emissions || 0,
      processingTime: processedData.data?.processing_time || 0,
    };

    logger.info("Receipt data prepared for database", {
      userId,
      merchant: receiptData.merchant,
      total: receiptData.total,
      totalCarbonEmissions: receiptData.totalCarbonEmissions,
      itemsCount: processedData.data?.items?.length || 0
    });

    // Create receipt with items in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create receipt
      const receipt = await tx.receipt.create({
        data: {
          userId: user.id,
          imageUrl: receiptData.imageUrl,
          merchant: receiptData.merchant,
          total: new Decimal(receiptData.total),
          date: receiptData.date,
          currency: receiptData.currency,
          taxAmount: receiptData.taxAmount ? new Decimal(receiptData.taxAmount) : null,
          tipAmount: receiptData.tipAmount ? new Decimal(receiptData.tipAmount) : null,
          paymentMethod: receiptData.paymentMethod,
          receiptNumber: receiptData.receiptNumber,
          totalCarbonEmissions: new Decimal(receiptData.totalCarbonEmissions),
        },
      });

      // Create receipt items if available
      if (processedData.data?.items && processedData.data.items.length > 0) {
        const receiptItems = processedData.data.items.map((item: any) => ({
          name: item.name || item.canonical_name || "Unknown Item",
          quantity: item.quantity || 1,
          unitPrice: item.total_price ? item.total_price / item.quantity : 0,
          totalPrice: item.total_price || 0,
          category: item.category || "processed",
          brand: "",
          barcode: "",
          description: "",
          carbonEmissions: item.carbon_emissions || 0,
          confidence: item.confidence || 0.5,
        }));
        
        for (const item of receiptItems) {
          await tx.receiptItem.create({
            data: {
              receiptId: receipt.id,
              name: item.name,
              quantity: new Decimal(item.quantity),
              unitPrice: new Decimal(item.unitPrice),
              totalPrice: new Decimal(item.totalPrice),
              category: item.category,
              brand: item.brand,
              barcode: item.barcode,
              description: item.description,
              carbonEmissions: new Decimal(item.carbonEmissions),
              confidence: new Decimal(item.confidence),
            },
          });
        }
      }

      return receipt;
    });

    // Serialize the result
    const serializedResult = serializePrismaResult(result);

    // Revalidate cache
    revalidatePath("/dashboard");
    revalidatePath("/history");

    logger.info("Receipt processed successfully", { 
      userId, 
      receiptId: serializedResult.id,
      itemsCount: processedData.data?.items?.length || 0,
      totalEmissions: processedData.data?.total_carbon_emissions,
      processingSteps: processedData.data?.processing_steps,
      warnings: processedData.data?.warnings?.length || 0
    });

    return {
      success: true,
      data: {
        receiptId: serializedResult.id,
        items: processedData.data?.items?.map((item: any) => ({
          name: item.canonical_name || item.name,
          category: item.category || 'unknown',
          carbon_emissions: item.carbon_emissions ?? 0,
          confidence: item.confidence ?? 0.8,
          source: item.source || '',
          status: item.is_food === false ? 'Unknown' : 'Mapped',
          estimated_weight_kg: null,
          unit_price: item.total_price ? item.total_price / item.quantity : null,
          total_price: item.total_price ?? null,
        })) || [],
        totalEmissions: processedData.data?.total_carbon_emissions ?? 0,
        itemsCount: processedData.data?.items?.length || 0,
        processingSteps: processedData.data?.processing_steps,
        warnings: processedData.data?.warnings,
      },
    };

  } catch (error) {
    logger.error("Receipt processing API error", error instanceof Error ? error : new Error(String(error)));
    
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: 'Invalid request format'
      };
    }

    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Get user's receipts with pagination and filtering
 */
export async function getUserReceipts(
  data: z.infer<typeof GetReceiptsSchema>
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate input
    const validatedData = GetReceiptsSchema.parse(data);

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Build where clause
    const where: any = { userId: user.id };

    if (validatedData.search) {
      where.OR = [
        { merchant: { contains: validatedData.search, mode: "insensitive" } },
        { receiptItems: { some: { name: { contains: validatedData.search, mode: "insensitive" } } } },
      ];
    }

    if (validatedData.merchant) {
      where.merchant = { contains: validatedData.merchant, mode: "insensitive" };
    }

    if (validatedData.startDate || validatedData.endDate) {
      where.date = {};
      if (validatedData.startDate) where.date.gte = validatedData.startDate;
      if (validatedData.endDate) where.date.lte = validatedData.endDate;
    }

    // Calculate pagination
    const skip = (validatedData.page - 1) * validatedData.limit;

    // Get receipts with related data
    const [receipts, total] = await Promise.all([
      prisma.receipt.findMany({
        where,
        include: {
          receiptItems: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: validatedData.limit,
      }),
      prisma.receipt.count({ where }),
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / validatedData.limit);
    const hasNextPage = validatedData.page < totalPages;
    const hasPrevPage = validatedData.page > 1;

    const result = {
      receipts,
      pagination: {
        page: validatedData.page,
        limit: validatedData.limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    };

    // Serialize to remove Decimal objects
    const serializedResult = serializePrismaResult(result);

    return {
      success: true,
      data: serializedResult,
    };

  } catch (error) {
    logger.error("Error getting receipts", error instanceof Error ? error : new Error(String(error)));
    
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: `Validation error: ${error.errors.map(e => e.message).join(", ")}`
      };
    }
    
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    
    return { success: false, error: "Failed to get receipts" };
  }
}

/**
 * Get single receipt by ID
 */
export async function getReceiptById(
  receiptId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Get receipt with related data
    const receipt = await prisma.receipt.findFirst({
      where: {
        id: receiptId,
        userId: user.id,
      },
      include: {
        receiptItems: true,
      },
    });

    if (!receipt) {
      return { success: false, error: "Receipt not found" };
    }

    // Serialize to remove Decimal objects
    const serializedReceipt = serializePrismaResult(receipt);

    return {
      success: true,
      data: serializedReceipt,
    };

  } catch (error) {
    logger.error("Error getting receipt", error instanceof Error ? error : new Error(String(error)));
    
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    
    return { success: false, error: "Failed to get receipt" };
  }
}

/**
 * Delete receipt and all related data
 */
export async function deleteReceipt(
  data: z.infer<typeof DeleteReceiptSchema>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate input
    const validatedData = DeleteReceiptSchema.parse(data);

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Check if receipt belongs to user
    const receipt = await prisma.receipt.findFirst({
      where: {
        id: validatedData.receiptId,
        userId: user.id,
      },
    });

    if (!receipt) {
      return { success: false, error: "Receipt not found" };
    }

    // Delete receipt (cascade will handle related records)
    await prisma.receipt.delete({
      where: { id: validatedData.receiptId },
    });

    // Revalidate cache
    revalidatePath("/dashboard");
    revalidatePath("/history");

    logger.info("Receipt deleted successfully", { userId, receiptId: validatedData.receiptId });

    return { success: true };

  } catch (error) {
    logger.error("Error deleting receipt", error instanceof Error ? error : new Error(String(error)));
    
    if (error instanceof z.ZodError) {
      return { success: false, error: `Validation error: ${error.errors.map(e => e.message).join(", ")}` };
    }
    
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    
    return { success: false, error: "Failed to delete receipt" };
  }
}

/**
 * Get user's emissions statistics
 */
export async function getUserEmissionsStats(): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Calculate date ranges
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0);

    const fourWeeksAgo = new Date(now);
    fourWeeksAgo.setDate(now.getDate() - 28); // 4 weeks ago
    fourWeeksAgo.setHours(0, 0, 0, 0);

    // Get emissions statistics
    const [totalEmissions, totalReceipts, thisWeekEmissions, fourWeekEmissions, monthlyEmissions, categoryBreakdown] = await Promise.all([
      // Total emissions
      prisma.receipt.aggregate({
        where: { userId: user.id },
        _sum: { totalCarbonEmissions: true },
      }),
      
      // Total receipts
      prisma.receipt.count({
        where: { userId: user.id },
      }),
      
      // This week's emissions
      prisma.receipt.aggregate({
        where: { 
          userId: user.id,
          date: { gte: startOfWeek }
        },
        _sum: { totalCarbonEmissions: true },
      }),
      
      // Last 4 weeks emissions
      prisma.receipt.aggregate({
        where: { 
          userId: user.id,
          date: { gte: fourWeeksAgo }
        },
        _sum: { totalCarbonEmissions: true },
      }),
      
      // Monthly emissions (last 12 months)
      prisma.receipt.findMany({
        where: {
          userId: user.id,
          date: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1),
          },
        },
        select: { 
          date: true,
          totalCarbonEmissions: true,
        },
        orderBy: { date: "asc" },
      }),
      
      // Category breakdown
      prisma.receiptItem.findMany({
        where: { 
          receipt: { userId: user.id }
        },
        select: { 
          category: true,
          carbonEmissions: true,
          name: true,
        },
      }),
    ]);

    // Calculate weekly averages
    const thisWeekTotal = Number(thisWeekEmissions._sum.totalCarbonEmissions || 0);
    const fourWeekTotal = Number(fourWeekEmissions._sum.totalCarbonEmissions || 0);
    const weeklyAverage = fourWeekTotal / 4; // Average over 4 weeks

    // Process monthly data
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const month = new Date(new Date().getFullYear(), new Date().getMonth() - 11 + i, 1);
      const monthEmissions = monthlyEmissions.filter(receipt => {
        const receiptMonth = new Date(receipt.date);
        return receiptMonth.getMonth() === month.getMonth() && 
               receiptMonth.getFullYear() === month.getFullYear();
      });
      
      return {
        month: month.toISOString().slice(0, 7), // YYYY-MM format
        emissions: monthEmissions.reduce((sum, receipt) => sum + Number(receipt.totalCarbonEmissions), 0),
        receipts: monthEmissions.length,
      };
    });

    // Process category breakdown
    const categoryStats: Record<string, { count: number; totalEmissions: number; items: string[] }> = {};
    categoryBreakdown.forEach(item => {
      const category = item.category || 'Unknown';
      const emissions = Number(item.carbonEmissions || 0);
      
      if (!categoryStats[category]) {
        categoryStats[category] = { count: 0, totalEmissions: 0, items: [] };
      }
      
      categoryStats[category].count += 1;
      categoryStats[category].totalEmissions += emissions;
      categoryStats[category].items.push(item.name);
    });

    return {
      success: true,
      data: {
        totalEmissions: Number(totalEmissions._sum.totalCarbonEmissions || 0),
        totalReceipts,
        thisWeekEmissions: thisWeekTotal,
        weeklyAverage: weeklyAverage,
        fourWeekTotal: fourWeekTotal,
        monthlyData,
        categoryBreakdown: categoryStats,
        averageEmissionsPerReceipt: totalReceipts > 0 ? Number(totalEmissions._sum.totalCarbonEmissions || 0) / totalReceipts : 0,
      },
    };

  } catch (error) {
    logger.error("Error getting emissions stats", error instanceof Error ? error : new Error(String(error)));
    
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    
    return { success: false, error: "Failed to get emissions statistics" };
  }
} 