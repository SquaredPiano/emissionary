import { logger } from "@/lib/logger";
import { z } from "zod";
import fs from 'fs';
import path from 'path';
import { loadFoodDataset, searchFoodByName, getEmissionsByName, getAllFoods } from '@/lib/data/food-dataset';
import axios from 'axios';

/**
 * Groq AI Service Configuration Interface
 */
export interface GroqAIServiceConfig {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly model: string;
  readonly timeoutMs: number;
  readonly maxRetries: number;
  readonly retryDelayMs: number;
  readonly maxTokens: number;
  readonly temperature: number;
  readonly foodDatabasePath: string;
  readonly fuzzySearchThreshold: number;
}

/**
 * Groq AI Processing Options
 */
export interface GroqAIProcessingOptions {
  readonly userId?: string;
  readonly requestId?: string;
  readonly enableRetries?: boolean;
  readonly enableFuzzyMatching?: boolean;
  readonly enableFallbacks?: boolean;
}

/**
 * Food Database Item Interface
 */
export interface FoodDatabaseItem {
  readonly name: string;
  readonly canonical: string;
  readonly category: string;
  readonly emissions: number;
}

/**
 * Parsed Food Item Interface
 */
export interface ParsedFoodItem {
  readonly name: string;
  readonly canonical_name: string;
  readonly quantity: number;
  readonly total_price?: number;
  readonly category: string;
  readonly is_food: boolean;
  readonly carbon_emissions?: number;
  readonly confidence: number;
  readonly source: string;
  readonly status: string;
}

/**
 * Groq AI Response Interface
 */
export interface GroqAIResponse {
  readonly items: ParsedFoodItem[];
  readonly merchant?: string;
  readonly total?: number;
}

/**
 * Groq AI Processing Result
 */
export interface GroqAIProcessingResult<T = any> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly processingTime: number;
  readonly retryCount: number;
}

/**
 * Custom Groq AI Service Errors
 */
export class GroqAIServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'GroqAIServiceError';
  }
}

export class GroqAIValidationError extends GroqAIServiceError {
  constructor(message: string, public readonly field?: string) {
    super(message, "VALIDATION_ERROR", 400, false);
    this.name = 'GroqAIValidationError';
  }
}

/**
 * Schema Definitions
 */
const FoodDatabaseItemSchema = z.object({
  name: z.string(),
  canonical: z.string(),
  category: z.string(),
  emissions: z.number(),
});

const ParsedFoodItemSchema = z.object({
  name: z.string(),
  canonical_name: z.string(),
  quantity: z.number().default(1.0),
  total_price: z.number().optional(),
  category: z.string(),
  is_food: z.boolean(),
  carbon_emissions: z.number().optional(),
  confidence: z.number().default(0.8),
  source: z.string().default("dataset"),
});

const GroqAIResponseSchema = z.object({
  items: z.array(ParsedFoodItemSchema),
  merchant: z.string().optional(),
  total: z.number().optional(),
});

const DEBUG_DIR = path.join(process.cwd(), 'groq-debug-outputs');
if (!fs.existsSync(DEBUG_DIR)) fs.mkdirSync(DEBUG_DIR);

function saveGroqDebug(inputText: string, output: string, suffix: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const txtPath = path.join(DEBUG_DIR, `groq_input_${suffix}_${timestamp}.txt`);
  const outPath = path.join(DEBUG_DIR, `groq_output_${suffix}_${timestamp}.txt`);
  fs.writeFileSync(txtPath, inputText);
  fs.writeFileSync(outPath, output);
}

// Load dataset at startup
loadFoodDataset();

const EXTRACT_ITEMS_PROMPT = `You are an expert at reading grocery receipts. Given the following OCR text, extract every possible line that could be a food item, even if you are unsure. For each item, return a JSON object with:
  - name: the item name as best as you can guess
  - quantity: the quantity (default to 1 if not clear)
  - total_price: the price for that line
  - is_food: true if you think it is food, false otherwise (err on the side of true)
  - category: guess the food category (produce, dairy, meat, bakery, snack, beverage, other)
  - confidence: a number from 0 to 1 for how confident you are this is a food item
Always return a JSON array of items, even if you are unsure.`;

const ALLOWED_CATEGORIES = ["produce", "dairy", "meat", "bakery", "snack", "beverage", "other"];

export async function extractItemsWithGroqAI(ocrText: string): Promise<ParsedFoodItem[]> {
  const prompt = `${EXTRACT_ITEMS_PROMPT}\nOCR text:\n${ocrText}\n\nRemember: Only use these categories: produce, dairy, meat, bakery, snack, beverage, other.`;
  try {
    logger.info("Calling Groq AI for item extraction");
    const response = await axios.post(
      process.env.GROQ_API_URL || "https://api.groq.com/openai/v1/chat/completions",
      {
        model: process.env.GROQ_MODEL || "llama-3.1-70b-versatile",
        messages: [
          { role: "system", content: "You are an expert at reading grocery receipts." },
          { role: "user", content: prompt }
        ],
        max_tokens: 1200,
        temperature: 0.1,
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 30000
      }
    );
    const content = response.data.choices[0].message.content;
    saveGroqDebug(prompt, content, 'extract');
    let items: ParsedFoodItem[] = [];
    try {
      items = JSON.parse(content);
    } catch (e) {
      logger.error("Failed to parse Groq AI JSON response", e instanceof Error ? e : new Error(String(e)));
      return [];
    }
    // Post-process: ensure only allowed categories
    items = items.map(item => ({
      ...item,
      category: ALLOWED_CATEGORIES.includes(item.category) ? item.category : "other"
    }));
    logger.info(`Groq AI extracted ${items.length} items`);
    return items;
  } catch (error) {
    logger.error("Groq AI item extraction failed", error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

const MATCH_DATASET_PROMPT = (itemName: string, foodList: string[]) => `Given the item name "${itemName}", does it match any of the following foods? [${foodList.join(', ')}]. If so, return the best match and a confidence score (0-1). If not, return null.`;

export async function matchItemToDatasetWithGroqAI(itemName: string): Promise<{ match: string; confidence: number } | null> {
  // Get all food names from the dataset
  const foodList: string[] = getAllFoods().map((f: { food: string }) => f.food);
  // Chunk the food list if too large for prompt (Groq has context limits)
  const chunkSize = 50;
  let bestMatch: { match: string; confidence: number } | null = null;
  for (let i = 0; i < foodList.length; i += chunkSize) {
    const chunk = foodList.slice(i, i + chunkSize);
    const prompt = `Given the item name "${itemName}", does it match any of the following foods? [${chunk.join(', ')}]. If so, return the best match and a confidence score (0-1). If not, return null. Only return the name and confidence.`;
    try {
      logger.info(`Calling Groq AI for dataset match: chunk ${i / chunkSize + 1}`);
      const response = await axios.post(
        process.env.GROQ_API_URL || "https://api.groq.com/openai/v1/chat/completions",
        {
          model: process.env.GROQ_MODEL || "llama-3.1-70b-versatile",
          messages: [
            { role: "system", content: "You are an expert at matching food names." },
            { role: "user", content: prompt }
          ],
          max_tokens: 300,
          temperature: 0.1,
        },
        {
          headers: {
            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json"
          },
          timeout: 20000
        }
      );
      const content = response.data.choices[0].message.content;
      saveGroqDebug(prompt, content, 'match');
      let matchResult: { match: string; confidence: number } | null = null;
      try {
        matchResult = JSON.parse(content);
      } catch (e) {
        logger.error("Failed to parse Groq AI match JSON response", e instanceof Error ? e : new Error(String(e)));
        continue;
      }
      if (matchResult && (!bestMatch || matchResult.confidence > bestMatch.confidence)) {
        bestMatch = matchResult;
      }
    } catch (error) {
      logger.error("Groq AI dataset match failed", error instanceof Error ? error : new Error(String(error)));
      continue;
    }
  }
  logger.info(`Best Groq AI dataset match: ${bestMatch ? bestMatch.match : 'none'} (confidence: ${bestMatch ? bestMatch.confidence : 0})`);
  return bestMatch;
}

export function fallbackFuzzyMatch(itemName: string): FoodDatabaseItem | undefined {
  const match = searchFoodByName(itemName, 1)[0];
  if (!match) return undefined;
  return {
    name: match.food,
    canonical: match.food.toLowerCase(),
    category: match.category,
    emissions: match.emissions,
  };
}

/**
 * Groq AI Service Implementation
 * 
 * Provides AI-powered receipt parsing and food item analysis with
 * robust error handling, retry mechanisms, and comprehensive monitoring.
 */
export class GroqAIService {
  private static readonly DEFAULT_CONFIG: GroqAIServiceConfig = {
    apiKey: process.env.GROQ_API_KEY || "",
    baseUrl: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.1-70b-versatile",
    timeoutMs: 30000,
    maxRetries: 3,
    retryDelayMs: 1000,
    maxTokens: 2000,
    temperature: 0.1,
    foodDatabasePath: process.env.FOOD_DATABASE_PATH || "ocr-service/food_dictionary.csv",
    fuzzySearchThreshold: 0.3,
  };

  private readonly config: GroqAIServiceConfig;
  private foodDatabase: FoodDatabaseItem[] = [];
  private isInitialized = false;

  constructor(config?: Partial<GroqAIServiceConfig>) {
    this.config = { ...GroqAIService.DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the service and load food database
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.loadFoodDatabase();
      this.isInitialized = true;
      logger.info("Groq AI service initialized successfully", {
        databaseSize: this.foodDatabase.length,
      });
    } catch (error) {
      const groqError = this.normalizeError(error);
      logger.error("Failed to initialize Groq AI service", groqError);
      throw groqError;
    }
  }

  /**
   * Parse receipt text using Groq AI with comprehensive error handling
   */
  public async parseReceiptWithGroqAI(
    ocrText: string,
    options: GroqAIProcessingOptions = {}
  ): Promise<GroqAIProcessingResult<GroqAIResponse>> {
    const startTime = Date.now();
    const { userId, requestId, enableRetries = true, enableFuzzyMatching = true, enableFallbacks = true } = options;
    
    const context = { userId, requestId, textLength: ocrText.length };

    try {
      logger.info("Starting Groq AI receipt parsing", context);

      // Validate inputs
      this.validateInputs(ocrText);

      // Ensure service is initialized
      await this.initialize();

      // Parse with retry mechanism
      const result = enableRetries 
        ? await this.parseWithRetry(ocrText, context)
        : await this.parseSingle(ocrText, context);

      if (!result.success) {
        const processingTime = Date.now() - startTime;
        return {
          success: false,
          error: result.error,
          processingTime,
          retryCount: result.retryCount,
        };
      }

      // Extract merchant information
      const merchant = await this.extractMerchant(ocrText, context);

      // Process items with fuzzy matching, fallbacks, and emissions estimation
      const processedItems = await this.processItemsWithFallbacks(
        result.data || [],
        { enableFuzzyMatching, enableFallbacks },
        context
      );

      const processingTime = Date.now() - startTime;

      logger.info("Groq AI receipt parsing completed successfully", {
        ...context,
        itemsCount: processedItems.length,
        merchant,
        processingTime,
        retryCount: result.retryCount,
      });

      return {
        success: true,
        data: {
          items: processedItems,
          merchant,
          total: undefined,
        },
        processingTime,
        retryCount: result.retryCount,
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const groqError = this.normalizeError(error);
      
      logger.error("Groq AI receipt parsing failed", groqError, {
        ...context,
        processingTime,
        errorCode: groqError.code,
        retryable: groqError.retryable,
      });

      return {
        success: false,
        error: groqError.message,
        processingTime,
        retryCount: 0,
      };
    }
  }

  /**
   * Estimate emissions for unknown food items using Groq AI
   */
  public async estimateEmissionsWithGroqAI(
    item: ParsedFoodItem,
    options: GroqAIProcessingOptions = {}
  ): Promise<GroqAIProcessingResult<ParsedFoodItem>> {
    const startTime = Date.now();
    const { userId, requestId, enableRetries = true } = options;
    
    const context = { userId, requestId, itemName: item.canonical_name };

    try {
      logger.info("Starting Groq AI emissions estimation", context);

      // Validate inputs
      if (!item.canonical_name || item.canonical_name.trim().length === 0) {
        throw new GroqAIValidationError("Item name is required for emissions estimation", "canonical_name");
      }

      // Check if API key is available
      if (!this.config.apiKey) {
        logger.warn("Groq API key not available, using fallback emissions", context);
        const processingTime = Date.now() - startTime;
        return {
          success: true,
          data: {
            ...item,
            carbon_emissions: 2.0 * item.quantity,
            confidence: 0.5,
            source: "fallback",
            status: "fallback",
          },
          processingTime,
          retryCount: 0,
        };
      }

      // Estimate with retry mechanism
      const result = enableRetries 
        ? await this.estimateWithRetry(item, context)
        : await this.estimateSingle(item, context);

      const processingTime = Date.now() - startTime;

      logger.info("Groq AI emissions estimation completed", {
        ...context,
        processingTime,
        retryCount: result.retryCount,
        estimatedEmissions: result.data?.carbon_emissions,
      });

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const groqError = this.normalizeError(error);
      
      logger.error("Groq AI emissions estimation failed", groqError, {
        ...context,
        processingTime,
        errorCode: groqError.code,
      });

      return {
        success: false,
        error: groqError.message,
        processingTime,
        retryCount: 0,
      };
    }
  }

  /**
   * Match food item with database using fuzzy matching
   */
  public matchWithDatabase(canonicalName: string): FoodDatabaseItem | null {
    if (!this.isInitialized) {
      logger.warn("Service not initialized, cannot perform database matching");
      return null;
    }

    const searchName = canonicalName.toLowerCase();
    
    // Try exact match first
    for (const item of this.foodDatabase) {
      if (item.name === searchName) {
        return item;
      }
    }

    // Try simple contains matching
    for (const item of this.foodDatabase) {
      if (item.name.includes(searchName) || searchName.includes(item.name)) {
        return item;
      }
    }

    // Try simple similarity matching
    for (const item of this.foodDatabase) {
      if (this.calculateSimilarity(item.name, searchName) > 0.7) {
        return item;
      }
    }

    return null;
  }

  /**
   * Calculate simple string similarity (0-1)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
      }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Calculate total emissions from items
   */
  public static calculateTotalEmissions(items: ParsedFoodItem[]): number {
    return items.reduce((total, item) => total + (item.carbon_emissions || 0), 0);
  }

  /**
   * Validate input parameters
   */
  private validateInputs(ocrText: string): void {
    if (!ocrText || ocrText.trim().length === 0) {
      throw new GroqAIValidationError("OCR text is required", "ocrText");
    }

    if (ocrText.length > 10000) {
      throw new GroqAIValidationError("OCR text too long (max 10,000 characters)", "ocrText");
    }
  }

  /**
   * Load food database from CSV file
   */
  private async loadFoodDatabase(): Promise<void> {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      if (!fs.existsSync(this.config.foodDatabasePath)) {
        logger.warn(`Food database not found at ${this.config.foodDatabasePath}`);
        this.foodDatabase = [];
        return;
      }

      const csvContent = fs.readFileSync(this.config.foodDatabasePath, 'utf-8');
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      // Skip header
      const dataLines = lines.slice(1);
      
      this.foodDatabase = dataLines.map(line => {
        const [name, canonical, category, emissionsStr] = line.split(',').map(field => field.trim().replace(/"/g, ''));
        return {
          name: name.toLowerCase(),
          canonical,
          category,
          emissions: parseFloat(emissionsStr) || 0,
        };
      });

      logger.info(`Loaded ${this.foodDatabase.length} items from food database`);
    } catch (error) {
      logger.error("Failed to load food database", error instanceof Error ? error : new Error(String(error)));
      this.foodDatabase = [];
    }
  }

  /**
   * Parse receipt with retry mechanism
   */
  private async parseWithRetry(
    ocrText: string,
    context: Record<string, any>
  ): Promise<GroqAIProcessingResult<any[]>> {
    let lastError: GroqAIServiceError | GroqAIValidationError;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const items = await this.parseSingle(ocrText, context);
        return items;
      } catch (error) {
        lastError = this.normalizeError(error);
        
        if (attempt === this.config.maxRetries || !lastError.retryable) {
          throw lastError;
      }

        logger.warn("Groq AI parsing attempt failed, retrying", {
          ...context,
          attempt,
          maxRetries: this.config.maxRetries,
          error: lastError.message,
        });

        await this.delay(this.config.retryDelayMs * Math.pow(2, attempt - 1));
      }
    }

    throw lastError!;
  }

  /**
   * Parse receipt using single API call
   */
  private async parseSingle(
    ocrText: string,
    context: Record<string, any>
  ): Promise<GroqAIProcessingResult<any[]>> {
    const startTime = Date.now();

    try {
      const prompt = this.buildReceiptParsingPrompt(ocrText);
      const response = await this.callGroqAI(prompt);
      
      const items = await this.extractItemsFromResponse(response);
      
      const processingTime = Date.now() - startTime;
      return {
        success: true,
        data: items,
        processingTime,
        retryCount: 0,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const groqError = this.normalizeError(error);
      
      return {
        success: false,
        error: groqError.message,
        processingTime,
        retryCount: 0,
      };
    }
  }

  /**
   * Estimate emissions with retry mechanism
   */
  private async estimateWithRetry(
    item: ParsedFoodItem,
    context: Record<string, any>
  ): Promise<GroqAIProcessingResult<ParsedFoodItem>> {
    let lastError: GroqAIServiceError | GroqAIValidationError;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const result = await this.estimateSingle(item, context);
        return result;
      } catch (error) {
        lastError = this.normalizeError(error);
        
        if (attempt === this.config.maxRetries || !lastError.retryable) {
          throw lastError;
        }

        logger.warn("Groq AI estimation attempt failed, retrying", {
          ...context,
          attempt,
          maxRetries: this.config.maxRetries,
          error: lastError.message,
        });

        await this.delay(this.config.retryDelayMs * Math.pow(2, attempt - 1));
      }
    }

    throw lastError!;
  }

  /**
   * Estimate emissions using single API call
   */
  private async estimateSingle(
    item: ParsedFoodItem,
    context: Record<string, any>
  ): Promise<GroqAIProcessingResult<ParsedFoodItem>> {
    const startTime = Date.now();

    try {
      const prompt = this.buildEmissionsEstimationPrompt(item);
      const response = await this.callGroqAI(prompt, 10000, 200);
      
      const estimatedEmissions = this.extractEmissionsFromResponse(response);
      
      const processingTime = Date.now() - startTime;
      return {
        success: true,
        data: {
          ...item,
          carbon_emissions: estimatedEmissions * (item.quantity > 0 ? item.quantity : 1),
          confidence: 0.8,
          source: "groq_ai",
          status: "ai_estimated",
        },
        processingTime,
        retryCount: 0,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const groqError = this.normalizeError(error);
      
      return {
        success: false,
        error: groqError.message,
        processingTime,
        retryCount: 0,
      };
    }
    }

  /**
   * Extract merchant information from receipt text
   */
  private async extractMerchant(ocrText: string, context: Record<string, any>): Promise<string | undefined> {
    try {
      const prompt = `Extract the merchant/store name from this receipt text. Look for store names, business names, or retailer information. Return only the merchant name, nothing else. If no clear merchant is found, return "Unknown Merchant".

Receipt text:
${ocrText.substring(0, 500)}...`;

      const response = await this.callGroqAI(prompt, 10000, 100);
      const merchant = response.choices[0].message.content.trim();
      
      // Clean up the response
      const cleanMerchant = merchant.replace(/["']/g, '').trim();
      
      if (cleanMerchant && cleanMerchant !== "Unknown Merchant" && cleanMerchant.length > 2) {
        logger.info("Merchant extracted successfully", { ...context, merchant: cleanMerchant });
        return cleanMerchant;
      }
      
      return "Unknown Merchant";
    } catch (error) {
      logger.warn("Failed to extract merchant", {
        error: error instanceof Error ? error.message : String(error),
        ...context,
      });
      return "Unknown Merchant";
    }
  }

  /**
   * Process items with fuzzy matching, fallbacks, and emissions estimation
   */
  private async processItemsWithFallbacks(
    items: any[],
    options: { enableFuzzyMatching?: boolean; enableFallbacks?: boolean },
    context: Record<string, any>
  ): Promise<ParsedFoodItem[]> {
    const { enableFuzzyMatching = true, enableFallbacks = true } = options;
    
    const processedItems: ParsedFoodItem[] = [];
    
    for (const item of items) {
      let dbMatch: FoodDatabaseItem | null = null;
      
      if (enableFuzzyMatching) {
        dbMatch = this.matchWithDatabase(item.canonical_name || item.name);
      }

      let carbonEmissions = dbMatch 
        ? dbMatch.emissions * (item.quantity > 0 ? item.quantity : 1)
        : undefined;

      let source = dbMatch ? "dataset" : "ai_estimation";
      let confidence = dbMatch ? 1.0 : 0.7;
      let status = dbMatch ? "processed" : "ai_estimated";

      // If no database match and fallbacks are enabled, estimate emissions with Groq AI
      if (!dbMatch && enableFallbacks && item.is_food !== false) {
        try {
          const emissionsResult = await this.estimateEmissionsWithGroqAI(item, context);
          if (emissionsResult.success && emissionsResult.data) {
            carbonEmissions = emissionsResult.data.carbon_emissions;
            confidence = emissionsResult.data.confidence;
            source = "groq_ai";
            status = "ai_estimated";
        }
        } catch (error) {
          logger.warn("Failed to estimate emissions with Groq AI", {
            error: error instanceof Error ? error.message : String(error),
            ...context,
            itemName: item.name,
          });
      }
    }

      // Final fallback to default emissions if still undefined
      if (carbonEmissions === undefined && enableFallbacks) {
        carbonEmissions = 2.0 * (item.quantity > 0 ? item.quantity : 1);
        source = "fallback";
        confidence = 0.5;
        status = "fallback";
      }

      processedItems.push({
        name: item.name || "Unknown Item",
        canonical_name: dbMatch ? dbMatch.canonical : (item.canonical_name || item.name || "unknown"),
        quantity: item.quantity > 0 ? item.quantity : 1,
        total_price: item.total_price >= 0 ? item.total_price : 0,
        category: dbMatch ? dbMatch.category : (item.category || "other"),
        is_food: typeof item.is_food === "boolean" ? item.is_food : true,
        carbon_emissions: carbonEmissions,
        confidence,
        source,
        status,
      });
    }
    
    return processedItems;
  }

  /**
   * Build receipt parsing prompt
   */
  private buildReceiptParsingPrompt(ocrText: string): string {
    return `Parse this grocery receipt and extract food items. Return ONLY a JSON array of objects.

Each object should have:
- name: cleaned food item name
- quantity: number of items (default 1)
- total_price: price in dollars
- category: one of: produce, dairy, meat, bakery, snack, beverage, prepared_food, other
- is_food: true

Example output:
[
  {"name": "Milk", "quantity": 1, "total_price": 3.99, "category": "dairy", "is_food": true},
  {"name": "Bread", "quantity": 2, "total_price": 4.50, "category": "bakery", "is_food": true}
]

Receipt text:
${ocrText}`;
  }

  /**
   * Build emissions estimation prompt
   */
  private buildEmissionsEstimationPrompt(item: ParsedFoodItem): string {
    return `Estimate the carbon emissions for this food item. Return ONLY a number representing kg CO2e per kg of food, to the nearest hundredth (e.g., 2.45).

Food item: ${item.canonical_name}
Category: ${item.category}

Consider these typical emissions ranges:
- Meat products (beef, pork, lamb): 15-30 kg CO2e/kg
- Poultry (chicken, turkey): 5-10 kg CO2e/kg
- Fish and seafood: 3-8 kg CO2e/kg
- Dairy products (milk, cheese, yogurt): 1-5 kg CO2e/kg
- Eggs: 2-4 kg CO2e/kg
- Vegetables: 0.1-1 kg CO2e/kg
- Fruits: 0.1-0.5 kg CO2e/kg
- Grains and bread: 0.5-2 kg CO2e/kg
- Processed foods: 2-5 kg CO2e/kg
- Prepared foods (cooked, hot food): 3-8 kg CO2e/kg
- Beverages: 0.5-2 kg CO2e/kg
- Snacks: 1-4 kg CO2e/kg

Return only the number, no explanation or units.`;
  }

  /**
   * Call Groq AI API
   */
  private async callGroqAI(
    prompt: string, 
    timeoutMs: number = this.config.timeoutMs,
    maxTokens: number = this.config.maxTokens
  ): Promise<any> {
    if (!this.config.apiKey) {
      throw new GroqAIServiceError("Groq API key not configured", "API_KEY_MISSING");
    }

      const headers = {
      "Authorization": `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json"
      };
      
      const data = {
      "model": this.config.model,
        "messages": [
        {"role": "system", "content": "You are an expert at parsing grocery receipts and identifying food items."},
          {"role": "user", "content": prompt}
        ],
      "temperature": this.config.temperature,
      "max_tokens": maxTokens
      };
      
    const response = await fetch(this.config.baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
      const errorText = await response.text();
      throw this.createServiceError(response.status, errorText);
      }

    const groqOutput = await response.json();
    saveGroqDebug(prompt, JSON.stringify(groqOutput), 'parse');
    return groqOutput;
  }

  /**
   * Extract items from Groq AI response
   */
  private async extractItemsFromResponse(response: any): Promise<any[]> {
    const rawContent = response.choices[0].message.content.trim();
    logger.debug("Groq AI raw response", { rawContent });

    try {
      // Try to find JSON array in the response
      const jsonStart = rawContent.indexOf('[');
      const jsonEnd = rawContent.lastIndexOf(']');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        const jsonStr = rawContent.substring(jsonStart, jsonEnd + 1);
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      
      // Try to find JSON object if array not found
      const objStart = rawContent.indexOf('{');
      const objEnd = rawContent.lastIndexOf('}');
      
      if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
        const jsonStr = rawContent.substring(objStart, objEnd + 1);
        const parsed = JSON.parse(jsonStr);
        if (parsed.items && Array.isArray(parsed.items)) {
          return parsed.items;
        }
        if (parsed.name) {
          return [parsed];
        }
      }
      
      // Try to extract items from text format
      const lines = rawContent.split('\n').filter(line => line.trim().length > 0);
      const items: any[] = [];
      
      for (const line of lines) {
        // Look for patterns like "name: value" or "name - value"
        const nameMatch = line.match(/([^:]+):\s*(.+)/);
        if (nameMatch) {
          const name = nameMatch[1].trim();
          const value = nameMatch[2].trim();
          
          if (name.toLowerCase().includes('name') && value.length > 0) {
            items.push({
              name: value,
              quantity: 1,
              total_price: 0,
              category: 'other',
              is_food: true
            });
          }
        }
      }
      
      if (items.length > 0) {
        return items;
      }
      
      throw new Error("No valid items found in Groq AI response");
    } catch (error) {
      logger.error("Failed to parse Groq AI JSON", error instanceof Error ? error : new Error(String(error)), { rawContent });
      
      // Fallback: try with simpler prompt
      return await this.extractItemsWithFallback(rawContent);
    }
  }

  /**
   * Extract items with fallback method
   */
  private async extractItemsWithFallback(rawContent: string): Promise<any[]> {
    const fallbackPrompt = `Extract a JSON array of food items from this receipt OCR text. Each item should have: name, quantity (default 1), total_price (default 0), category (guess), is_food (true/false). Ignore non-food items.`;
    
    try {
      const fallbackResponse = await this.callGroqAI(fallbackPrompt);
      const fallbackRaw = fallbackResponse.choices[0].message.content.trim();
      logger.debug("Groq AI fallback response", { fallbackRaw });
      
      const fallbackStart = fallbackRaw.indexOf('[');
      const fallbackEnd = fallbackRaw.lastIndexOf(']');
      
      if (fallbackStart !== -1 && fallbackEnd !== -1 && fallbackEnd > fallbackStart) {
        return JSON.parse(fallbackRaw.substring(fallbackStart, fallbackEnd + 1));
      } else {
        throw new Error("No JSON array found in fallback Groq AI response");
      }
    } catch (fallbackError) {
      logger.error("Groq AI fallback failed", fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)));
      throw fallbackError;
    }
  }

  /**
   * Extract emissions from Groq AI response
   */
  private extractEmissionsFromResponse(response: any): number {
    const rawContent = response.choices[0].message.content.trim();
    const numberMatch = rawContent.match(/\d+(?:\.\d+)?/);
    return numberMatch ? parseFloat(numberMatch[0]) : 2.0;
  }

  /**
   * Create service error from HTTP response
   */
  private createServiceError(statusCode: number, errorText: string): GroqAIServiceError {
    const isRetryable = statusCode >= 500 || statusCode === 429;
    
    switch (statusCode) {
      case 400:
        return new GroqAIServiceError("Invalid request to Groq AI API", "INVALID_REQUEST", statusCode);
      case 401:
        return new GroqAIServiceError("Invalid Groq AI API key", "INVALID_API_KEY", statusCode);
      case 429:
        return new GroqAIServiceError("Groq AI API rate limit exceeded", "RATE_LIMITED", statusCode, true);
      case 503:
        return new GroqAIServiceError("Groq AI service temporarily unavailable", "SERVICE_UNAVAILABLE", statusCode, true);
      default:
        return new GroqAIServiceError(
          `Groq AI API error: ${statusCode} ${errorText}`,
          "API_ERROR",
          statusCode,
          isRetryable
        );
    }
  }

  /**
   * Normalize error to GroqAIServiceError
   */
  private normalizeError(error: unknown): GroqAIServiceError {
    if (error instanceof GroqAIServiceError || error instanceof GroqAIValidationError) {
      return error;
    }

    if (error instanceof z.ZodError) {
      return new GroqAIValidationError(
        `Invalid Groq AI response format: ${error.errors.map(e => e.message).join(", ")}`,
        "VALIDATION_ERROR"
      );
    }

    if (error instanceof Error) {
      return new GroqAIServiceError(error.message, "UNKNOWN_ERROR");
    }

    return new GroqAIServiceError(String(error), "UNKNOWN_ERROR");
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance for backward compatibility
export const groqAIService = new GroqAIService(); 