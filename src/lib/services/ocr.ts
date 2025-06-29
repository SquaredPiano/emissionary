import { OCRResponseSchema, type OCRResponse, type OCRItem } from "@/lib/schemas";
import { logger } from "@/lib/logger";
import { z } from "zod";

export class OCRService {
  private static readonly OCR_SERVICE_URL = process.env.OCR_SERVICE_URL || "http://127.0.0.1:8000";
  private static readonly TIMEOUT_MS = 30000; // 30 seconds

  /**
   * Process receipt image through OCR service
   */
  static async processReceiptImage(
    imageBuffer: Buffer,
    imageType: string,
    userId?: string
  ): Promise<OCRResponse> {
    try {
      // Validate image type
      if (!imageType.startsWith("image/") && imageType !== "application/pdf") {
        throw new Error("Invalid file type. Only images and PDFs are supported.");
      }

      // Validate image buffer
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error("Empty image buffer provided.");
      }

      // Check OCR service health first
      const isHealthy = await this.checkHealth();
      if (!isHealthy) {
        throw new Error("OCR service is not available. Please try again later.");
      }

      // Convert to base64
      const base64Image = imageBuffer.toString("base64");

      // Prepare request payload
      const payload = {
        image: base64Image,
        image_type: imageType,
      };

      logger.info("Processing receipt through OCR service", { userId, imageType, bufferSize: imageBuffer.length });

      // Call OCR service
      const response = await fetch(`${this.OCR_SERVICE_URL}/ocr`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.TIMEOUT_MS),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("OCR service error", new Error(`${response.status}: ${errorText}`), { userId, status: response.status });
        
        if (response.status === 413) {
          throw new Error("Image file too large. Please use a smaller image (max 10MB).");
        } else if (response.status === 400) {
          throw new Error("Invalid image format. Please check your file.");
        } else if (response.status === 503) {
          throw new Error("OCR service temporarily unavailable. Please try again later.");
        } else if (response.status === 404) {
          throw new Error("OCR service endpoint not found. Please check service configuration.");
        } else {
          throw new Error(`OCR processing failed: ${response.status} ${response.statusText}`);
        }
      }

      const ocrResult = await response.json();

      // Validate OCR response
      const validatedResult = OCRResponseSchema.parse(ocrResult);

      // Additional validation for business logic
      if (!validatedResult.success) {
        throw new Error(validatedResult.error_message || "OCR processing failed");
      }

      logger.info("OCR processing completed successfully", { 
        userId, 
        itemsCount: validatedResult.items?.length || 0,
        processingTime: validatedResult.processing_time,
        totalCarbonEmissions: validatedResult.total_carbon_emissions,
      });

      return validatedResult;
    } catch (error) {
      logger.error("OCR service error", error instanceof Error ? error : new Error(String(error)), { userId });
      
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid OCR response format: ${error.errors.map(e => e.message).join(", ")}`);
      }
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error("OCR processing failed");
    }
  }

  /**
   * Process receipt image using upload endpoint (alternative method)
   */
  static async processReceiptImageUpload(
    imageBuffer: Buffer,
    imageType: string,
    fileName: string,
    userId?: string
  ): Promise<OCRResponse> {
    try {
      // Validate file type
      if (!imageType.startsWith("image/") && imageType !== "application/pdf") {
        throw new Error("Invalid file type. Only images and PDFs are supported.");
      }

      // Create FormData
      const formData = new FormData();
      const blob = new Blob([imageBuffer], { type: imageType });
      formData.append("file", blob, fileName);

      // Call OCR service upload endpoint
      const response = await fetch(`${this.OCR_SERVICE_URL}/upload`, {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(this.TIMEOUT_MS),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("OCR upload service error", new Error(`${response.status}: ${errorText}`), { userId, status: response.status });
        
        if (response.status === 413) {
          throw new Error("Image file too large. Please use a smaller image.");
        } else if (response.status === 400) {
          throw new Error("Invalid image format. Please check your file.");
        } else if (response.status === 503) {
          throw new Error("OCR service temporarily unavailable. Please try again later.");
        } else {
          throw new Error(`OCR processing failed: ${response.status} ${response.statusText}`);
        }
      }

      const ocrResult = await response.json();

      // Validate OCR response
      const validatedResult = OCRResponseSchema.parse(ocrResult);

      // Additional validation for business logic
      if (!validatedResult.success) {
        throw new Error(validatedResult.error_message || "OCR processing failed");
      }

      return validatedResult;
    } catch (error) {
      logger.error("OCR upload service error", error instanceof Error ? error : new Error(String(error)), { userId });
      
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid OCR response format: ${error.errors.map(e => e.message).join(", ")}`);
      }
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error("OCR processing failed");
    }
  }

  /**
   * Check OCR service health
   */
  static async checkHealth(): Promise<boolean> {
    try {
      logger.info("Checking OCR service health", { url: this.OCR_SERVICE_URL });
      
      const response = await fetch(`${this.OCR_SERVICE_URL}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(5000), // 5 second timeout for health check
      });

      logger.info("OCR health check response", { 
        status: response.status, 
        ok: response.ok,
        url: this.OCR_SERVICE_URL 
      });

      if (!response.ok) {
        const error = new Error(`OCR health check failed: ${response.status} ${response.statusText}`);
        logger.error("OCR health check failed", error, { 
          status: response.status, 
          statusText: response.statusText,
          url: this.OCR_SERVICE_URL 
        });
        return false;
      }

      const healthData = await response.json();
      logger.info("OCR health check successful", { healthData });
      
      return healthData.status === "healthy";
    } catch (error) {
      logger.error("OCR health check error", error instanceof Error ? error : new Error(String(error)), { 
        url: this.OCR_SERVICE_URL 
      });
      return false;
    }
  }

  /**
   * Transform OCR items to receipt items format
   */
  static transformOCRItemsToReceiptItems(ocrItems: OCRItem[]) {
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
  static calculateTotalEmissions(ocrItems: OCRItem[]): number {
    return ocrItems.reduce((total, item) => {
      return total + (item.carbon_emissions || 0);
    }, 0);
  }

  /**
   * Create emissions breakdown by category
   */
  static createEmissionsBreakdown(ocrItems: OCRItem[]) {
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
  static validateOCRResults(ocrResponse: OCRResponse): OCRResponse {
    // Ensure all required fields are present
    if (!ocrResponse.success) {
      throw new Error(ocrResponse.error_message || "OCR processing failed");
    }

    // Validate items if present
    if (ocrResponse.items) {
      ocrResponse.items = ocrResponse.items.filter(item => 
        item.name && item.name.trim().length > 0
      );
    }

    return ocrResponse;
  }
} 