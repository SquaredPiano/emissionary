import { OCRResponseSchema, type OCRResponse, type OCRItem } from "@/lib/schemas";
import { logger } from "@/lib/logger";
import { z } from "zod";

export class OCRService {
  private static readonly OCR_SERVICE_URL = process.env.OCR_SERVICE_URL || "http://10.17.95.232:8000";
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

      // Convert to base64
      const base64Image = imageBuffer.toString("base64");

      // Prepare request payload
      const payload = {
        image: base64Image,
        image_type: imageType,
        user_id: userId,
      };

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

      if (validatedResult.confidence < 0.1) {
        logger.warn("Low OCR confidence", { userId, confidence: validatedResult.confidence });
      }

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
      const response = await fetch(`${this.OCR_SERVICE_URL}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(5000), // 5 second timeout for health check
      });

      if (!response.ok) {
        return false;
      }

      const healthData = await response.json();
      return healthData.status === "healthy";
    } catch (error) {
      logger.error("OCR health check failed", error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Transform OCR items to database format
   */
  static transformOCRItemsToReceiptItems(ocrItems: OCRItem[]) {
    return ocrItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice || 0,
      totalPrice: item.totalPrice || item.quantity * (item.unitPrice || 0),
      category: item.category || "unknown",
      brand: item.brand,
      description: item.name, // Use name as description for now
    }));
  }

  /**
   * Calculate total emissions from OCR items
   */
  static calculateTotalEmissions(ocrItems: OCRItem[]): number {
    return ocrItems.reduce((total, item) => {
      return total + (item.carbonEmissions || 0);
    }, 0);
  }

  /**
   * Create emissions breakdown by category
   */
  static createEmissionsBreakdown(ocrItems: OCRItem[]) {
    const breakdown: Record<string, number> = {};
    
    ocrItems.forEach((item) => {
      const category = item.category || "unknown";
      const emissions = item.carbonEmissions || 0;
      
      if (breakdown[category]) {
        breakdown[category] += emissions;
      } else {
        breakdown[category] = emissions;
      }
    });
    
    return breakdown;
  }

  /**
   * Validate and clean OCR results
   */
  static validateOCRResults(ocrResponse: OCRResponse): OCRResponse {
    // Ensure items have required fields
    if (ocrResponse.items) {
      ocrResponse.items = ocrResponse.items.filter((item) => {
        return item.name && item.name.trim().length > 0 && item.quantity > 0;
      });
    }

    // Ensure total is positive
    if (ocrResponse.total && ocrResponse.total < 0) {
      ocrResponse.total = 0;
    }

    // Ensure total emissions is positive
    if (ocrResponse.total_carbon_emissions && ocrResponse.total_carbon_emissions < 0) {
      ocrResponse.total_carbon_emissions = 0;
    }

    return ocrResponse;
  }
} 