import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { 
  CreateReceiptSchema, 
  CreateReceiptItemSchema, 
  CreateEmissionsLogSchema,
  PaginationSchema,
  ReceiptFilterSchema,
  type CreateReceipt,
  type CreateReceiptItem,
  type CreateEmissionsLog,
  type Pagination,
  type ReceiptFilter
} from "@/lib/schemas";
import { z } from "zod";

export class DatabaseService {
  // User operations
  static async getUserByClerkId(clerkId: string) {
    try {
      return await prisma.user.findUnique({
        where: { clerkId },
        include: {
          receipts: {
            include: {
              receiptItems: true,
              emissionsLog: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });
    } catch (error) {
      logger.error("Error fetching user by clerk ID", error instanceof Error ? error : new Error(String(error)), { clerkId });
      throw new Error("Failed to fetch user");
    }
  }

  static async createUser(clerkId: string, email: string, firstName?: string, lastName?: string) {
    try {
      return await prisma.user.create({
        data: {
          clerkId,
          email,
          firstName,
          lastName,
        },
      });
    } catch (error) {
      logger.error("Error creating user", error instanceof Error ? error : new Error(String(error)), { clerkId, email });
      throw new Error("Failed to create user");
    }
  }

  static async updateUser(clerkId: string, data: Partial<{ firstName: string; lastName: string; avatar: string; bio: string; location: string }>) {
    try {
      return await prisma.user.update({
        where: { clerkId },
        data,
      });
    } catch (error) {
      logger.error("Error updating user", error instanceof Error ? error : new Error(String(error)), { clerkId });
      throw new Error("Failed to update user");
    }
  }

  // Receipt operations
  static async createReceiptWithItems(
    userId: string,
    receiptData: CreateReceipt,
    items: CreateReceiptItem[],
    emissionsData?: CreateEmissionsLog
  ) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Validate receipt data
        const validatedReceipt = CreateReceiptSchema.parse(receiptData);
        
        // Create receipt
        const receipt = await tx.receipt.create({
          data: {
            ...validatedReceipt,
            userId,
            total: validatedReceipt.total,
            taxAmount: validatedReceipt.taxAmount || 0,
            tipAmount: validatedReceipt.tipAmount || 0,
          },
        });

        // Create receipt items
        const receiptItems = await Promise.all(
          items.map(async (item) => {
            const validatedItem = CreateReceiptItemSchema.parse(item);
            return await tx.receiptItem.create({
              data: {
                ...validatedItem,
                receiptId: receipt.id,
                quantity: validatedItem.quantity,
                unitPrice: validatedItem.unitPrice,
                totalPrice: validatedItem.totalPrice,
              },
            });
          })
        );

        // Create emissions log if provided
        let emissionsLog = null;
        if (emissionsData) {
          const validatedEmissions = CreateEmissionsLogSchema.parse(emissionsData);
          emissionsLog = await tx.emissionsLog.create({
            data: {
              ...validatedEmissions,
              receiptId: receipt.id,
              userId,
              totalCO2: validatedEmissions.totalCO2,
            },
          });
        }

        return {
          receipt,
          items: receiptItems,
          emissionsLog,
        };
      });
    } catch (error) {
      logger.error("Error creating receipt with items", error instanceof Error ? error : new Error(String(error)), { userId });
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => e.message).join(", ")}`);
      }
      throw new Error("Failed to create receipt");
    }
  }

  static async getReceiptById(receiptId: string, userId: string) {
    try {
      return await prisma.receipt.findFirst({
        where: { id: receiptId, userId },
        include: {
          receiptItems: true,
          emissionsLog: true,
        },
      });
    } catch (error) {
      logger.error("Error fetching receipt", error instanceof Error ? error : new Error(String(error)), { receiptId, userId });
      throw new Error("Failed to fetch receipt");
    }
  }

  static async getReceiptsByUser(
    userId: string,
    pagination: Pagination = { page: 1, limit: 10, sortOrder: "desc" },
    filters: ReceiptFilter = {}
  ) {
    try {
      const validatedPagination = PaginationSchema.parse(pagination);
      const validatedFilters = ReceiptFilterSchema.parse(filters);

      const skip = (validatedPagination.page - 1) * validatedPagination.limit;

      const whereClause: any = { userId };

      // Apply filters
      if (validatedFilters.startDate || validatedFilters.endDate) {
        whereClause.date = {};
        if (validatedFilters.startDate) {
          whereClause.date.gte = validatedFilters.startDate;
        }
        if (validatedFilters.endDate) {
          whereClause.date.lte = validatedFilters.endDate;
        }
      }

      if (validatedFilters.merchant) {
        whereClause.merchant = {
          contains: validatedFilters.merchant,
          mode: "insensitive" as const,
        };
      }

      if (validatedFilters.minTotal || validatedFilters.maxTotal) {
        whereClause.total = {};
        if (validatedFilters.minTotal) {
          whereClause.total.gte = validatedFilters.minTotal;
        }
        if (validatedFilters.maxTotal) {
          whereClause.total.lte = validatedFilters.maxTotal;
        }
      }

      const [receipts, total] = await Promise.all([
        prisma.receipt.findMany({
          where: whereClause,
          include: {
            receiptItems: true,
            emissionsLog: true,
          },
          orderBy: {
            [validatedPagination.sortBy || "createdAt"]: validatedPagination.sortOrder,
          },
          skip,
          take: validatedPagination.limit,
        }),
        prisma.receipt.count({ where: whereClause }),
      ]);

      return {
        receipts,
        pagination: {
          ...validatedPagination,
          total,
          totalPages: Math.ceil(total / validatedPagination.limit),
        },
      };
    } catch (error) {
      logger.error("Error fetching receipts", error instanceof Error ? error : new Error(String(error)), { userId });
      throw new Error("Failed to fetch receipts");
    }
  }

  static async updateReceipt(receiptId: string, userId: string, data: Partial<CreateReceipt>) {
    try {
      return await prisma.receipt.updateMany({
        where: { id: receiptId, userId },
        data,
      });
    } catch (error) {
      logger.error("Error updating receipt", error instanceof Error ? error : new Error(String(error)), { receiptId, userId });
      throw new Error("Failed to update receipt");
    }
  }

  static async deleteReceipt(receiptId: string, userId: string) {
    try {
      return await prisma.receipt.deleteMany({
        where: { id: receiptId, userId },
      });
    } catch (error) {
      logger.error("Error deleting receipt", error instanceof Error ? error : new Error(String(error)), { receiptId, userId });
      throw new Error("Failed to delete receipt");
    }
  }

  // Emissions operations
  static async getEmissionsByUser(userId: string, startDate?: Date, endDate?: Date) {
    try {
      const whereClause: any = { userId };
      
      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) {
          whereClause.createdAt.gte = startDate;
        }
        if (endDate) {
          whereClause.createdAt.lte = endDate;
        }
      }

      const emissions = await prisma.emissionsLog.findMany({
        where: whereClause,
        include: {
          receipt: {
            include: {
              receiptItems: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return emissions;
    } catch (error) {
      logger.error("Error fetching emissions", error instanceof Error ? error : new Error(String(error)), { userId });
      throw new Error("Failed to fetch emissions");
    }
  }

  static async getEmissionsSummary(userId: string) {
    try {
      const emissions = await this.getEmissionsByUser(userId);
      
      const totalEmissions = emissions.reduce((sum, emission) => sum + Number(emission.totalCO2), 0);
      const averageEmissions = emissions.length > 0 ? totalEmissions / emissions.length : 0;
      
      // Calculate weekly and monthly averages
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const weeklyEmissions = emissions
        .filter(e => e.createdAt >= weekAgo)
        .reduce((sum, emission) => sum + Number(emission.totalCO2), 0);
      
      const monthlyEmissions = emissions
        .filter(e => e.createdAt >= monthAgo)
        .reduce((sum, emission) => sum + Number(emission.totalCO2), 0);

      return {
        totalEmissions,
        averageEmissions,
        weeklyEmissions,
        monthlyEmissions,
        totalReceipts: emissions.length,
        emissions,
      };
    } catch (error) {
      logger.error("Error fetching emissions summary", error instanceof Error ? error : new Error(String(error)), { userId });
      throw new Error("Failed to fetch emissions summary");
    }
  }

  static async getAnalytics(userId: string) {
    try {
      const receipts = await prisma.receipt.findMany({
        where: { userId },
        include: {
          receiptItems: true,
          emissionsLog: true,
        },
        orderBy: { createdAt: "desc" },
      });

      const totalReceipts = receipts.length;
      const totalEmissions = receipts.reduce((sum, receipt) => {
        return sum + (receipt.emissionsLog ? Number(receipt.emissionsLog.totalCO2) : 0);
      }, 0);
      
      const averageReceiptValue = receipts.length > 0 
        ? receipts.reduce((sum, receipt) => sum + Number(receipt.total), 0) / receipts.length 
        : 0;

      return {
        totalReceipts,
        totalEmissions,
        averageReceiptValue,
      };
    } catch (error) {
      logger.error("Error fetching analytics", error instanceof Error ? error : new Error(String(error)), { userId });
      throw new Error("Failed to fetch analytics");
    }
  }
} 