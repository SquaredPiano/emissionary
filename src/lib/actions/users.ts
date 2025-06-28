"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { DatabaseService } from "@/lib/services/database";
import { logger } from "@/lib/logger";
import { UserSyncSchema, type UserSync } from "@/lib/schemas";
import { z } from "zod";

// Input schemas for server actions
const SyncUserSchema = z.object({
  clerkId: z.string(),
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatar: z.string().url().optional(),
});

const UpdateUserSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatar: z.string().url().optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
});

/**
 * Sync Clerk user with database
 */
export async function syncUser(input: z.infer<typeof SyncUserSchema>) {
  try {
    // Validate input
    const validatedInput = SyncUserSchema.parse(input);

    // Check if user already exists
    const existingUser = await DatabaseService.getUserByClerkId(validatedInput.clerkId);
    
    if (existingUser) {
      // Update existing user
      const updatedUser = await DatabaseService.updateUser(validatedInput.clerkId, {
        firstName: validatedInput.firstName,
        lastName: validatedInput.lastName,
        avatar: validatedInput.avatar,
      });

      logger.info("User updated successfully", { clerkId: validatedInput.clerkId });
      
      return {
        success: true,
        data: updatedUser,
        action: "updated",
      };
    } else {
      // Create new user
      const newUser = await DatabaseService.createUser(
        validatedInput.clerkId,
        validatedInput.email,
        validatedInput.firstName,
        validatedInput.lastName
      );

      logger.info("User created successfully", { clerkId: validatedInput.clerkId });
      
      return {
        success: true,
        data: newUser,
        action: "created",
      };
    }
  } catch (error) {
    logger.error("User sync error", error instanceof Error ? error : new Error(String(error)), { 
      clerkId: input.clerkId 
    });
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors.map(e => e.message).join(", ")}`,
      };
    }
    
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }
    
    return {
      success: false,
      error: "Failed to sync user",
    };
  }
}

/**
 * Get current user from database
 */
export async function getCurrentUser() {
  try {
    // Get user from Clerk
    const { userId } = await auth();
    if (!userId) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Get user from database
    const user = await DatabaseService.getUserByClerkId(userId);
    if (!user) {
      return {
        success: false,
        error: "User not found in database",
      };
    }

    return {
      success: true,
      data: user,
    };
  } catch (error) {
    logger.error("Get current user error", error instanceof Error ? error : new Error(String(error)));
    
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }
    
    return {
      success: false,
      error: "Failed to get current user",
    };
  }
}

/**
 * Update current user profile
 */
export async function updateUserProfile(input: z.infer<typeof UpdateUserSchema>) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Validate input
    const validatedInput = UpdateUserSchema.parse(input);

    // Update user
    const updatedUser = await DatabaseService.updateUser(userId, validatedInput);

    // Revalidate relevant pages
    revalidatePath("/dashboard");
    revalidatePath("/settings");

    logger.info("User profile updated successfully", { userId });

    return {
      success: true,
      data: updatedUser,
    };
  } catch (error) {
    logger.error("Update user profile error", error instanceof Error ? error : new Error(String(error)));
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors.map(e => e.message).join(", ")}`,
      };
    }
    
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }
    
    return {
      success: false,
      error: "Failed to update user profile",
    };
  }
}

/**
 * Ensure user exists in database (auto-sync)
 */
export async function ensureUserExists() {
  try {
    // Get current user from Clerk
    const user = await currentUser();
    if (!user) {
      return {
        success: false,
        error: "No authenticated user",
      };
    }

    // Check if user exists in database
    const existingUser = await DatabaseService.getUserByClerkId(user.id);
    
    if (!existingUser) {
      // Auto-create user
      const newUser = await DatabaseService.createUser(
        user.id,
        user.emailAddresses[0]?.emailAddress || "",
        user.firstName || undefined,
        user.lastName || undefined
      );

      logger.info("User auto-created", { clerkId: user.id });
      
      return {
        success: true,
        data: newUser,
        action: "created",
      };
    }

    return {
      success: true,
      data: existingUser,
      action: "exists",
    };
  } catch (error) {
    logger.error("Ensure user exists error", error instanceof Error ? error : new Error(String(error)));
    
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }
    
    return {
      success: false,
      error: "Failed to ensure user exists",
    };
  }
}

/**
 * Sync user data from Clerk to database
 */
export async function syncUserData() {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Get user from Clerk
    const clerkUser = await currentUser();
    if (!clerkUser) {
      throw new Error("User not found");
    }

    // Get user from database
    const dbUser = await DatabaseService.getUserByClerkId(userId);
    
    if (!dbUser) {
      // Create new user
      const newUser = await DatabaseService.createUser(
        userId,
        clerkUser.emailAddresses[0]?.emailAddress || "",
        clerkUser.firstName || undefined,
        clerkUser.lastName || undefined
      );
      
      return {
        success: true,
        data: newUser,
        message: "User created successfully",
      };
    } else {
      // Update existing user with latest Clerk data
      const updatedUser = await DatabaseService.updateUser(userId, {
        firstName: clerkUser.firstName || undefined,
        lastName: clerkUser.lastName || undefined,
        avatar: clerkUser.imageUrl || undefined,
      });
      
      return {
        success: true,
        data: updatedUser,
        message: "User data synced successfully",
      };
    }
  } catch (error) {
    const { userId } = await auth();
    logger.error("Sync user data error", error instanceof Error ? error : new Error(String(error)), { userId: userId || undefined });
    
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }
    
    return {
      success: false,
      error: "Failed to sync user data",
    };
  }
}

/**
 * Get user statistics
 */
export async function getUserStats() {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Get user from database
    const user = await DatabaseService.getUserByClerkId(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get user statistics
    const stats = await DatabaseService.getEmissionsSummary(user.id);

    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    const { userId } = await auth();
    logger.error("Get user stats error", error instanceof Error ? error : new Error(String(error)), { userId: userId || undefined });
    
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }
    
    return {
      success: false,
      error: "Failed to fetch user statistics",
    };
  }
} 