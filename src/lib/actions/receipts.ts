"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { DatabaseService } from "@/lib/services/database";
import { OCRService } from "@/lib/services/ocr";
import { logger } from "@/lib/logger";
import { 
  CreateReceiptSchema,
  CreateReceiptItemSchema,
  CreateEmissionsLogSchema,
  PaginationSchema,
  ReceiptFilterSchema,
  type CreateReceipt,
  type CreateReceiptItem,
  type CreateEmissionsLog,
  type Pagination,
  type ReceiptFilter
} from "@/lib/schemas";
import { z } from "zod";

// Input schemas for server actions
const ProcessReceiptSchema = z.object({
  imageUrl: z.string().url(),
  fileName: z.string().min(1),
  fileType: z.string().min(1),
});

const GetReceiptsSchema = z.object({
  pagination: PaginationSchema.optional(),
  filters: ReceiptFilterSchema.optional(),
});

const UpdateReceiptSchema = z.object({
  receiptId: z.string().cuid(),
  data: CreateReceiptSchema.partial(),
});

const DeleteReceiptSchema = z.object({
  receiptId: z.string().cuid(),
});

/**
 * Process a receipt image through OCR and save to database
 */
export async function processReceipt(input: z.infer<typeof ProcessReceiptSchema>) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Validate input
    const validatedInput = ProcessReceiptSchema.parse(input);

    // Get user from database
    const user = await DatabaseService.getUserByClerkId(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Download image from UploadThing
    const imageResponse = await fetch(validatedInput.imageUrl);
    if (!imageResponse.ok) {
      throw new Error("Failed to download image");
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Process through OCR
    const ocrResult = await OCRService.processReceiptImage(
      imageBuffer,
      validatedInput.fileType,
      userId
    );

    // Validate and clean OCR results
    const validatedOcrResult = OCRService.validateOCRResults(ocrResult);

    if (!validatedOcrResult.items || validatedOcrResult.items.length === 0) {
      throw new Error("No items found in receipt. Please try with a clearer image.");
    }

    // Transform OCR items to database format
    const receiptItems = OCRService.transformOCRItemsToReceiptItems(validatedOcrResult.items);

    // Prepare receipt data
    const receiptData: CreateReceipt = {
      imageUrl: validatedInput.imageUrl,
      merchant: validatedOcrResult.merchant || "Unknown Merchant",
      total: validatedOcrResult.total || 0,
      date: validatedOcrResult.date ? new Date(validatedOcrResult.date) : new Date(),
      currency: "USD",
    };

    // Prepare emissions data
    const emissionsData: CreateEmissionsLog = {
      totalCO2: validatedOcrResult.total_carbon_emissions || 0,
      breakdown: OCRService.createEmissionsBreakdown(validatedOcrResult.items),
      calculationMethod: validatedOcrResult.llm_enhanced ? "llm_enhanced" : "basic",
      llmEnhanced: validatedOcrResult.llm_enhanced || false,
    };

    // Save to database
    const result = await DatabaseService.createReceiptWithItems(
      user.id,
      receiptData,
      receiptItems,
      emissionsData
    );

    // Revalidate relevant pages
    revalidatePath("/dashboard");
    revalidatePath("/history");

    return {
      success: true,
      data: {
        receipt: result.receipt,
        items: result.items,
        emissionsLog: result.emissionsLog,
        ocrResult: validatedOcrResult,
      },
    };
  } catch (error) {
    const { userId } = await auth();
    logger.error("Process receipt error", error instanceof Error ? error : new Error(String(error)), { userId: userId || undefined });
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors.map(e => e.message).join(", ")}`,
      };
    }
    
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }
    
    return {
      success: false,
      error: "Failed to process receipt",
    };
  }
}

/**
 * Get receipts for the authenticated user
 */
export async function getReceipts(input: z.infer<typeof GetReceiptsSchema> = {}) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Validate input
    const validatedInput = GetReceiptsSchema.parse(input);

    // Get user from database
    const user = await DatabaseService.getUserByClerkId(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get receipts
    const result = await DatabaseService.getReceiptsByUser(
      user.id,
      validatedInput.pagination,
      validatedInput.filters
    );

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    const { userId } = await auth();
    logger.error("Get receipts error", error instanceof Error ? error : new Error(String(error)), { userId: userId || undefined });
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors.map(e => e.message).join(", ")}`,
      };
    }
    
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }
    
    return {
      success: false,
      error: "Failed to get receipts",
    };
  }
}

/**
 * Get a specific receipt by ID
 */
export async function getReceipt(receiptId: string) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Get user from database
    const user = await DatabaseService.getUserByClerkId(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get receipt
    const receipt = await DatabaseService.getReceiptById(receiptId, user.id);
    if (!receipt) {
      throw new Error("Receipt not found");
    }

    return {
      success: true,
      data: receipt,
    };
  } catch (error) {
    const { userId } = await auth();
    logger.error("Get receipt error", error instanceof Error ? error : new Error(String(error)), { userId: userId || undefined, receiptId });
    
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }
    
    return {
      success: false,
      error: "Failed to get receipt",
    };
  }
}

/**
 * Update a receipt
 */
export async function updateReceipt(input: z.infer<typeof UpdateReceiptSchema>) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Validate input
    const validatedInput = UpdateReceiptSchema.parse(input);

    // Get user from database
    const user = await DatabaseService.getUserByClerkId(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Update receipt
    await DatabaseService.updateReceipt(validatedInput.receiptId, user.id, validatedInput.data);

    // Revalidate relevant pages
    revalidatePath("/dashboard");
    revalidatePath("/history");

    return {
      success: true,
      message: "Receipt updated successfully",
    };
  } catch (error) {
    const { userId } = await auth();
    logger.error("Update receipt error", error instanceof Error ? error : new Error(String(error)), { userId: userId || undefined });
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors.map(e => e.message).join(", ")}`,
      };
    }
    
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }
    
    return {
      success: false,
      error: "Failed to update receipt",
    };
  }
}

/**
 * Delete a receipt
 */
export async function deleteReceipt(input: z.infer<typeof DeleteReceiptSchema>) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Validate input
    const validatedInput = DeleteReceiptSchema.parse(input);

    // Get user from database
    const user = await DatabaseService.getUserByClerkId(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Delete receipt
    await DatabaseService.deleteReceipt(validatedInput.receiptId, user.id);

    // Revalidate relevant pages
    revalidatePath("/dashboard");
    revalidatePath("/history");

    return {
      success: true,
      message: "Receipt deleted successfully",
    };
  } catch (error) {
    const { userId } = await auth();
    logger.error("Delete receipt error", error instanceof Error ? error : new Error(String(error)), { userId: userId || undefined });
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors.map(e => e.message).join(", ")}`,
      };
    }
    
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }
    
    return {
      success: false,
      error: "Failed to delete receipt",
    };
  }
}

/**
 * Get emissions summary for the authenticated user
 */
export async function getEmissionsSummary() {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Get user from database
    const user = await DatabaseService.getUserByClerkId(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get emissions summary
    const summary = await DatabaseService.getEmissionsSummary(user.id);

    return {
      success: true,
      data: summary,
    };
  } catch (error) {
    const { userId } = await auth();
    logger.error("Get emissions summary error", error instanceof Error ? error : new Error(String(error)), { userId: userId || undefined });
    
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }
    
    return {
      success: false,
      error: "Failed to get emissions summary",
    };
  }
}

/**
 * Get analytics for the authenticated user
 */
export async function getAnalytics() {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Get user from database
    const user = await DatabaseService.getUserByClerkId(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get analytics
    const analytics = await DatabaseService.getAnalytics(user.id);

    return {
      success: true,
      data: analytics,
    };
  } catch (error) {
    const { userId } = await auth();
    logger.error("Get analytics error", error instanceof Error ? error : new Error(String(error)), { userId: userId || undefined });
    
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }
    
    return {
      success: false,
      error: "Failed to get analytics",
    };
  }
} 