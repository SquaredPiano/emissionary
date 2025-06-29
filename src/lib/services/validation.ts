import { logger } from "@/lib/logger";

export interface TextValidationResult {
  isValid: boolean;
  score: number; // 0-10
  issues: string[];
}

export interface ItemValidationResult {
  isValid: boolean;
  warnings: string[];
}

export class ValidationService {
  /**
   * Validate OCR text quality and content
   */
  static validateOCRText(text: string): TextValidationResult {
    const issues: string[] = [];
    let score = 10;

    // Check text length
    if (!text || text.trim().length < 10) {
      issues.push("Text too short");
      score -= 5;
    }

    // Check for common OCR artifacts
    const hasNumbers = /\d/.test(text);
    const hasPrices = /\$\d+\.\d{2}/.test(text);
    const hasCommonWords = /(total|subtotal|tax|receipt|store|item)/i.test(text);

    if (!hasNumbers) {
      issues.push("No numbers found");
      score -= 2;
    }

    if (!hasPrices) {
      issues.push("No prices found");
      score -= 2;
    }

    if (!hasCommonWords) {
      issues.push("No receipt-related words found");
      score -= 1;
    }

    // Check for excessive special characters (OCR artifacts)
    const specialCharRatio = (text.match(/[^a-zA-Z0-9\s\.\,\$]/g) || []).length / text.length;
    if (specialCharRatio > 0.3) {
      issues.push("High number of special characters");
      score -= 2;
    }

    // Ensure score is within bounds
    score = Math.max(0, Math.min(10, score));

    return {
      isValid: score >= 3,
      score,
      issues,
    };
  }

  /**
   * Validate processed items
   */
  static validateProcessedItems(items: any[]): ItemValidationResult {
    const warnings: string[] = [];

    if (!items || items.length === 0) {
      warnings.push("No items found");
      return { isValid: false, warnings };
    }

    let validItems = 0;
    let totalEmissions = 0;

    for (const item of items) {
      // Check required fields
      if (!item.name || item.name.trim().length === 0) {
        warnings.push(`Item missing name`);
        continue;
      }

      if (!item.quantity || item.quantity <= 0) {
        warnings.push(`Item "${item.name}" has invalid quantity: ${item.quantity}`);
        continue;
      }

      if (item.carbon_emissions === undefined || item.carbon_emissions < 0) {
        warnings.push(`Item "${item.name}" has invalid emissions: ${item.carbon_emissions}`);
        continue;
      }

      validItems++;
      totalEmissions += item.carbon_emissions;
    }

    // Check overall validity
    if (validItems === 0) {
      warnings.push("No valid items found");
      return { isValid: false, warnings };
    }

    if (validItems < items.length) {
      warnings.push(`${items.length - validItems} items were filtered out due to invalid data`);
    }

    // Check for reasonable emissions range
    if (totalEmissions > 100) {
      warnings.push("Total emissions seem unusually high - please verify");
    }

    if (totalEmissions === 0) {
      warnings.push("No emissions calculated - please check data");
    }

    return {
      isValid: validItems > 0,
      warnings,
    };
  }

  /**
   * Validate receipt metadata
   */
  static validateReceiptMetadata(metadata: any): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    // Check merchant
    if (!metadata.merchant || metadata.merchant.trim().length === 0) {
      warnings.push("No merchant information found");
    }

    // Check total amount
    if (metadata.total !== undefined) {
      if (metadata.total <= 0) {
        warnings.push("Invalid total amount");
      } else if (metadata.total > 10000) {
        warnings.push("Total amount seems unusually high");
      }
    }

    // Check date
    if (metadata.date) {
      const date = new Date(metadata.date);
      if (isNaN(date.getTime())) {
        warnings.push("Invalid date format");
      } else if (date > new Date()) {
        warnings.push("Receipt date is in the future");
      }
    }

    return {
      isValid: warnings.length === 0,
      warnings,
    };
  }
} 