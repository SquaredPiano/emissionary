'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { OcrStatus } from './ocr-status';

export function FileUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      handleUpload(acceptedFiles[0]);
    }
  };

  const handleUpload = async (fileToUpload: File) => {
    setIsUploading(true);
    setIsProcessing(false);
    setIsComplete(false);
    setUploadProgress(0);

    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append('file', fileToUpload);

      // Upload progress simulation
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + 10;
        });
      }, 200);

      // Call our Next.js API route that integrates with Python OCR
      const response = await fetch('/api/ocr/process', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);
      setIsUploading(false);

      if (response.ok) {
        const ocrResult = await response.json();
        console.log('OCR Result:', ocrResult);
        setIsProcessing(true);

        // Pass OCR data to processing component
        if (ocrResult.parsed_data?.items) {
          // Store OCR results for further processing
          localStorage.setItem('ocrResult', JSON.stringify(ocrResult));
        }
      } else {
        throw new Error('OCR processing failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      // Handle error state
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.png'], 'application/pdf': [] },
    multiple: false,
  });

  const resetState = () => {
    setFile(null);
    setUploadProgress(0);
    setIsUploading(false);
    setIsProcessing(false);
    setIsComplete(false);
  };

  if (isProcessing || isComplete) {
    return (
      <OcrStatus
        isProcessing={isProcessing}
        onComplete={() => {
          setIsProcessing(false);
          setIsComplete(true);
        }}
        onReset={resetState}
      />
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer
      ${isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'}`}
    >
      <input {...getInputProps()} />
      {file && isUploading ? (
        <div className="w-full max-w-xs text-center">
          <FileIcon className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">{file.name}</p>
          <Progress value={uploadProgress} className="mt-2 h-2" />
          <p className="mt-1 text-xs text-muted-foreground">{uploadProgress}%</p>
        </div>
      ) : (
        <div className="text-center">
          <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">
            {isDragActive ? 'Drop the files here ...' : 'Drag & drop a file or click to select'}
          </p>
          <p className="text-xs text-muted-foreground">PNG, JPG or PDF</p>
        </div>
      )}
    </div>
  );
}
