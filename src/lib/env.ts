import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  
  // Clerk Authentication
  CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().min(1),
  
  // UploadThing
  UPLOADTHING_SECRET: z.string().min(1),
  UPLOADTHING_APP_ID: z.string().min(1),
  
  // OCR Service
  OCR_SERVICE_URL: z.string().url().default("http://localhost:8000"),
  
  // Groq API (optional)
  GROQ_API_KEY: z.string().optional(),
  
  // Environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  
  // Next.js
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

export const env = envSchema.parse(process.env);

// Type-safe environment variables
export type Env = z.infer<typeof envSchema>; 