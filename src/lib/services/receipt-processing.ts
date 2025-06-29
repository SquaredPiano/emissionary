import { logger } from "@/lib/logger";
import { ocrService } from "./ocr";
import { groqAIService } from "./groq-ai";
import { ValidationService } from "./validation";
import { FallbackService } from "./fallback";
import { generateRequestId } from "@/lib/utils/request-id";
import { ProcessingResult, ProcessingOptions, EnhancedItem } from "../../database.types";
import { z } from "zod";

/**
 * Receipt Processing Configuration Interface
 */
export interface ReceiptProcessingConfig {
  readonly maxRetries: number;
  readonly retryDelayMs: number;
  readonly minTextLength: number;
  readonly minOcrScore: number;
  readonly maxProcessingTimeMs: number;
  readonly enableHealthChecks: boolean;
  readonly enableFallbacks: boolean;
}

/**
 * Receipt Processing Options
 */
export interface ReceiptProcessingOptions {
  readonly userId?: string;
  readonly requestId?: string;
  readonly enableRetries?: boolean;
  readonly enableHealthChecks?: boolean;
  readonly enableFallbacks?: boolean;
  readonly validateOcrQuality?: boolean;
  readonly useGroqAI?: boolean;
}

/**
 * Processing Step Result
 */
export interface ProcessingStepResult<T = any> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly warnings?: string[];
  readonly processingTime: number;
  readonly retryCount: number;
}

/**
 * Enhanced Item Interface
 */
export interface EnhancedItem {
  readonly name: string;
  readonly canonical_name: string;
  readonly quantity: number;
  readonly total_price: number;
  readonly category: string;
  readonly carbon_emissions: number;
  readonly confidence: number;
  readonly source: string;
  readonly is_food: boolean;
}

/**
 * Processing Result Schema
 */
const ProcessingResultSchema = z.object({
  success: z.boolean(),
  data: z.object({
    items: z.array(z.object({
      name: z.string(),
      canonical_name: z.string(),
      quantity: z.number().positive(),
      total_price: z.number().nonnegative(),
      category: z.string(),
      carbon_emissions: z.number().nonnegative(),
      confidence: z.number().min(0).max(1),
      source: z.string(),
      is_food: z.boolean(),
    })),
    merchant: z.string().optional(),
    total: z.number().nonnegative().optional(),
    total_carbon_emissions: z.number().nonnegative(),
    processing_time: z.number().nonnegative(),
    processing_steps: z.array(z.string()),
    warnings: z.array(z.string()).optional(),
  }).optional(),
  error: z.string().optional(),
  error_code: z.string().optional(),
  retry_available: z.boolean().default(false),
});

export type ProcessingResult = z.infer<typeof ProcessingResultSchema>;

/**
 * Custom Receipt Processing Errors
 */
export class ReceiptProcessingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'ReceiptProcessingError';
  }
}

export class ReceiptValidationError extends ReceiptProcessingError {
  constructor(message: string, public readonly field?: string) {
    super(message, "VALIDATION_ERROR", 400, false);
    this.name = 'ReceiptValidationError';
  }
}

/**
 * Receipt Processing Service Implementation
 * 
 * Orchestrates the complete receipt processing pipeline with robust
 * error handling, retry mechanisms, and comprehensive monitoring.
 */
export class ReceiptProcessingService {
  private static readonly DEFAULT_CONFIG: ReceiptProcessingConfig = {
    maxRetries: 3,
    retryDelayMs: 1000,
    minTextLength: 10,
    minOcrScore: 3,
    maxProcessingTimeMs: 60000, // 1 minute
    enableHealthChecks: true,
    enableFallbacks: true,
  };

  private readonly config: ReceiptProcessingConfig;

  constructor(config?: Partial<ReceiptProcessingConfig>) {
    this.config = { ...ReceiptProcessingService.DEFAULT_CONFIG, ...config };
  }

  /**
   * Process receipt image through the complete pipeline
   */
  public async processReceipt(
    imageBuffer: Buffer,
    imageType: string,
    options: ReceiptProcessingOptions = {}
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const correlationId = generateRequestId();
    const processingSteps: string[] = [];
    const warnings: string[] = [];

    const {
      userId,
      requestId,
      validateOcrQuality = true,
      enableRetries = true,
      enableFallbacks = true,
      useGroqAI = true,
    } = options;

    try {
      logger.info("Starting receipt processing", { 
        correlationId, 
        userId, 
        requestId,
        imageSize: imageBuffer.length,
        imageType 
      });

      // Step 1: OCR Processing
      processingSteps.push("OCR Processing");
      const ocrResult = await this.performOCRWithFallback(
        imageBuffer,
        imageType,
        { userId, requestId, enableRetries },
        correlationId
      );

      if (!ocrResult.success) {
        return this.createErrorResult(
          "OCR_FAILED",
          "Unable to extract text from the receipt image. Please try with a clearer image.",
          true,
          processingSteps,
          startTime
        );
      }

      // Step 2: Text Validation
      if (validateOcrQuality) {
        processingSteps.push("Text Validation");
        const textValidation = ValidationService.validateOCRText(ocrResult.data || "");
        
        if (!textValidation.isValid) {
          warnings.push(`OCR text quality: ${textValidation.score}/10`);
          if (textValidation.score < this.config.minOcrScore) {
            return this.createErrorResult(
              "POOR_OCR_QUALITY",
              "The receipt image quality is too poor for reliable processing. Please try with a clearer image.",
              false,
              processingSteps,
              startTime
            );
          }
        }
      }

      // Step 3: AI Parsing with Fallback
      processingSteps.push("AI Item Recognition");
      logger.info("Step 3: AI Parsing", { 
        correlationId, 
        textLength: ocrResult.data?.length || 0 
      });
      
      const aiResult = await this.performAIParsingWithFallback(
        ocrResult.data || "",
        { userId, requestId, enableRetries },
        correlationId
      );

      // Don't fail if AI parsing doesn't find items - use fallback data
      let items = aiResult.data?.items || [];
      if (!aiResult.success || items.length === 0) {
        warnings.push("AI parsing found no items, using fallback categorization");
        
        // Use fallback service to extract basic items from OCR text
        const fallbackItems = await this.extractFallbackItems(ocrResult.data || "");
        items = fallbackItems;
        
        if (items.length === 0) {
          warnings.push("No items could be extracted from receipt text");
          // Still don't fail - return empty items list
        }
      }

      // Step 4: Data Enhancement
      processingSteps.push("Data Enhancement");
      const enhancedItems = await this.enhanceItemsWithDatabase(
        items,
        { userId, requestId, enableFallbacks },
        correlationId
      );

      // Step 5: Final Validation
      processingSteps.push("Final Validation");
      const finalValidation = ValidationService.validateProcessedItems(enhancedItems);
      
      if (!finalValidation.isValid) {
        warnings.push(...finalValidation.warnings);
      }

      // Step 6: Calculate Totals
      processingSteps.push("Emissions Calculation");
      const totalEmissions = enhancedItems.reduce(
        (sum, item) => sum + (item.carbon_emissions || 0),
        0
      );

      const processingTime = Date.now() - startTime;

      logger.info("Receipt processing completed successfully", {
        correlationId,
        userId,
        itemsCount: enhancedItems.length,
        totalEmissions,
        processingTime,
        warnings: warnings.length
      });

      return {
        success: true,
        data: {
          items: enhancedItems,
          total_carbon_emissions: totalEmissions,
          processing_time: processingTime,
          processing_steps: processingSteps,
          warnings,
          ocr_text: ocrResult.data,
          ai_enhanced: aiResult.success
        },
      };

    } catch (error) {
      logger.error("Receipt processing failed", {
        error: error instanceof Error ? error.message : String(error)
      });

      return this.createErrorResult(
        "PROCESSING_FAILED",
        "An unexpected error occurred while processing the receipt. Please try again.",
        true,
        processingSteps,
        startTime
      );
    }
  }

  /**
   * Extract fallback items when AI parsing fails
   */
  private async extractFallbackItems(ocrText: string): Promise<any[]> {
    try {
      // Use basic text parsing to extract items
      const lines = ocrText.split('\n').filter(line => line.trim().length > 0);
      const items: any[] = [];
      
      for (const line of lines) {
        // Look for price patterns
        const priceMatch = line.match(/\$(\d+\.\d{2})/);
        if (priceMatch) {
          const price = parseFloat(priceMatch[1]);
          const itemName = line.substring(0, priceMatch.index).trim();
          
          if (itemName.length > 2) {
            // Create a basic item and apply fallbacks
            const basicItem = {
              name: itemName,
              canonical_name: itemName.toLowerCase(),
              quantity: 1.0,
              total_price: price,
              category: "processed", // Will be enhanced by fallback service
              carbon_emissions: 2.0,
              confidence: 0.3,
              is_food: true,
              source: 'fallback'
            };
            
            // Apply fallbacks to enhance the item
            const enhancedItem = FallbackService.applyBasicFallbacks(basicItem);
            items.push(enhancedItem);
          }
        }
      }
      
      return items;
    } catch (error) {
      logger.warn("Fallback item extraction failed", { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  // Private helper methods

  /**
   * Validate input parameters
   */
  private validateInputs(imageBuffer: Buffer, imageType: string): void {
    if (!imageBuffer || imageBuffer.length === 0) {
      throw new ReceiptValidationError("Empty image buffer provided", "imageBuffer");
    }

    if (!imageType || imageType.trim().length === 0) {
      throw new ReceiptValidationError("Invalid image type provided", "imageType");
    }
  }

  /**
   * Perform OCR with multiple fallback strategies
   */
  private async performOCRWithFallback(
    imageBuffer: Buffer,
    imageType: string,
    options: { userId?: string; requestId?: string; enableRetries?: boolean; enableHealthChecks?: boolean },
    correlationId: string
  ): Promise<ProcessingStepResult<string>> {
    const startTime = Date.now();
    const { userId, requestId, enableRetries = true, enableHealthChecks = true } = options;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        logger.info(`OCR attempt ${attempt}/${this.config.maxRetries}`, { correlationId });
        
        const result = await ocrService.processReceiptImage(
          imageBuffer, 
          imageType, 
          { userId, requestId, enableRetries, validateHealth: enableHealthChecks }
        );
        
        if (result.success && result.data?.text && result.data.text.trim().length >= this.config.minTextLength) {
          const processingTime = Date.now() - startTime;
          return {
            success: true,
            data: result.data.text,
            processingTime,
            retryCount: attempt - 1,
          };
        }
        
        if (attempt < this.config.maxRetries) {
          await this.delay(this.config.retryDelayMs * attempt);
        }
      } catch (error) {
        logger.warn(`OCR attempt ${attempt} failed`, { 
          correlationId, 
          attempt,
          error: error instanceof Error ? error.message : String(error)
        });
        
        if (attempt === this.config.maxRetries) {
          const processingTime = Date.now() - startTime;
          return {
            success: false,
            error: "OCR processing failed after multiple attempts",
            processingTime,
            retryCount: attempt,
          };
        }
        
        await this.delay(this.config.retryDelayMs * attempt);
      }
    }

    const processingTime = Date.now() - startTime;
    return {
      success: false,
      error: "OCR processing failed",
      processingTime,
      retryCount: this.config.maxRetries,
    };
  }

  /**
   * Perform AI parsing with multiple fallback strategies
   */
  private async performAIParsingWithFallback(
    text: string,
    options: { userId?: string; requestId?: string; enableRetries?: boolean },
    correlationId: string
  ): Promise<ProcessingStepResult<{ items: any[]; merchant?: string }>> {
    const startTime = Date.now();
    const { userId, requestId, enableRetries = true } = options;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        logger.info(`AI parsing attempt ${attempt}/${this.config.maxRetries}`, { correlationId });
        
        const result = await groqAIService.parseReceiptWithGroqAI(text);
        
        if (result.success && result.data?.items && result.data.items.length > 0) {
          const processingTime = Date.now() - startTime;
          return {
            success: true,
            data: { items: result.data.items, merchant: result.data.merchant },
            processingTime,
            retryCount: attempt - 1,
          };
        }
        
        if (attempt < this.config.maxRetries) {
          await this.delay(this.config.retryDelayMs * attempt);
        }
      } catch (error) {
        logger.warn(`AI parsing attempt ${attempt} failed`, { 
          correlationId, 
          attempt,
          error: error instanceof Error ? error.message : String(error)
        });
        
        if (attempt === this.config.maxRetries) {
          const processingTime = Date.now() - startTime;
          return {
            success: false,
            error: "AI parsing failed after multiple attempts",
            processingTime,
            retryCount: attempt,
          };
        }
        
        await this.delay(this.config.retryDelayMs * attempt);
      }
    }

    const processingTime = Date.now() - startTime;
    return {
      success: false,
      error: "AI parsing failed",
      processingTime,
      retryCount: this.config.maxRetries,
    };
  }

  /**
   * Enhance items with database matching and fallbacks
   */
  private async enhanceItemsWithDatabase(
    items: any[],
    options: { userId?: string; requestId?: string; enableFallbacks?: boolean },
    correlationId: string
  ): Promise<EnhancedItem[]> {
    const { userId, requestId, enableFallbacks = true } = options;
    const enhancedItems: EnhancedItem[] = [];

    for (const item of items) {
      try {
        // Apply fallbacks for missing data
        const enhancedItem = enableFallbacks 
          ? FallbackService.applyFallbacks(item)
          : item;
        
        // Match with database
        const dbMatch = groqAIService.matchWithDatabase(enhancedItem.canonical_name);
        
        if (dbMatch) {
          enhancedItem.carbon_emissions = dbMatch.emissions * enhancedItem.quantity;
          enhancedItem.confidence = 1.0;
          enhancedItem.source = "dataset";
        } else {
          // Estimate emissions if not in database
          const estimatedEmissions = await this.estimateEmissions(enhancedItem);
          enhancedItem.carbon_emissions = estimatedEmissions * enhancedItem.quantity;
          enhancedItem.confidence = 0.7;
          enhancedItem.source = "ai_estimation";
        }

        enhancedItems.push(enhancedItem as EnhancedItem);
      } catch (error) {
        logger.warn("Failed to enhance item", { 
          correlationId,
          item: item.name,
          error: error instanceof Error ? error.message : String(error)
        });
        
        // Apply basic fallbacks and continue
        if (enableFallbacks) {
          const fallbackItem = FallbackService.applyBasicFallbacks(item);
          enhancedItems.push(fallbackItem as EnhancedItem);
        }
      }
    }

    return enhancedItems;
  }

  /**
   * Estimate emissions for unknown items
   */
  private async estimateEmissions(item: any): Promise<number> {
    try {
      const estimatedEmissions = await groqAIService.estimateEmissionsWithGroqAI(item);
      return estimatedEmissions.data?.carbon_emissions || 2.0; // Default fallback
    } catch (error) {
      logger.warn("Failed to estimate emissions", error instanceof Error ? error : new Error(String(error)));
      return 2.0; // Conservative default
    }
  }

  /**
   * Create error result
   */
  private createErrorResult(
    errorCode: string,
    errorMessage: string,
    retryAvailable: boolean,
    processingSteps: string[],
    startTime: number
  ): ProcessingResult {
    return {
      success: false,
      error: errorMessage,
      error_code: errorCode,
      retry_available: retryAvailable,
      data: {
        items: [],
        total_carbon_emissions: 0,
        processing_time: Date.now() - startTime,
        processing_steps: processingSteps,
      },
    };
  }

  /**
   * Generate correlation ID for tracing
   */
  private generateCorrelationId(): string {
    return `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Normalize error to ReceiptProcessingError
   */
  private normalizeError(error: unknown): ReceiptProcessingError {
    if (error instanceof ReceiptProcessingError || error instanceof ReceiptValidationError) {
      return error;
    }

    if (error instanceof z.ZodError) {
      return new ReceiptValidationError(
        `Invalid processing result format: ${error.errors.map(e => e.message).join(", ")}`,
        "VALIDATION_ERROR"
      );
    }

    if (error instanceof Error) {
      return new ReceiptProcessingError(error.message, "UNKNOWN_ERROR");
    }

    return new ReceiptProcessingError(String(error), "UNKNOWN_ERROR");
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance for backward compatibility
export const receiptProcessingService = new ReceiptProcessingService(); 