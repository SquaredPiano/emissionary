"use client";

import { UploadButton, UploadDropzone, Uploader } from "@uploadthing/react";

export { UploadButton, UploadDropzone, Uploader };

export function UploadThingProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}