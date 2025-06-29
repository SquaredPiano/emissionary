'use client';

import { useState } from 'react';
import { DashboardPageHeader } from '@/components/dashboard/layout/dashboard-page-header';
import { SimpleUpload } from '@/components/upload/simple-upload';
import { OCRStatus } from '@/components/upload/ocr-status';

export default function UploadClient() {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [processingElapsed, setProcessingElapsed] = useState(0);
  const [progress, setProgress] = useState(0);
  const [statusStep, setStatusStep] = useState('uploading');
  const [approximateETA] = useState(12);
  const [extractedData, setExtractedData] = useState(null);
  const [processingStartTime, setProcessingStartTime] = useState(null);

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto px-4 pb-12">
      <DashboardPageHeader pageTitle="Upload Receipt" />
      <div className="grid gap-6 lg:grid-cols-2">
        <SimpleUpload
          uploadedFile={uploadedFile}
          setUploadedFile={setUploadedFile}
          preview={preview}
          setPreview={setPreview}
          isProcessing={isProcessing}
          setIsProcessing={setIsProcessing}
          error={error}
          setError={setError}
          processingElapsed={processingElapsed}
          setProcessingElapsed={setProcessingElapsed}
          progress={progress}
          setProgress={setProgress}
          statusStep={statusStep}
          setStatusStep={setStatusStep}
          approximateETA={approximateETA}
          extractedData={extractedData}
          setExtractedData={setExtractedData}
          processingStartTime={processingStartTime}
          setProcessingStartTime={setProcessingStartTime}
        />
        <OCRStatus
          isProcessing={isProcessing}
          progress={progress}
          eta={approximateETA}
          elapsed={processingElapsed}
          statusStep={statusStep}
          uploadedFile={uploadedFile}
          preview={preview}
          extractedData={extractedData}
          error={error}
        />
      </div>
    </div>
  );
} 