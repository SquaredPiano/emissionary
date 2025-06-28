'use client';

import { useEffect, useState } from 'react';
import { Loader2, ScanText, BrainCircuit, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/button';
import Link from 'next/link';
import type { EmissionsResponse } from '@/lib/types';
import { Card, CardContent } from '../ui/card';

const steps = [
  { text: 'Extracting items with OCR...', icon: ScanText },
  { text: 'Calculating emissions with AI...', icon: BrainCircuit },
];

export function OcrStatus({
  isProcessing,
  onComplete,
  onReset,
}: {
  isProcessing: boolean;
  onComplete: () => void;
  onReset: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [emissionsResult, setEmissionsResult] = useState<EmissionsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocrData, setOcrData] = useState<{
    raw_text?: string;
    parsed_data?: {
      store_name?: string;
      items?: Array<{ quantity?: string; item_name: string; unit_price?: string }>;
    };
  } | null>(null);

  useEffect(() => {
    if (!isProcessing) return;

    const processReceipt = async () => {
      if (currentStep === 0) {
        // Get OCR results from localStorage
        try {
          const storedOcrResult = localStorage.getItem('ocrResult');
          if (storedOcrResult) {
            const parsedOcrData = JSON.parse(storedOcrResult);
            setOcrData(parsedOcrData);
            console.log('Retrieved OCR data:', parsedOcrData);
          }
        } catch (error) {
          console.error('Failed to retrieve OCR data:', error);
        }

        // Move to emissions calculation step
        setTimeout(() => setCurrentStep(1), 1500);
      } else if (currentStep === 1) {
        // Prepare items for emissions calculation
        let itemsForCalculation: string[] = [];

        if (ocrData?.parsed_data?.items) {
          // Use structured OCR data if available
          itemsForCalculation = ocrData.parsed_data.items.map((item) =>
            `${item.quantity || ''} ${item.item_name}`.trim(),
          );
        } else if (ocrData?.raw_text) {
          // Fallback to raw text processing
          itemsForCalculation = ocrData.raw_text
            .split('\n')
            .filter((line: string) => line.trim().length > 0)
            .slice(0, 10); // Limit to first 10 lines to avoid noise
        } else {
          // Final fallback to mock data
          itemsForCalculation = ['1kg Beef Mince', '2L Semi-Skimmed Milk', '500g Lentils'];
        }

        console.log('Items for calculation:', itemsForCalculation);

        // Call our AI service for emissions calculation
        try {
          const response = await fetch('/api/calculate-emissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: itemsForCalculation,
              storeName: ocrData?.parsed_data?.store_name || 'Unknown Store',
              fileUrl: null, // Could be added if you store uploaded files
            }),
          });

          if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
          }

          const data: EmissionsResponse = await response.json();
          setEmissionsResult(data);

          // Clear OCR data from localStorage after successful processing
          localStorage.removeItem('ocrResult');
        } catch (err) {
          console.error('Emissions calculation error:', err);
          setError('Could not calculate emissions. Please try again.');
        } finally {
          // Move to completion regardless of success or failure
          setTimeout(() => onComplete(), 1000);
        }
      }
    };

    processReceipt();
  }, [isProcessing, currentStep, onComplete, ocrData]);

  if (!isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center w-full text-center">
        <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
        <h3 className="text-xl font-semibold">Processing Complete!</h3>
        <p className="text-muted-foreground mt-2 mb-6">Your receipt has been analyzed.</p>

        {emissionsResult && (
          <div className="w-full max-w-2xl space-y-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-3">Carbon Footprint Analysis</h4>
                <div className="text-center mb-4">
                  <span className="text-3xl font-bold text-green-600">
                    {emissionsResult.totalEmissionsKg.toFixed(2)} kg CO₂e
                  </span>
                  <p className="text-sm text-muted-foreground">Total emissions</p>
                </div>
                <p className="text-sm bg-muted p-3 rounded-md">{emissionsResult.summary}</p>
              </CardContent>
            </Card>

            {ocrData?.parsed_data && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-2">OCR Results</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Store: {ocrData.parsed_data.store_name || 'Unknown'}
                  </p>
                  <div className="text-xs bg-muted p-3 rounded-md max-h-32 overflow-y-auto">
                    {ocrData.parsed_data.items?.map((item, index: number) => (
                      <div key={index} className="mb-1">
                        {item.quantity} {item.item_name} - ${item.unit_price || 'N/A'}
                      </div>
                    )) || 'No structured items found'}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {error && <p className="text-destructive mb-4">{error}</p>}

        <div className="flex gap-4">
          <Button asChild>
            <Link href="/dashboard">View Dashboard</Link>
          </Button>
          <Button variant="outline" onClick={onReset}>
            Upload Another
          </Button>
        </div>
      </div>
    );
  }

  const CurrentIcon = steps[currentStep].icon;

  return (
    <div className="flex flex-col items-center justify-center w-full h-64 text-center">
      <div className="flex items-center text-lg font-medium">
        <Loader2 className="mr-3 h-6 w-6 animate-spin text-primary" />
        <CurrentIcon className="mr-3 h-6 w-6 text-primary" />
        <span>{steps[currentStep].text}</span>
      </div>
      <div className="w-full max-w-md mt-6">
        <div className="flex justify-between mb-1">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`flex-1 text-center text-xs font-medium ${
                index <= currentStep ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {step.text.split('...')[0]}
            </div>
          ))}
        </div>
        <div className="relative w-full h-2 bg-muted rounded-full">
          <div
            className="absolute top-0 left-0 h-2 bg-primary rounded-full transition-all duration-500"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
