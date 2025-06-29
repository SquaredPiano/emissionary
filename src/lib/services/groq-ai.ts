import { logger } from "@/lib/logger";
import { z } from "zod";

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

      // Process items with fuzzy matching and fallbacks
      const processedItems = await this.processItemsWithFallbacks(
        result.data || [],
        { enableFuzzyMatching, enableFallbacks },
        context
      );

      const processingTime = Date.now() - startTime;

      logger.info("Groq AI receipt parsing completed successfully", {
        ...context,
        itemsCount: processedItems.length,
        processingTime,
        retryCount: result.retryCount,
      });

      return {
        success: true,
        data: {
          items: processedItems,
          merchant: undefined,
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
      const response = await this.callGroqAI(prompt, 10000, 50);
      
      const estimatedEmissions = this.extractEmissionsFromResponse(response);
      
      const processingTime = Date.now() - startTime;
      return {
        success: true,
        data: {
          ...item,
          carbon_emissions: estimatedEmissions * item.quantity,
          confidence: 0.7,
          source: "groq_ai",
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
   * Process items with fuzzy matching and fallbacks
   */
  private async processItemsWithFallbacks(
    items: any[],
    options: { enableFuzzyMatching?: boolean; enableFallbacks?: boolean },
    context: Record<string, any>
  ): Promise<ParsedFoodItem[]> {
    const { enableFuzzyMatching = true, enableFallbacks = true } = options;
    
    return items.map((item) => {
      let dbMatch: FoodDatabaseItem | null = null;
      
      if (enableFuzzyMatching) {
        dbMatch = this.matchWithDatabase(item.canonical_name || item.name);
      }

      return {
        name: item.name || "Unknown Item",
        canonical_name: dbMatch ? dbMatch.canonical : (item.canonical_name || item.name || "unknown"),
        quantity: item.quantity > 0 ? item.quantity : 1,
        total_price: item.total_price >= 0 ? item.total_price : 0,
        category: dbMatch ? dbMatch.category : (item.category || "unknown"),
        is_food: typeof item.is_food === "boolean" ? item.is_food : true,
        carbon_emissions: dbMatch 
          ? dbMatch.emissions * (item.quantity > 0 ? item.quantity : 1)
          : (enableFallbacks ? 2.0 * (item.quantity > 0 ? item.quantity : 1) : undefined),
        confidence: dbMatch ? 1.0 : 0.7,
        source: dbMatch ? "dataset" : "ai_estimation",
      };
    });
  }

  /**
   * Build receipt parsing prompt
   */
  private buildReceiptParsingPrompt(ocrText: string): string {
    return `
You are an expert at parsing grocery receipts. Given the following OCR text from a real grocery receipt, extract a JSON array of food items. 
- Each item should have: name (as on receipt), canonical_name (standardized), quantity (default 1 if missing), total_price (default 0 if missing), category (guess if missing), is_food (true/false).
- Ignore non-food items, totals, taxes, payment info, etc.
- Be forgiving of typos, abbreviations, and OCR errors.
- If unsure, make your best guess.
- Return ONLY a JSON array of items, no explanations.

OCR text:
${ocrText}
`;
  }

  /**
   * Build emissions estimation prompt
   */
  private buildEmissionsEstimationPrompt(item: ParsedFoodItem): string {
    return `Estimate the carbon emissions for this food item. Return only a number representing kg CO2e per kg of food.

Food item: ${item.canonical_name}
Category: ${item.category}

Consider:
- Meat products: 10-30 kg CO2e/kg
- Dairy products: 1-5 kg CO2e/kg
- Vegetables: 0.1-1 kg CO2e/kg
- Processed foods: 2-5 kg CO2e/kg
- Grains: 0.5-2 kg CO2e/kg

Return only the number, no explanation.`;
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

    return await response.json();
  }

  /**
   * Extract items from Groq AI response
   */
  private async extractItemsFromResponse(response: any): Promise<any[]> {
    const rawContent = response.choices[0].message.content.trim();
    logger.debug("Groq AI raw response", { rawContent });

    try {
      const jsonStart = rawContent.indexOf('[');
      const jsonEnd = rawContent.lastIndexOf(']');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        return JSON.parse(rawContent.substring(jsonStart, jsonEnd + 1));
      } else {
        throw new Error("No JSON array found in Groq AI response");
      }
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