import { createUploadthing, type FileRouter } from "uploadthing/next";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { processReceiptImage } from "@/lib/actions/receipts";
import { logger } from "@/lib/logger";

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
      try {
        // Validate file
        const validatedFile = fileSchema.parse({
          name: file.name,
          size: file.size,
          type: file.type
        });

        logger.info("File uploaded successfully", { 
          userId: metadata.userId, 
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type 
        });

        // Process receipt through OCR
        const ocrResult = await processReceiptImage({
          imageUrl: file.url,
          imageType: file.type,
          fileName: file.name,
        });

        if (!ocrResult.success) {
          logger.error("OCR processing failed after upload", undefined, { 
            userId: metadata.userId, 
            error: ocrResult.error,
            fileName: file.name 
          });
          
          // Return file info but with OCR error
          return {
            uploadedBy: metadata.userId,
            url: file.url,
            name: file.name,
            size: file.size,
            type: file.type,
            key: file.key,
            ocrSuccess: false,
            ocrError: ocrResult.error,
          };
        }

        logger.info("Receipt processed successfully after upload", { 
          userId: metadata.userId, 
          fileName: file.name,
          receiptId: ocrResult.data?.receiptId,
          totalEmissions: ocrResult.data?.totalEmissions,
          itemsCount: ocrResult.data?.itemsCount
        });

        // Return file info with OCR results
        return {
          uploadedBy: metadata.userId,
          url: file.url,
          name: file.name,
          size: file.size,
          type: file.type,
          key: file.key,
          ocrSuccess: true,
          receiptId: ocrResult.data?.receiptId,
          totalEmissions: ocrResult.data?.totalEmissions,
          itemsCount: ocrResult.data?.itemsCount,
          ocrResult: ocrResult.data?.ocrResult,
        };

      } catch (error) {
        logger.error("Error in upload complete handler", error instanceof Error ? error : new Error(String(error)), { 
          userId: metadata.userId,
          fileName: file.name 
        });

        // Return file info but with error
        return {
          uploadedBy: metadata.userId,
          url: file.url,
          name: file.name,
          size: file.size,
          type: file.type,
          key: file.key,
          ocrSuccess: false,
          ocrError: error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter; 