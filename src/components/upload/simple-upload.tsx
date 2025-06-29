'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, X, FileImage, CheckCircle, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { UploadDropzone } from '@/lib/providers/uploadthing';
import { processReceiptImage } from '@/lib/actions/receipts';
import { useToast } from '@/components/ui/use-toast';
import type { OurFileRouter } from "@/lib/uploadthing";

interface UploadedFile {
  url: string;
  name: string;
  size: number;
  type: string;
  key: string;
}

export function SimpleUpload({
  uploadedFile,
  setUploadedFile,
  preview,
  setPreview,
  isProcessing,
  setIsProcessing,
  error,
  setError,
  processingElapsed,
  setProcessingElapsed,
  progress,
  setProgress,
  statusStep,
  setStatusStep,
  approximateETA,
  extractedData,
  setExtractedData,
  processingStartTime,
  setProcessingStartTime,
}: any) {
  const router = useRouter();
  const { toast } = useToast();

  // Timer effect for progress/elapsed
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isProcessing && processingStartTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - processingStartTime) / 1000);
        setProcessingElapsed(elapsed);
        setProgress(Math.min(100, Math.round((elapsed / approximateETA) * 100)));
        // Simulate step changes
        if (elapsed < 2) setStatusStep('uploading');
        else if (elapsed < 5) setStatusStep('ocr');
        else if (elapsed < 8) setStatusStep('parsing');
        else if (elapsed < approximateETA) setStatusStep('calculating');
        else setStatusStep('complete');
      }, 500);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isProcessing, processingStartTime, approximateETA]);

  const handleUploadComplete = useCallback((res: any) => {
    if (res && res.length > 0) {
      const file = res[0];
      setUploadedFile(file);
      setError(null);
      setExtractedData(null);
      // Create preview for images
      if (file.type.startsWith('image/')) {
        setPreview(file.url);
      }
      toast({
        title: "File uploaded successfully",
        description: `${file.name} has been uploaded and is ready for processing.`,
      });
    }
  }, [toast]);

  const handleUploadError = useCallback((error: Error) => {
    setError(error.message);
    toast({
      title: "Upload failed",
      description: error.message,
      variant: "destructive",
    });
  }, [toast]);

  const handleProcessReceipt = async () => {
    if (!uploadedFile) return;
    setIsProcessing(true);
    setError(null);
    setProcessingStartTime(Date.now());
    setProcessingElapsed(0);
    setProgress(0);
    setStatusStep('uploading');
    setExtractedData(null);
    try {
      const result = await processReceiptImage({
        imageUrl: uploadedFile.url,
        fileName: uploadedFile.name,
        imageType: uploadedFile.type,
      });
      if (result.success) {
        toast({
          title: "Receipt processed successfully",
          description: `Found ${result.data?.items?.length || 0} items with ${result.data?.emissionsPerReceipt?.totalCO2?.toFixed(2) || 0} kg CO2e emissions.`,
        });
        setExtractedData(result.data);
        setStatusStep('complete');
        setProgress(100);
        // Optionally: router.push('/dashboard');
      } else {
        throw new Error(result.error || 'Failed to process receipt');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process receipt';
      setError(errorMessage);
      toast({
        title: "Processing failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemove = () => {
    setUploadedFile(null);
    setPreview(null);
    setError(null);
  };

  const handleBack = () => {
    router.push('/dashboard');
  };

  return (
    <Card className="bg-background/50 backdrop-blur-[24px] border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            <CardTitle className="text-xl font-semibold">Upload Receipt</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        <CardDescription>
          Upload a photo or PDF of your grocery receipt to calculate carbon emissions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!uploadedFile ? (
          <div className="space-y-4">
            <UploadDropzone<OurFileRouter, "receiptUploader">
              endpoint="receiptUploader"
              onClientUploadComplete={handleUploadComplete}
              onUploadError={handleUploadError}
              config={{ mode: "auto" }}
              appearance={{
                container: "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors border-border hover:border-primary/50 w-full min-h-64 flex flex-col justify-center items-center",
                allowedContent: "text-xs text-muted-foreground mt-2",
                button: "bg-primary-foreground text-black dark:bg-primary-foreground dark:text-black px-4 py-2 rounded-md text-sm font-medium transition-colors !text-black hidden",
                label: "text-lg font-medium mb-2",
                uploadIcon: "h-12 w-12 mx-auto mb-4 text-muted-foreground",
              }}
            />
            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-destructive">{error}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              {preview && (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img 
                    src={preview} 
                    alt="Receipt preview" 
                    className="w-full h-64 object-contain bg-muted/20"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={handleRemove}
                    disabled={isProcessing}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="mt-2 flex items-center gap-2 text-sm text-black dark:text-white">
                <FileImage className="h-4 w-4" />
                <span>{uploadedFile.name}</span>
                <span>({(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
              </div>
            </div>
            
            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-destructive">{error}</span>
              </div>
            )}
            
            <Button 
              onClick={handleProcessReceipt} 
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing Receipt...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Calculate Emissions
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 