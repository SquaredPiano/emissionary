import { z } from "zod";

// Helper preprocessors for numbers (handles Decimal, string, number)
const asNumber = (schema: z.ZodNumber) =>
  z.preprocess((val) => {
    if (typeof val === 'string') return parseFloat(val);
    if (typeof val === 'number') return val;
    if (val && typeof val === 'object' && 'toNumber' in val) return (val as any).toNumber();
    return val;
  }, schema);

const asNumberPositive = () => asNumber(z.number().positive());
const asNumberNonNegative = () => asNumber(z.number().nonnegative());
const asNumberMinMax = (min: number, max: number) => asNumber(z.number().min(min).max(max));
const asNumberMin = (min: number) => asNumber(z.number().min(min));
const asNumberMax = (max: number) => asNumber(z.number().max(max));

// Base schemas
export const BaseUserSchema = z.object({
  id: z.string().cuid(),
  clerkId: z.string(),
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatar: z.string().url().optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const BaseReceiptSchema = z.object({
  id: z.string().cuid(),
  userId: z.string().cuid(),
  imageUrl: z.string().url().optional(),
  merchant: z.string().min(1).max(255),
  total: asNumberPositive(),
  date: z.date(),
  currency: z.string().default("USD"),
  taxAmount: asNumberNonNegative().optional(),
  tipAmount: asNumberNonNegative().optional(),
  paymentMethod: z.string().optional(),
  receiptNumber: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const BaseReceiptItemSchema = z.object({
  id: z.string().cuid(),
  receiptId: z.string().cuid(),
  name: z.string().min(1).max(255),
  quantity: asNumberPositive(),
  unitPrice: asNumberNonNegative(),
  totalPrice: asNumberNonNegative(),
  category: z.string().optional(),
  brand: z.string().optional(),
  barcode: z.string().optional(),
  description: z.string().optional(),
  carbonEmissions: asNumberNonNegative().optional(),
  confidence: asNumber(z.number().min(0).max(1)).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const BaseEmissionsLogSchema = z.object({
  id: z.string().cuid(),
  receiptId: z.string().cuid(),
  userId: z.string().cuid(),
  totalCO2: asNumberNonNegative(),
  breakdown: z.record(z.any()), // JSON field
  calculationMethod: z.string().optional(),
  carbonIntensity: asNumberNonNegative().optional(),
  llmEnhanced: z.boolean().default(false),
  carbonEmissions: z.number().nonnegative().optional(),
  confidence: z.number().min(0).max(1).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Input schemas for API operations
export const CreateReceiptSchema = z.object({
  imageUrl: z.string().url(),
  merchant: z.string().min(1).max(255),
  total: z.number().positive(),
  date: z.date(),
  currency: z.string().default("USD"),
  taxAmount: z.number().nonnegative().optional(),
  tipAmount: z.number().nonnegative().optional(),
  paymentMethod: z.string().optional(),
  receiptNumber: z.string().optional(),
});

export const CreateReceiptItemSchema = z.object({
  name: z.string().min(1).max(255),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  totalPrice: z.number().nonnegative(),
  category: z.string().optional(),
  brand: z.string().optional(),
  barcode: z.string().optional(),
  description: z.string().optional(),
  carbonEmissions: z.number().nonnegative().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const CreateEmissionsLogSchema = z.object({
  totalCO2: z.number().nonnegative(),
  breakdown: z.record(z.any()),
  calculationMethod: z.string().optional(),
  carbonIntensity: z.number().nonnegative().optional(),
  llmEnhanced: z.boolean().default(false),
  carbonEmissions: z.number().nonnegative().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

// OCR Response schemas - Updated to match actual OCR service response
export const OCRItemSchema = z.object({
  name: z.string(),
  quantity: z.number().positive(),
  unit_price: z.number().nonnegative().nullable().optional(),
  total_price: z.number().nonnegative().nullable().optional(),
  category: z.string().nullable().optional().transform(val => val || ""),
  subcategory: z.string().nullable().optional().transform(val => val || ""),
  brand: z.string().nullable().optional().transform(val => val || ""),
  carbon_emissions: z.number().nonnegative().nullable().optional().transform(val => val || 0),
  confidence: z.number().min(0).max(1).nullable().optional().transform(val => val || 0.8),
  estimated_weight_kg: z.number().nonnegative().nullable().optional().transform(val => val || null),
  source: z.string().nullable().optional().transform(val => val || ""),
});

export const OCRResponseSchema = z.object({
  success: z.boolean(),
  text: z.string(),
  items: z.array(OCRItemSchema).optional(),
  merchant: z.string().nullable().optional().transform(val => val || ""),
  total: z.number().nonnegative().nullable().optional().transform(val => val || 0),
  date: z.string().nullable().optional().transform(val => val || ""),
  total_carbon_emissions: z.number().nonnegative().nullable().optional().transform(val => val || 0),
  processing_time: z.number().nonnegative().nullable().optional().transform(val => val || 0),
  error_message: z.string().nullable().optional().transform(val => val || ""),
  raw_ocr_data: z.array(z.record(z.any())).nullable().optional().transform(val => val || []),
  confidence: z.number().min(0).max(1).optional().transform(val => val || 0.8),
  database_stats: z.record(z.any()).optional(),
});

// Database-compatible schemas for saving OCR results
export const CreateReceiptFromOCRSchema = z.object({
  imageUrl: z.string().url(),
  merchant: z.string().min(1).max(255),
  total: z.number().positive(),
  date: z.date(),
  currency: z.string().default("USD"),
  taxAmount: z.number().nonnegative().optional(),
  tipAmount: z.number().nonnegative().optional(),
  paymentMethod: z.string().optional(),
  receiptNumber: z.string().optional(),
  totalCarbonEmissions: z.number().nonnegative(),
  processingTime: z.number().nonnegative().optional(),
});

export const CreateReceiptItemFromOCRSchema = z.object({
  name: z.string().min(1).max(255),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  totalPrice: z.number().nonnegative(),
  category: z.string().optional(),
  brand: z.string().optional(),
  barcode: z.string().optional(),
  description: z.string().optional(),
  carbonEmissions: z.number().nonnegative().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

// File upload schemas
export const FileUploadSchema = z.object({
  name: z.string().min(1).max(255),
  size: z.number().min(1).max(8 * 1024 * 1024), // 8MB max
  type: z.string().refine((type) => {
    return [
      "image/jpeg",
      "image/jpg", 
      "image/png",
      "image/webp",
      "application/pdf"
    ].includes(type);
  }, "Invalid file type. Only JPEG, PNG, WebP, and PDF files are allowed."),
});

// API Response schemas
export const APIResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

// Pagination schemas
export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Filter schemas
export const ReceiptFilterSchema = z.object({
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  merchant: z.string().optional(),
  minTotal: z.number().optional(),
  maxTotal: z.number().optional(),
  category: z.string().optional(),
});

// User sync schemas
export const UserSyncSchema = z.object({
  clerkId: z.string(),
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatar: z.string().url().optional(),
});

// Type exports
export type BaseUser = z.infer<typeof BaseUserSchema>;
export type BaseReceipt = z.infer<typeof BaseReceiptSchema>;
export type BaseReceiptItem = z.infer<typeof BaseReceiptItemSchema>;
export type CreateReceipt = z.infer<typeof CreateReceiptSchema>;
export type CreateReceiptItem = z.infer<typeof CreateReceiptItemSchema>;
export type OCRItem = z.infer<typeof OCRItemSchema>;
export type OCRResponse = z.infer<typeof OCRResponseSchema>;
export type FileUpload = z.infer<typeof FileUploadSchema>;
export type APIResponse = z.infer<typeof APIResponseSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type ReceiptFilter = z.infer<typeof ReceiptFilterSchema>;

// New type exports for OCR integration
export type CreateReceiptFromOCR = z.infer<typeof CreateReceiptFromOCRSchema>;
export type CreateReceiptItemFromOCR = z.infer<typeof CreateReceiptItemFromOCRSchema>; 