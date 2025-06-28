import { createUploadthing, type FileRouter } from "uploadthing/next";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";

const f = createUploadthing();

// File validation schema
const fileSchema = z.object({
  name: z.string().min(1).max(255),
  size: z.number().min(1).max(10 * 1024 * 1024), // 10MB max
  type: z.string().refine((type) => {
    return [
      "image/jpeg",
      "image/jpg", 
      "image/png",
      "image/webp",
      "application/pdf"
    ].includes(type);
  }, "Invalid file type. Only JPEG, PNG, WebP, and PDF files are allowed.")
});

export const uploadRouter = {
  receiptUploader: f({
    image: {
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
    pdf: {
      maxFileSize: "8MB", 
      maxFileCount: 1,
    }
  })
    .middleware(async ({ req }) => {
      // Get user from Clerk
      const { userId } = await auth();
      if (!userId) {
        throw new Error("Unauthorized");
      }

      return { userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Validate file
      const validatedFile = fileSchema.parse({
        name: file.name,
        size: file.size,
        type: file.type
      });

      // Return file info for client
      return {
        uploadedBy: metadata.userId,
        url: file.url,
        name: file.name,
        size: file.size,
        type: file.type,
        key: file.key
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter; 