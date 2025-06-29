"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { DatabaseService } from "@/lib/services/database";
import { logger } from "@/lib/logger";
import { z } from "zod";

// Input schemas for server actions
const UpdateUserSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  avatar: z.string().url().optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
});

/**
 * Get current user profile
 */
export async function getCurrentUser() {
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
    
    // If user doesn't exist in database, create them
    if (!dbUser) {
      const newUser = await DatabaseService.createUser(
        userId,
        clerkUser.emailAddresses[0]?.emailAddress || "",
        clerkUser.firstName || undefined,
        clerkUser.lastName || undefined
      );
      
      return {
        success: true,
        data: newUser,
      };
    }

    return {
      success: true,
      data: dbUser,
    };
  } catch (error) {
    const { userId } = await auth();
    logger.error("Get current user error", error instanceof Error ? error : new Error(String(error)), { userId: userId || undefined });
    
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }
    
    return {
      success: false,
      error: "Failed to fetch user profile",
    };
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(input: z.infer<typeof UpdateUserSchema>) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Validate input
    const validatedInput = UpdateUserSchema.parse(input);

    // Update user in database
    const updatedUser = await DatabaseService.updateUser(userId, validatedInput);

    // Revalidate relevant pages
    revalidatePath("/dashboard");
    revalidatePath("/settings");

    return {
      success: true,
      data: updatedUser,
      message: "Profile updated successfully",
    };
  } catch (error) {
    const { userId } = await auth();
    logger.error("Update user profile error", error instanceof Error ? error : new Error(String(error)), { userId: userId || undefined });
    
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
      error: "Failed to update profile",
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