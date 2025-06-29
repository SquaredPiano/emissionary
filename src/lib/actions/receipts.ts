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
import { OCRService } from "@/lib/services/ocr";
import { Decimal } from "@prisma/client/runtime/library";

// Validation schemas
const ProcessReceiptSchema = z.object({
  imageUrl: z.string().url(),
  imageType: z.string(),
  fileName: z.string(),
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
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate input
    const validatedData = ProcessReceiptSchema.parse(data);

    logger.info("Processing receipt image", { userId, fileName: validatedData.fileName });

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Download image from UploadThing URL
    const imageResponse = await fetch(validatedData.imageUrl);
    if (!imageResponse.ok) {
      return { success: false, error: "Failed to download image" };
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Process through OCR service
    const ocrResult = await OCRService.processReceiptImage(
      imageBuffer,
      validatedData.imageType,
      userId
    );

    if (!ocrResult.success) {
      return { success: false, error: ocrResult.error_message || "OCR processing failed" };
    }

    // Calculate total carbon emissions if not present
    let totalCarbonEmissions = ocrResult.total_carbon_emissions;
    if (
      (typeof totalCarbonEmissions !== 'number' || isNaN(totalCarbonEmissions)) &&
      Array.isArray(ocrResult.items)
    ) {
      totalCarbonEmissions = ocrResult.items.reduce(
        (sum, item) => sum + (item.carbon_emissions || 0),
        0
      );
      logger.info("Calculated total carbon emissions from items", {
        userId,
        originalTotal: ocrResult.total_carbon_emissions,
        calculatedTotal: totalCarbonEmissions,
        itemsCount: ocrResult.items.length,
        itemsWithEmissions: ocrResult.items.filter(item => (item.carbon_emissions || 0) > 0).length
      });
    } else {
      logger.info("Using total carbon emissions from OCR result", {
        userId,
        totalCarbonEmissions,
        itemsCount: ocrResult.items?.length || 0
      });
    }

    // Transform OCR data to database format
    const receiptData = {
      imageUrl: validatedData.imageUrl,
      merchant: ocrResult.merchant || "Unknown Merchant",
      total: ocrResult.total || 0,
      date: new Date(ocrResult.date || new Date()),
      currency: "USD",
      totalCarbonEmissions: totalCarbonEmissions || 0,
      processingTime: ocrResult.processing_time || 0,
    };

    logger.info("Receipt data prepared for database", {
      userId,
      merchant: receiptData.merchant,
      total: receiptData.total,
      totalCarbonEmissions: receiptData.totalCarbonEmissions,
      itemsCount: ocrResult.items?.length || 0
    });

    // Validate receipt data
    const validatedReceipt = CreateReceiptFromOCRSchema.parse(receiptData);

    // Create receipt with items in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create receipt
      const receipt = await tx.receipt.create({
        data: {
          userId: user.id,
          imageUrl: validatedReceipt.imageUrl,
          merchant: validatedReceipt.merchant,
          total: new Decimal(validatedReceipt.total),
          date: validatedReceipt.date,
          currency: validatedReceipt.currency,
          taxAmount: validatedReceipt.taxAmount ? new Decimal(validatedReceipt.taxAmount) : null,
          tipAmount: validatedReceipt.tipAmount ? new Decimal(validatedReceipt.tipAmount) : null,
          paymentMethod: validatedReceipt.paymentMethod,
          receiptNumber: validatedReceipt.receiptNumber,
          totalCarbonEmissions: new Decimal(validatedReceipt.totalCarbonEmissions),
        },
      });

      // Create receipt items if available
      if (ocrResult.items && ocrResult.items.length > 0) {
        const receiptItems = OCRService.transformOCRItemsToReceiptItems(ocrResult.items);
        
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

    // Revalidate cache
    revalidatePath("/dashboard");
    revalidatePath("/history");

    logger.info("Receipt processed successfully", { 
      userId, 
      receiptId: result.id,
      itemsCount: ocrResult.items?.length || 0,
      totalEmissions: ocrResult.total_carbon_emissions
    });

    return {
      success: true,
      data: {
        receiptId: result.id,
        ocrResult,
        totalEmissions: ocrResult.total_carbon_emissions,
        itemsCount: ocrResult.items?.length || 0,
      },
    };

  } catch (error) {
    logger.error("Error processing receipt", error instanceof Error ? error : new Error(String(error)));
    
    if (error instanceof z.ZodError) {
      return { success: false, error: `Validation error: ${error.errors.map(e => e.message).join(", ")}` };
    }
    
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    
    return { success: false, error: "Failed to process receipt" };
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

    return {
      success: true,
      data: {
        receipts,
        pagination: {
          page: validatedData.page,
          limit: validatedData.limit,
          total,
          totalPages,
          hasNextPage,
          hasPrevPage,
        },
      },
    };

  } catch (error) {
    logger.error("Error getting user receipts", error instanceof Error ? error : new Error(String(error)));
    
    if (error instanceof z.ZodError) {
      return { success: false, error: `Validation error: ${error.errors.map(e => e.message).join(", ")}` };
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

    return {
      success: true,
      data: receipt,
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

    // Get emissions statistics
    const [totalEmissions, totalReceipts, monthlyEmissions, categoryBreakdown] = await Promise.all([
      // Total emissions
      prisma.receipt.aggregate({
        where: { userId: user.id },
        _sum: { totalCarbonEmissions: true },
      }),
      
      // Total receipts
      prisma.receipt.count({
        where: { userId: user.id },
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