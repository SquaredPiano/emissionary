'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Eye, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface OCRStatusProps {
  isProcessing?: boolean;
  extractedData?: any;
  error?: string;
}

type ProcessingStep = 'uploading' | 'ocr' | 'parsing' | 'calculating' | 'complete';

export function OCRStatus({ isProcessing = false, extractedData, error }: OCRStatusProps) {
  const [currentStep, setCurrentStep] = useState<ProcessingStep>('uploading');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isProcessing) {
      const steps: ProcessingStep[] = ['uploading', 'ocr', 'parsing', 'calculating', 'complete'];
      let currentIndex = 0;
      
      const interval = setInterval(() => {
        if (currentIndex < steps.length) {
          setCurrentStep(steps[currentIndex]);
          setProgress((currentIndex / (steps.length - 1)) * 100);
          currentIndex++;
        } else {
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isProcessing]);

  const getStepIcon = (step: ProcessingStep) => {
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

  const getStepColor = (step: ProcessingStep) => {
    if (error) return 'text-red-600';
    if (currentStep === step) return 'text-blue-600';
    if (steps.indexOf(step) < steps.indexOf(currentStep)) return 'text-green-600';
    return 'text-muted-foreground';
  };

  const steps: ProcessingStep[] = ['uploading', 'ocr', 'parsing', 'calculating', 'complete'];

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
            <div className="text-muted-foreground mb-2">📄</div>
            <p className="text-muted-foreground">No receipt uploaded yet</p>
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
        {/* Processing Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center gap-3">
              <div className={`${getStepColor(step)}`}>
                {getStepIcon(step)}
              </div>
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
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {extractedData.items?.map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <span className="text-sm">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">${item.price}</span>
                    <Badge variant="outline" className="text-xs">
                      {item.emissions} kg CO₂e
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Emissions</span>
                <Badge className="bg-green-600">
                  {extractedData.totalEmissions} kg CO₂e
                </Badge>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 