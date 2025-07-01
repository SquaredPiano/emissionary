import { logger } from "@/lib/logger";
import { ocrService } from "./ocr";
import { groqAIService } from "./groq-ai";
import { ValidationService } from "./validation";
import { FallbackService } from "./fallback";
import { generateRequestId } from "@/lib/utils/request-id";
import { z } from "zod";
import { searchFoodByName, getEmissionsByName } from '@/lib/data/food-dataset';
import { NON_FOOD_KEYWORDS } from "@/lib/utils/constants";

function canonicalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

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

      // Always prefer Groq AI items if available, fallback only if none
      let items = aiResult.data?.items || [];
      let usedGroqAI = aiResult.success && items.length > 0;
      let merchant = aiResult.data?.merchant;
      
      if (!usedGroqAI) {
        warnings.push("AI parsing found no items, using fallback categorization");
        logger.info("Fallback extraction triggered", { ocrText: ocrResult.data });
        const fallbackItems = await this.extractFallbackItems(ocrResult.data || "");
        logger.info("Fallback items extracted", { count: fallbackItems.length, fallbackItems });
        items = fallbackItems;
        if (items.length === 0) {
          warnings.push("No items could be extracted from receipt text");
        }
      }

      // Step 3.5: Post-processing filter for non-food lines
      items = items.filter(item => {
        const name = (item.name || "").toLowerCase();
        const category = (item.category || "").toLowerCase();
        return !NON_FOOD_KEYWORDS.some(keyword => name.includes(keyword) || category.includes(keyword));
      });

      // Step 4: Data Enhancement (with Groq AI name preference)
      processingSteps.push("Data Enhancement");
      logger.info("Step 4: Data Enhancement", { 
        correlationId, 
        itemsCount: items.length 
      });

      // Ensure all items have proper structure and status
      const enhancedItems = items.map(item => ({
        name: item.canonical_name || item.name || "Unknown Item",
        canonical_name: item.canonical_name || item.name || "unknown",
        quantity: item.quantity > 0 ? item.quantity : 1,
        total_price: item.total_price >= 0 ? item.total_price : 0,
        category: item.category || "other",
        is_food: typeof item.is_food === "boolean" ? item.is_food : true,
        carbon_emissions: item.carbon_emissions ?? 0,
        confidence: item.confidence ?? 0.8,
        source: item.source || (usedGroqAI ? "groq_ai" : "fallback"),
        status: item.status || (usedGroqAI ? "processed" : "processed"),
      }));

      // Step 4.5: Estimate emissions for all items using Groq AI
      processingSteps.push("Emissions Estimation");
      logger.info("Step 4.5: Estimating emissions with Groq AI", { 
        correlationId, 
        itemsCount: enhancedItems.length 
      });

      const itemsWithEmissions = await Promise.all(
        enhancedItems.map(async (item) => {
          try {
            // Always try to estimate emissions with Groq AI for better accuracy
            const emissionsResult = await groqAIService.estimateEmissionsWithGroqAI(item, {
              userId,
              requestId,
              enableRetries: true,
            });

            if (emissionsResult.success && emissionsResult.data?.carbon_emissions) {
              return {
                ...item,
                carbon_emissions: emissionsResult.data.carbon_emissions,
                confidence: Math.max(item.confidence, 0.7),
                source: "groq_ai",
                status: "processed",
              };
            } else {
              // Keep existing emissions if Groq AI fails
              return {
                ...item,
                source: item.source === "groq_ai" ? "fallback" : item.source,
                status: "processed",
              };
            }
          } catch (error) {
            logger.warn("Failed to estimate emissions for item", { 
              error: error instanceof Error ? error.message : String(error),
              itemName: item.name 
            });
            return {
              ...item,
              status: "processed",
            };
          }
        })
      );

      // Step 5: Final Validation
      processingSteps.push("Final Validation");
      logger.info("Step 5: Final Validation", { 
        correlationId, 
        itemsCount: itemsWithEmissions.length 
      });

      const validItems = itemsWithEmissions.filter(item => {
        if (!item.name || item.name === "Unknown Item") {
          warnings.push(`Item with invalid name filtered out: ${JSON.stringify(item)}`);
          return false;
        }
        if (item.carbon_emissions < 0) {
          warnings.push(`Item with negative emissions corrected: ${item.name}`);
          item.carbon_emissions = 0;
        }
        return true;
      });

      // Step 6: Emissions Calculation
      processingSteps.push("Emissions Calculation");
      const total_carbon_emissions = validItems.reduce((sum, item) => sum + (item.carbon_emissions || 0), 0);
      
      logger.info("Step 6: Emissions Calculation", { 
        correlationId, 
        totalEmissions: total_carbon_emissions,
        itemsCount: validItems.length 
      });

      const processingTime = Date.now() - startTime;

      logger.info("Receipt processing completed successfully", {
        correlationId,
        userId,
        processingTime,
        itemsCount: validItems.length,
        totalEmissions: total_carbon_emissions,
        merchant,
        processingSteps,
        warnings: warnings.length,
      });

      return {
        success: true,
        retry_available: false,
        data: {
          items: validItems,
          merchant: merchant || "Unknown Merchant",
          total: 0, // Will be calculated from items if needed
          total_carbon_emissions,
          processing_time: processingTime,
          processing_steps: processingSteps,
          warnings,
        },
      };

    } catch (error) {
      logger.error("Receipt processing failed", error instanceof Error ? error : new Error(String(error)));

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
      const items: any[] = [];
      const fallbackEmissionsMap: Record<string, number> = {};
      const lines = ocrText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
      for (const line of lines) {
        if (NON_FOOD_KEYWORDS.some(keyword => line.toLowerCase().includes(keyword))) continue;
        const priceMatches = Array.from(line.matchAll(/(\d+\.\d{2})/g));
        if (priceMatches.length === 0) continue;
        const lastMatch = priceMatches[priceMatches.length - 1];
        const price = parseFloat(lastMatch[1]);
        if (isNaN(price) || price <= 0 || price > 1000) continue;
        let itemName = line.slice(0, lastMatch.index).replace(/[^\w\s\-\&\(\)\,\.]/g, '').trim();
        itemName = itemName.replace(/\d{4,}$/g, '').replace(/\s{2,}/g, ' ').trim();
        if (itemName.length < 2) continue;
        const dbMatchArr = await searchFoodByName(itemName, 1);
        const dbMatch = dbMatchArr && Array.isArray(dbMatchArr) ? dbMatchArr[0] : undefined;
        let category = 'other';
        let emissions = 0;
        let confidence = 0.6;
        let source = 'fallback';
        let canonicalName = dbMatch ? dbMatch.food.toLowerCase() : canonicalizeName(itemName);
        if (dbMatch) {
          emissions = dbMatch.emissions;
          category = dbMatch.category || 'other';
          confidence = 0.8;
          source = 'database';
          itemName = dbMatch.food;
        } else {
          if (fallbackEmissionsMap[canonicalName] === undefined) {
            fallbackEmissionsMap[canonicalName] = Math.random() * 5 + 0.1;
          }
          emissions = fallbackEmissionsMap[canonicalName];
        }
        items.push({
          name: itemName,
          canonical_name: canonicalName,
          quantity: 1,
          total_price: price,
          category,
          carbon_emissions: emissions,
          confidence,
          is_food: true,
          source,
          status: 'processed',
        });
      }
      // Fallback: food keyword matching for lines with no price
      if (items.length === 0) {
        const foodKeywords = ['milk','bread','cheese','apple','banana','chicken','beef','rice','pasta','soup','cereal','yogurt','butter','eggs','meat','fish','vegetable','fruit','potato','tomato','onion','carrot','lettuce','spinach','broccoli','cauliflower','pepper','cucumber','mushroom','garlic','ginger','lemon','lime','orange','grape','strawberry','blueberry','raspberry','blackberry','peach','pear','plum','cherry','grapefruit','pineapple','mango','kiwi','avocado','coconut','olive','almond','walnut','peanut','cashew','pistachio','sunflower','pumpkin','sesame','flax','chia','quinoa','oat','wheat','corn','barley','rye','sorghum','millet','buckwheat','amaranth','teff','spelt','kamut','farro','bulgur','couscous','polenta','grits','hominy','tortilla','pita','naan','bagel','croissant','muffin','donut','cookie','cake','pie','pastry','biscuit','cracker','pretzel','popcorn','chips','nuts','seeds','dried','canned','frozen','fresh','organic','natural','whole','grain','white','brown','wild','basmati','jasmine','arborio','carnaroli','vialone','nano','baldo','pearl','black','red','green','yellow','purple','orange','pink','blue','indigo','violet','rainbow','heirloom','baby','mini','large','medium','small','jumbo','extra','super','premium'];
        for (const line of lines) {
          const cleanLine = canonicalizeName(line);
          if (foodKeywords.some(keyword => cleanLine.includes(keyword))) {
            const dbMatchArr = await searchFoodByName(line, 1);
            const dbMatch = dbMatchArr && Array.isArray(dbMatchArr) ? dbMatchArr[0] : undefined;
            let emissions = 0;
            let canonicalName = dbMatch ? dbMatch.food.toLowerCase() : cleanLine;
            let itemName = dbMatch ? dbMatch.food : line;
            let category = dbMatch ? dbMatch.category || 'other' : 'other';
            let confidence = dbMatch ? 0.8 : 0.4;
            let source = dbMatch ? 'database' : 'fallback';
            if (!dbMatch) {
              if (fallbackEmissionsMap[canonicalName] === undefined) {
                fallbackEmissionsMap[canonicalName] = Math.random() * 3 + 0.1;
              }
              emissions = fallbackEmissionsMap[canonicalName];
            } else {
              emissions = dbMatch.emissions;
            }
            items.push({
              name: itemName,
              canonical_name: canonicalName,
              quantity: 1,
              total_price: 0,
              category,
              carbon_emissions: emissions,
              confidence,
              is_food: true,
              source,
              status: 'processed',
            });
          }
        }
      }
      // Final fallback: dummy item
      if (items.length === 0 && ocrText && ocrText.trim().length > 0) {
        items.push({
          name: ocrText.trim().slice(0, 32) + (ocrText.length > 32 ? '...' : ''),
          canonical_name: 'unknown',
          quantity: 1,
          total_price: 0,
          category: 'unknown',
          carbon_emissions: Math.random() * 2 + 0.1,
          confidence: 0.1,
          is_food: true,
          source: 'manual_fallback',
          status: 'fallback',
        });
      }
      logger.info("extractFallbackItems returning", { count: items.length, items });
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