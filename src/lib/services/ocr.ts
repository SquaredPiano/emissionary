import { OCRResponseSchema, type OCRResponse, type OCRItem } from "@/lib/schemas";
import { logger } from "@/lib/logger";
import { z } from "zod";
import fs from 'fs';
import path from 'path';

/**
 * OCR Service Configuration Interface
 */
export interface OCRServiceConfig {
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly maxRetries: number;
  readonly retryDelayMs: number;
  readonly healthCheckTimeoutMs: number;
  readonly maxFileSizeBytes: number;
  readonly allowedMimeTypes: readonly string[];
}

/**
 * OCR Processing Options
 */
export interface OCRProcessingOptions {
  readonly userId?: string;
  readonly requestId?: string;
  readonly enableRetries?: boolean;
  readonly validateHealth?: boolean;
}

/**
 * OCR Service Response Types
 */
export interface OCRHealthResponse {
  readonly status: 'healthy' | 'unhealthy';
  readonly timestamp: string;
  readonly version?: string;
  readonly uptime?: number;
}

export interface OCRProcessingResult {
  readonly success: boolean;
  readonly data?: OCRResponse;
  readonly error?: Error;
  readonly processingTime: number;
  readonly retryCount: number;
}

/**
 * Custom OCR Service Errors
 */
export class OCRServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'OCRServiceError';
  }
}

export class OCRValidationError extends OCRServiceError {
  constructor(message: string, public readonly field?: string) {
    super(message, "VALIDATION_ERROR", undefined, false);
    this.name = 'OCRValidationError';
  }
}

const DEBUG_DIR = path.join(process.cwd(), 'ocr-debug-outputs');
if (!fs.existsSync(DEBUG_DIR)) fs.mkdirSync(DEBUG_DIR);

function saveDebugOutput(imageBuffer: Buffer, text: string, method: string, config: string, imageName: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = path.parse(imageName).name;
  const imgPath = path.join(DEBUG_DIR, `${base}_${method}_${config}_${timestamp}.png`);
  const txtPath = path.join(DEBUG_DIR, `${base}_${method}_${config}_${timestamp}.txt`);
  fs.writeFileSync(imgPath, imageBuffer);
  fs.writeFileSync(txtPath, text);
}

/**
 * OCR Service Implementation
 * 
 * Provides OCR processing capabilities with robust error handling,
 * retry mechanisms, and comprehensive monitoring.
 */
export class OCRService {
  private static readonly DEFAULT_CONFIG: OCRServiceConfig = {
    baseUrl: process.env.OCR_SERVICE_URL || "http://127.0.0.1:8000",
    timeoutMs: 30000,
    maxRetries: 3,
    retryDelayMs: 1000,
    healthCheckTimeoutMs: 5000,
    maxFileSizeBytes: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'application/pdf'
    ] as const,
  };

  private readonly config: OCRServiceConfig;

  constructor(config?: Partial<OCRServiceConfig>) {
    this.config = { ...OCRService.DEFAULT_CONFIG, ...config };
  }

  /**
   * Process receipt image through OCR service with comprehensive error handling
   */
  public async processReceiptImage(
    imageBuffer: Buffer,
    imageType: string,
    options: OCRProcessingOptions = {}
  ): Promise<OCRProcessingResult> {
    const startTime = Date.now();
    const { userId, requestId, enableRetries = true, validateHealth = true } = options;
    
    const context = { userId, requestId, imageType, bufferSize: imageBuffer.length };

    try {
      logger.info("Starting OCR processing", context);

      // Validate inputs
      this.validateImageInput(imageBuffer, imageType);

      // Check service health if enabled
      if (validateHealth) {
        await this.ensureServiceHealth();
      }

      // Process with retry mechanism
      const result = enableRetries 
        ? await this.processWithRetry(imageBuffer, imageType, context)
        : await this.processSingle(imageBuffer, imageType, context);

      const processingTime = Date.now() - startTime;

      logger.info("OCR processing completed successfully", { 
        ...context,
        processingTime,
        itemsCount: result.items?.length || 0,
        totalEmissions: result.total_carbon_emissions || 0,
      });

      return {
        success: true,
        data: result,
        processingTime,
        retryCount: enableRetries ? 0 : 0,
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const ocrError = this.normalizeError(error);
      
      logger.error("OCR processing failed", ocrError, {
        ...context,
        processingTime,
        errorCode: ocrError.code,
        retryable: ocrError.retryable,
      });

      return {
        success: false,
        error: ocrError,
        processingTime,
        retryCount: 0,
      };
    }
  }

  /**
   * Process receipt image using upload endpoint
   */
  public async processReceiptImageUpload(
    imageBuffer: Buffer,
    imageType: string,
    fileName: string,
    options: OCRProcessingOptions = {}
  ): Promise<OCRProcessingResult> {
    const startTime = Date.now();
    const { userId, requestId, enableRetries = true, validateHealth = true } = options;
    
    const context = { userId, requestId, imageType, fileName, bufferSize: imageBuffer.length };

    try {
      logger.info("Starting OCR upload processing", context);

      // Validate inputs
      this.validateImageInput(imageBuffer, imageType);

      // Check service health if enabled
      if (validateHealth) {
        await this.ensureServiceHealth();
      }

      // Process with retry mechanism
      const result = enableRetries 
        ? await this.processUploadWithRetry(imageBuffer, imageType, fileName, context)
        : await this.processUploadSingle(imageBuffer, imageType, fileName, context);

      const processingTime = Date.now() - startTime;
      
      logger.info("OCR upload processing completed successfully", {
        ...context,
        processingTime,
        itemsCount: result.items?.length || 0,
      });

      return {
        success: true,
        data: result,
        processingTime,
        retryCount: enableRetries ? 0 : 0,
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const ocrError = this.normalizeError(error);
      
      logger.error("OCR upload processing failed", ocrError, {
        ...context,
        processingTime,
        errorCode: ocrError.code,
      });

      return {
        success: false,
        error: ocrError,
        processingTime,
        retryCount: 0,
      };
    }
  }

  /**
   * Check OCR service health with timeout
   */
  public async checkHealth(): Promise<OCRHealthResponse> {
    const context = { url: this.config.baseUrl };
    
    try {
      logger.debug("Checking OCR service health", context);
      
      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(this.config.healthCheckTimeoutMs),
      });

      if (!response.ok) {
        throw new OCRServiceError(
          `Health check failed: ${response.status} ${response.statusText}`,
          'HEALTH_CHECK_FAILED',
          response.status
        );
      }

      const healthData = await response.json();
      logger.debug("OCR health check successful", { ...context, healthData });
      
      return healthData as OCRHealthResponse;
    } catch (error) {
      const ocrError = this.normalizeError(error);
      logger.error("OCR health check error", ocrError, context);
      throw ocrError;
    }
  }

  /**
   * Transform OCR items to receipt items format
   */
  public static transformOCRItemsToReceiptItems(ocrItems: OCRItem[]) {
    return ocrItems.map(item => ({
      name: item.name,
      quantity: item.quantity || 1,
      unitPrice: item.unit_price || 0,
      totalPrice: item.total_price || 0,
      category: item.category || 'processed',
      brand: undefined,
      barcode: undefined,
      description: undefined,
      carbonEmissions: item.carbon_emissions || 0,
      confidence: item.confidence || 0.8,
    }));
  }

  /**
   * Calculate total emissions from OCR items
   */
  public static calculateTotalEmissions(ocrItems: OCRItem[]): number {
    return ocrItems.reduce((total, item) => {
      return total + (item.carbon_emissions || 0);
    }, 0);
  }

  /**
   * Create emissions breakdown by category
   */
  public static createEmissionsBreakdown(ocrItems: OCRItem[]) {
    const breakdown: Record<string, { count: number; totalEmissions: number; items: string[] }> = {};
    
    ocrItems.forEach(item => {
      const category = item.category || 'Unknown';
      const emissions = item.carbon_emissions || 0;
      
      if (!breakdown[category]) {
        breakdown[category] = { count: 0, totalEmissions: 0, items: [] };
      }
      
      breakdown[category].count += 1;
      breakdown[category].totalEmissions += emissions;
      breakdown[category].items.push(item.name);
    });
    
    return breakdown;
  }

  /**
   * Validate OCR results
   */
  public static validateOCRResults(ocrResponse: OCRResponse): OCRResponse {
    if (!ocrResponse.success) {
      throw new OCRValidationError(ocrResponse.error_message || "OCR processing failed");
    }

    if (ocrResponse.items) {
      ocrResponse.items = ocrResponse.items.filter(item => 
        item.name && item.name.trim().length > 0
      );
    }

    return ocrResponse;
  }

  // Private helper methods

  /**
   * Validate image input parameters
   */
  private validateImageInput(imageBuffer: Buffer, imageType: string): void {
    if (!imageBuffer || imageBuffer.length === 0) {
      throw new OCRValidationError("Empty image buffer provided", "imageBuffer");
    }

    if (imageBuffer.length > this.config.maxFileSizeBytes) {
      throw new OCRValidationError(
        `Image file too large. Maximum size is ${this.config.maxFileSizeBytes / (1024 * 1024)}MB`,
        "imageBuffer"
      );
    }

    if (!this.config.allowedMimeTypes.includes(imageType as any)) {
      throw new OCRValidationError(
        `Invalid file type. Allowed types: ${this.config.allowedMimeTypes.join(", ")}`,
        "imageType"
      );
    }
  }

  /**
   * Ensure OCR service is healthy
   */
  private async ensureServiceHealth(): Promise<void> {
    const healthResponse = await this.checkHealth();
    if (healthResponse.status !== 'healthy') {
      throw new OCRServiceError(
        "OCR service is not healthy",
        'SERVICE_UNHEALTHY',
        503,
        true
      );
    }
  }

  /**
   * Process image with retry mechanism
   */
  private async processWithRetry(
    imageBuffer: Buffer,
    imageType: string,
    context: Record<string, any>
  ): Promise<OCRResponse> {
    let lastError: OCRServiceError | OCRValidationError;
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await this.processSingle(imageBuffer, imageType, context);
      } catch (error) {
        lastError = this.normalizeError(error);
        
        if (attempt === this.config.maxRetries || !this.isRetryableError(lastError)) {
          throw lastError;
        }

        logger.warn("OCR processing attempt failed, retrying", {
          ...context,
          attempt: attempt + 1,
          maxRetries: this.config.maxRetries,
          error: lastError.message,
        });

        await this.delay(this.config.retryDelayMs * Math.pow(2, attempt));
      }
    }

    throw lastError!;
  }

  /**
   * Process image upload with retry mechanism
   */
  private async processUploadWithRetry(
    imageBuffer: Buffer,
    imageType: string,
    fileName: string,
    context: Record<string, any>
  ): Promise<OCRResponse> {
    let lastError: OCRServiceError | OCRValidationError;
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await this.processUploadSingle(imageBuffer, imageType, fileName, context);
      } catch (error) {
        lastError = this.normalizeError(error);
        
        if (attempt === this.config.maxRetries || !this.isRetryableError(lastError)) {
          throw lastError;
        }

        logger.warn("OCR upload processing attempt failed, retrying", {
          ...context,
          attempt: attempt + 1,
          maxRetries: this.config.maxRetries,
          error: lastError.message,
        });

        await this.delay(this.config.retryDelayMs * Math.pow(2, attempt));
      }
    }

    throw lastError!;
  }

  /**
   * Process image using base64 endpoint
   */
  private async processSingle(
    imageBuffer: Buffer,
    imageType: string,
    context: Record<string, any>
  ): Promise<OCRResponse> {
    const base64Image = imageBuffer.toString("base64");
    const payload = {
      image: base64Image,
      image_type: imageType,
    };

    const response = await fetch(`${this.config.baseUrl}/ocr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });

    return this.handleOCRResponse(response, context);
  }

  /**
   * Process image using upload endpoint
   */
  private async processUploadSingle(
    imageBuffer: Buffer,
    imageType: string,
    fileName: string,
    context: Record<string, any>
  ): Promise<OCRResponse> {
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: imageType });
    formData.append("file", blob, fileName);

    const response = await fetch(`${this.config.baseUrl}/upload`, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });

    return this.handleOCRResponse(response, context);
  }

  /**
   * Handle OCR service response
   */
  private async handleOCRResponse(
    response: Response,
    context: Record<string, any>
  ): Promise<OCRResponse> {
    if (!response.ok) {
      const errorText = await response.text();
      throw this.createServiceError(response.status, errorText);
    }

    const ocrResult = await response.json();
    const transformedResult = this.transformPythonResponse(ocrResult);
    const validatedResult = OCRResponseSchema.parse(transformedResult);

    if (!validatedResult.success) {
      throw new OCRValidationError(validatedResult.error_message || "OCR processing failed");
    }

    return validatedResult;
  }

  /**
   * Transform Python service response to match our schema
   */
  private transformPythonResponse(pythonResponse: any): OCRResponse {
    const items = (pythonResponse.items || []).map((item: any) => ({
      name: item.name || "",
      quantity: item.quantity || 1.0,
      unit_price: item.unit_price || null,
      total_price: item.total_price || null,
      category: item.category || "processed",
      subcategory: "",
      brand: "",
      carbon_emissions: item.carbon_emissions || 0,
      confidence: item.confidence || 1.0,
      estimated_weight_kg: null,
      source: "ocr",
    }));

    return {
      success: pythonResponse.success ?? true,
      text: pythonResponse.text || "",
      confidence: pythonResponse.confidence || 0.8,
      items: items,
      merchant: pythonResponse.merchant || "Unknown Merchant",
      total: pythonResponse.total || null,
      date: pythonResponse.date || null,
      total_carbon_emissions: pythonResponse.total_carbon_emissions || 0,
      processing_time: pythonResponse.processing_time || 0,
      error_message: pythonResponse.error || null,
      raw_ocr_data: [],
    };
  }

  /**
   * Create service error from HTTP response
   */
  private createServiceError(statusCode: number, errorText: string): OCRServiceError {
    const isRetryable = statusCode >= 500 || statusCode === 429;
    
    switch (statusCode) {
      case 400:
        return new OCRServiceError("Invalid image format. Please check your file.", "INVALID_FORMAT", statusCode);
      case 413:
        return new OCRServiceError("Image file too large. Please use a smaller image.", "FILE_TOO_LARGE", statusCode);
      case 429:
        return new OCRServiceError("OCR service rate limit exceeded. Please try again later.", "RATE_LIMITED", statusCode, true);
      case 503:
        return new OCRServiceError("OCR service temporarily unavailable. Please try again later.", "SERVICE_UNAVAILABLE", statusCode, true);
      case 404:
        return new OCRServiceError("OCR service endpoint not found.", "ENDPOINT_NOT_FOUND", statusCode);
      default:
        return new OCRServiceError(
          `OCR processing failed: ${statusCode} ${errorText}`,
          "PROCESSING_FAILED",
          statusCode,
          isRetryable
        );
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: OCRServiceError | OCRValidationError): boolean {
    if (error instanceof OCRServiceError) {
      return error.retryable;
    }
    // OCRValidationError is never retryable
    return false;
  }

  /**
   * Normalize error to OCRServiceError or OCRValidationError
   */
  private normalizeError(error: unknown): OCRServiceError | OCRValidationError {
    if (error instanceof OCRServiceError || error instanceof OCRValidationError) {
      return error;
    }

    if (error instanceof z.ZodError) {
      return new OCRValidationError(
        `Invalid OCR response format: ${error.errors.map(e => e.message).join(", ")}`,
        "VALIDATION_ERROR"
      );
    }

    if (error instanceof Error) {
      return new OCRServiceError(error.message, "UNKNOWN_ERROR");
    }

    return new OCRServiceError(String(error), "UNKNOWN_ERROR");
  }

  /**
   * Delay execution for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance for backward compatibility
export const ocrService = new OCRService(); 