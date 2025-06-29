// Database types for the Emissionary application
// Re-export Prisma types for convenience

import type { User, Receipt, ReceiptItem, EmissionsLog } from '../../generated/prisma';

export type { User, Receipt, ReceiptItem, EmissionsLog };

// Extended types for API responses and dashboard data
export interface EmissionsBreakdown {
  categories: {
    [category: string]: {
      co2: number;
      percentage: number;
      items: string[];
    };
  };
  totalItems: number;
  averageCO2PerItem: number;
}

export interface ReceiptWithItems extends Receipt {
  receiptItems: ReceiptItem[];
  emissionsLog?: EmissionsLog;
}

export interface UserWithReceipts extends User {
  receipts: ReceiptWithItems[];
  emissionsLogs: EmissionsLog[];
}

// API Response types
export interface OCRResponse {
  success: boolean;
  text: string;
  confidence: number;
  items?: ParsedReceiptItem[];
  merchant?: string;
  total?: number;
  date?: string;
}

export interface ParsedReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string;
  brand?: string;
}

export interface EmissionsCalculationRequest {
  items: ParsedReceiptItem[];
  merchant: string;
  total: number;
  date: string;
}

export interface EmissionsCalculationResponse {
  success: boolean;
  totalCO2: number;
  breakdown: EmissionsBreakdown;
  calculationMethod: string;
  carbonIntensity: number;
}

// Dashboard data types
export interface DashboardStats {
  totalReceipts: number;
  totalEmissions: number;
  averageEmissionsPerReceipt: number;
  monthlyEmissions: MonthlyEmissions[];
  categoryBreakdown: CategoryEmissions[];
  comparisonWithAverage: number; // percentage difference from Canadian average
}

export interface MonthlyEmissions {
  month: string;
  emissions: number;
  receipts: number;
}

export interface CategoryEmissions {
  category: string;
  emissions: number;
  percentage: number;
  itemCount: number;
}

// Enum for receipt/emissions status
export enum ReceiptStatus {
  PROCESSED = 'processed',
  PROCESSING = 'processing',
  ERROR = 'error',
  HIDDEN = 'hidden',
  // Add more statuses as needed
}
