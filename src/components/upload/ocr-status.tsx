'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Eye, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface OCRStatusProps {
  isProcessing?: boolean;
  progress?: number;
  eta?: number;
  elapsed?: number;
  statusStep?: string;
  uploadedFile?: any;
  preview?: string | null;
  extractedData?: any;
  error?: string;
}

export function OCRStatus({
  isProcessing = false,
  progress = 0,
  eta = 10,
  elapsed = 0,
  statusStep = 'uploading',
  uploadedFile,
  preview,
  extractedData,
  error,
}: OCRStatusProps) {
  const steps: string[] = ['uploading', 'ocr', 'parsing', 'calculating', 'complete'];
      
  const getStepIcon = (step: string) => {
    switch (step) {
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'ocr':
        return <Eye className="h-4 w-4" />;
      case 'parsing':
        return <FileText className="h-4 w-4" />;
      case 'calculating':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'complete':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStepColor = (step: string) => {
    if (error) return 'text-red-600';
    if (statusStep === step) return 'text-blue-600';
    if (steps.indexOf(step) < steps.indexOf(statusStep)) return 'text-green-600';
    return 'text-black dark:text-gray-400';
  };

  if (!isProcessing && !extractedData && !error) {
    return (
      <Card className="bg-background/50 backdrop-blur-[24px] border-border">
        <CardHeader>
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Processing Status
          </CardTitle>
          <CardDescription>
            Upload a receipt to see processing status and extracted data
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <div className="text-center">
            <div className="text-black dark:text-muted-foreground mb-2">📄</div>
            <p className="text-black dark:text-gray-400">No receipt uploaded yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-background/50 backdrop-blur-[24px] border-border">
      <CardHeader>
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Processing Status
        </CardTitle>
        <CardDescription>
          {isProcessing ? 'Processing your receipt...' : 'Receipt processing complete'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Receipt Preview */}
        {uploadedFile && (
          <div className="flex items-center gap-3">
            {preview ? (
              <img src={preview} alt="Receipt preview" className="h-16 w-auto rounded border" />
            ) : (
              <FileText className="h-8 w-8 text-black dark:text-gray-400" />
            )}
            <div>
              <div className="text-sm font-medium">{uploadedFile.name}</div>
              <div className="text-xs text-black dark:text-gray-400">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</div>
            </div>
          </div>
        )}

        {/* Processing Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center gap-3">
              <div className={`${getStepColor(step)}`}>{getStepIcon(step)}</div>
              <span className={`text-sm ${getStepColor(step)}`}>
                {step.charAt(0).toUpperCase() + step.slice(1)}
                {step === 'ocr' && ' (Text Extraction)'}
                {step === 'parsing' && ' (Item Recognition)'}
                {step === 'calculating' && ' (Emissions Calculation)'}
              </span>
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-black dark:text-gray-400 mt-1">
              <span>Elapsed: {elapsed}s</span>
              <span>ETA: ~{Math.max(0, eta - elapsed)}s</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Processing Error</span>
            </div>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        )}

        {/* Extracted Data */}
        {extractedData && !isProcessing && (
          <div className="space-y-4">
            <h4 className="font-medium">Extracted Items</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border rounded-lg">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="px-2 py-1 text-left">Name</th>
                    <th className="px-2 py-1 text-left">Category</th>
                    <th className="px-2 py-1 text-left">Emissions (kg CO₂e)</th>
                    <th className="px-2 py-1 text-left">Confidence</th>
                    <th className="px-2 py-1 text-left">Source</th>
                    <th className="px-2 py-1 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedData.items?.map((item: any, index: number) => {
                    // Determine status based on item properties
                    let status = 'Processed';
                    let statusColor = 'bg-green-100 text-green-800';
                    
                    if (item.status === 'failed') {
                      status = 'Failed';
                      statusColor = 'bg-red-100 text-red-800';
                    } else if (item.status === 'processing') {
                      status = 'Processing';
                      statusColor = 'bg-blue-100 text-blue-800';
                    } else if (item.status === 'fallback') {
                      status = 'Fallback';
                      statusColor = 'bg-yellow-100 text-yellow-800';
                    } else if (item.status === 'ai_estimated') {
                      status = 'AI Estimated';
                      statusColor = 'bg-blue-100 text-blue-800';
                    } else if (item.status === 'unknown') {
                      status = 'Unknown';
                      statusColor = 'bg-gray-100 text-gray-800';
                    } else {
                      // Default to processed for all other cases
                      status = 'Processed';
                      statusColor = 'bg-green-100 text-green-800';
                    }

                    // Determine source display
                    let sourceDisplay = item.source || 'Unknown';
                    if (sourceDisplay === 'groq_ai') {
                      sourceDisplay = 'Groq AI';
                    } else if (sourceDisplay === 'dataset') {
                      sourceDisplay = 'Database';
                    } else if (sourceDisplay === 'fallback') {
                      sourceDisplay = 'Fallback';
                    } else if (sourceDisplay === 'ai_estimation') {
                      sourceDisplay = 'AI Estimation';
                    }

                    // Determine category display
                    let categoryDisplay = item.category || '—';
                    if (categoryDisplay === 'prepared_food') {
                      categoryDisplay = 'Prepared Food';
                    } else if (categoryDisplay === 'other') {
                      categoryDisplay = 'Other';
                    }

                    return (
                      <tr key={index} className="border-b last:border-0">
                        <td className="px-2 py-1 font-medium">{item.name}</td>
                        <td className="px-2 py-1">{categoryDisplay}</td>
                        <td className="px-2 py-1">{item.carbon_emissions != null ? item.carbon_emissions.toFixed(2) : '—'}</td>
                        <td className="px-2 py-1">{item.confidence != null ? (item.confidence * 100).toFixed(0) + '%' : '—'}</td>
                        <td className="px-2 py-1">{sourceDisplay}</td>
                        <td className="px-2 py-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${statusColor}`}>{status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Emissions</span>
                <Badge className="bg-green-600">
                  {extractedData.totalEmissions || extractedData.total_carbon_emissions || 0} kg CO₂e
                </Badge>
              </div>
              {/* Show emission source breakdown if available */}
              {extractedData.items && extractedData.items.length > 0 && 
               extractedData.items.some((item: any) => item.source) && (
                <div className="mt-2 text-xs text-muted-foreground">
                  <span className="font-medium">Sources: </span>
                  {(() => {
                    const sourceCounts = extractedData.items.reduce((acc: any, item: any) => {
                      const source = item.source || 'unknown';
                      acc[source] = (acc[source] || 0) + 1;
                      return acc;
                    }, {});
                    return Object.entries(sourceCounts).map(([source, count]: [string, any]) => (
                      <span key={source} className="mr-1">
                        {source}: {count}
                      </span>
                    ));
                  })()}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 