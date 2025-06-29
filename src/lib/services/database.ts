import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { 
  CreateReceiptSchema, 
  CreateReceiptItemSchema, 
  PaginationSchema,
  ReceiptFilterSchema,
  type CreateReceipt,
  type CreateReceiptItem,
  type Pagination,
  type ReceiptFilter
} from "@/lib/schemas";
import { z } from "zod";

/**
 * Serialize Prisma results to remove Decimal objects
 * This ensures only plain objects are passed to client components
 */
function serializePrismaResult<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

export class DatabaseService {
  // User operations
  static async getUserByClerkId(clerkId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { clerkId },
        include: {
          receipts: {
            include: {
              receiptItems: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });
      
      // Serialize to remove Decimal objects
      return serializePrismaResult(user);
    } catch (error) {
      logger.error("Error fetching user by clerk ID", error instanceof Error ? error : new Error(String(error)), { clerkId });
      throw new Error("Failed to fetch user");
    }
  }

  static async createUser(clerkId: string, email: string, firstName?: string, lastName?: string) {
    try {
      const user = await prisma.user.create({
        data: {
          clerkId,
          email,
          firstName,
          lastName,
        },
      });
      
      // Serialize to remove Decimal objects
      return serializePrismaResult(user);
    } catch (error) {
      logger.error("Error creating user", error instanceof Error ? error : new Error(String(error)), { clerkId, email });
      throw new Error("Failed to create user");
    }
  }

  static async updateUser(clerkId: string, data: Partial<{ firstName: string; lastName: string; avatar: string; bio: string; location: string }>) {
    try {
      const user = await prisma.user.update({
        where: { clerkId },
        data,
      });
      
      // Serialize to remove Decimal objects
      return serializePrismaResult(user);
    } catch (error) {
      logger.error("Error updating user", error instanceof Error ? error : new Error(String(error)), { clerkId });
      throw new Error("Failed to update user");
    }
  }

  // Receipt operations
  static async createReceiptWithItems(
    userId: string,
    receiptData: CreateReceipt,
    items: CreateReceiptItem[]
  ) {
    try {
      const result = await prisma.$transaction(async (tx) => {
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
                carbonEmissions: validatedItem.carbonEmissions,
                confidence: validatedItem.confidence,
              },
            });
          })
        );

        return {
          receipt,
          items: receiptItems,
        };
      });
      
      // Serialize to remove Decimal objects
      return serializePrismaResult(result);
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
      const receipt = await prisma.receipt.findFirst({
        where: { id: receiptId, userId },
        include: {
          receiptItems: true,
        },
      });
      
      // Serialize to remove Decimal objects
      return serializePrismaResult(receipt);
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
          },
          orderBy: {
            [validatedPagination.sortBy || "createdAt"]: validatedPagination.sortOrder,
          },
          skip,
          take: validatedPagination.limit,
        }),
        prisma.receipt.count({ where: whereClause }),
      ]);

      const result = {
        receipts,
        pagination: {
          ...validatedPagination,
          total,
          totalPages: Math.ceil(total / validatedPagination.limit),
        },
      };
      
      // Serialize to remove Decimal objects
      return serializePrismaResult(result);
    } catch (error) {
      logger.error("Error fetching receipts", error instanceof Error ? error : new Error(String(error)), { userId });
      throw new Error("Failed to fetch receipts");
    }
  }

  static async updateReceipt(receiptId: string, userId: string, data: Partial<CreateReceipt>) {
    try {
      const result = await prisma.receipt.updateMany({
        where: { id: receiptId, userId },
        data,
      });
      
      // Serialize to remove Decimal objects
      return serializePrismaResult(result);
    } catch (error) {
      logger.error("Error updating receipt", error instanceof Error ? error : new Error(String(error)), { receiptId, userId });
      throw new Error("Failed to update receipt");
    }
  }

  static async deleteReceipt(receiptId: string, userId: string) {
    try {
      const result = await prisma.receipt.deleteMany({
        where: { id: receiptId, userId },
      });
      
      // Serialize to remove Decimal objects
      return serializePrismaResult(result);
    } catch (error) {
      logger.error("Error deleting receipt", error instanceof Error ? error : new Error(String(error)), { receiptId, userId });
      throw new Error("Failed to update receipt");
    }
  }

  // Emissions operations - now using totalCarbonEmissions from receipts
  static async getEmissionsByUser(userId: string, startDate?: Date, endDate?: Date) {
    try {
      const whereClause: any = { userId };
      
      if (startDate || endDate) {
        whereClause.date = {};
        if (startDate) {
          whereClause.date.gte = startDate;
        }
        if (endDate) {
          whereClause.date.lte = endDate;
        }
      }

      const receipts = await prisma.receipt.findMany({
        where: whereClause,
        select: {
          id: true,
          totalCarbonEmissions: true,
          date: true,
          merchant: true,
        },
        orderBy: { date: "desc" },
      });

      return receipts;
    } catch (error) {
      logger.error("Error fetching emissions by user", error instanceof Error ? error : new Error(String(error)), { userId });
      throw new Error("Failed to fetch emissions");
    }
  }

  static async getEmissionsSummary(userId: string) {
    try {
      const receipts = await prisma.receipt.findMany({
        where: { userId },
        select: {
          totalCarbonEmissions: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      const totalEmissions = receipts.reduce((sum, receipt) => sum + Number(receipt.totalCarbonEmissions), 0);

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      const weeklyEmissions = receipts
        .filter(receipt => receipt.createdAt >= weekAgo)
        .reduce((sum, receipt) => sum + Number(receipt.totalCarbonEmissions), 0);

      const monthlyEmissions = receipts
        .filter(receipt => receipt.createdAt >= monthAgo)
        .reduce((sum, receipt) => sum + Number(receipt.totalCarbonEmissions), 0);

      return {
        total: totalEmissions,
        weekly: weeklyEmissions,
        monthly: monthlyEmissions,
        count: receipts.length,
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
        },
        orderBy: { createdAt: "desc" },
      });

      // Calculate total emissions from receipts
      const totalEmissions = receipts.reduce((sum, receipt) => {
        return sum + Number(receipt.totalCarbonEmissions);
      }, 0);

      // Calculate emissions by category from receipt items
      const categoryEmissions: Record<string, number> = {};
      receipts.forEach(receipt => {
        receipt.receiptItems.forEach(item => {
          const category = item.category || 'Uncategorized';
          const emissions = Number(item.carbonEmissions);
          categoryEmissions[category] = (categoryEmissions[category] || 0) + emissions;
        });
      });

      // Calculate average emissions per receipt
      const averageEmissions = receipts.length > 0 ? totalEmissions / receipts.length : 0;

      const result = {
        totalEmissions,
        averageEmissions,
        categoryEmissions,
        receiptCount: receipts.length,
        itemCount: receipts.reduce((sum, receipt) => sum + receipt.receiptItems.length, 0),
      };
      
      // Serialize to remove Decimal objects
      return serializePrismaResult(result);
    } catch (error) {
      logger.error("Error fetching analytics", error instanceof Error ? error : new Error(String(error)), { userId });
      throw new Error("Failed to fetch analytics");
    }
  }
} 