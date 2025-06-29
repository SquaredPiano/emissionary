'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, X, FileImage, CheckCircle, ArrowLeft, AlertCircle, Loader2, Zap } from 'lucide-react';
import { UploadDropzone } from '@/lib/providers/uploadthing';
import { useToast } from '@/components/ui/use-toast';
import type { OurFileRouter } from "@/lib/uploadthing";

interface FileUploaderProps {
  onFileUpload?: (file: File) => void;
}

interface UploadedFile {
  url: string;
  name: string;
  size: number;
  type: string;
  key: string;
  ocrSuccess?: boolean;
  ocrError?: string;
  receiptId?: string;
  totalEmissions?: number;
  itemsCount?: number;
  ocrResult?: any;
}

export function FileUploader({ onFileUpload }: FileUploaderProps) {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const handleUploadComplete = useCallback((res: UploadedFile[]) => {
    if (res && res.length > 0) {
      const file = res[0];
      setUploadedFile(file);
      setError(null);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        setPreview(file.url);
      }

      // Check if OCR processing was successful
      if (file.ocrSuccess) {
        toast({
          title: "Receipt processed successfully! 🎉",
          description: `Found ${file.itemsCount || 0} items with ${(file.totalEmissions || 0).toFixed(2)} kg CO2e emissions.`,
        });
        
        // Navigate to dashboard after a short delay to show the success message
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        // OCR failed but file uploaded successfully
        setError(file.ocrError || 'Failed to process receipt');
        toast({
          title: "File uploaded but processing failed",
          description: file.ocrError || 'Please try with a clearer image.',
          variant: "destructive",
        });
      }
    }
  }, [toast, router]);

  const handleUploadError = useCallback((error: Error) => {
    setError(error.message);
    
    toast({
      title: "Upload failed",
      description: error.message,
      variant: "destructive",
    });
  }, [toast]);

  const handleRemove = () => {
    setUploadedFile(null);
    setPreview(null);
    setError(null);
  };

  const handleBack = () => {
    router.push('/dashboard');
  };

  const handleViewResults = () => {
    if (uploadedFile?.receiptId) {
      router.push(`/dashboard?receipt=${uploadedFile.receiptId}`);
    } else {
      router.push('/dashboard');
    }
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
          Upload a photo or PDF of your grocery receipt to automatically calculate carbon emissions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!uploadedFile ? (
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center transition-colors border-border hover:border-primary/50">
              <UploadDropzone<OurFileRouter, "receiptUploader">
                endpoint="receiptUploader"
                onClientUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
                config={{
                  mode: "auto",
                }}
                appearance={{
                  container: "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors border-border hover:border-primary/50",
                  allowedContent: "text-xs text-muted-foreground mt-2",
                  button: "bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  label: "text-lg font-medium mb-2",
                  uploadIcon: "h-12 w-12 mx-auto mb-4 text-muted-foreground",
                }}
              />
            </div>
            
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
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
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

            {uploadedFile.ocrSuccess && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">
                      Receipt processed successfully!
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      {uploadedFile.itemsCount || 0} items found • {(uploadedFile.totalEmissions || 0).toFixed(2)} kg CO2e
                    </p>
                  </div>
                </div>
                
                <Button 
                  onClick={handleViewResults}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  View Results
                </Button>
              </div>
            )}
            
            {!uploadedFile.ocrSuccess && !error && (
              <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />
                <span className="text-sm text-yellow-700 dark:text-yellow-300">
                  Processing receipt...
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 