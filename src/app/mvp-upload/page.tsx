'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileImage, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface OCRResult {
  success: boolean;
  data?: {
    items?: Array<{
      name: string;
      category: string;
      carbon_emissions: number;
      estimated_weight_kg: number;
      source: string;
    }>;
    total_carbon_emissions: number;
    processing_time: number;
    merchant: string;
    total: number;
  };
  error?: string;
}

export default function MVPUploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      setOcrResult(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      toast({
        title: "File selected",
        description: `${file.name} is ready for processing.`,
      });
    }
  };

  const handleProcessReceipt = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);
    
    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1]; // Remove data URL prefix
          resolve(base64);
        };
        reader.readAsDataURL(selectedFile);
      });

      // Send to OCR service
      const response = await fetch('http://localhost:8000/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64,
          image_type: selectedFile.type,
        }),
      });

      if (!response.ok) {
        throw new Error(`OCR service error: ${response.status} ${response.statusText}`);
      }

      const result: OCRResult = await response.json();
      setOcrResult(result);

      if (result.success) {
        toast({
          title: "Receipt processed successfully!",
          description: `Found ${result.data?.items?.length || 0} items with ${result.data?.total_carbon_emissions?.toFixed(2) || 0} kg CO2e emissions.`,
        });
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

  const handleGetLastResult = async () => {
    try {
      const response = await fetch('http://localhost:8000/ocr/last');
      const result: OCRResult = await response.json();
      setOcrResult(result);
      
      if (result.success) {
        toast({
          title: "Last result retrieved",
          description: `Found ${result.data?.items?.length || 0} items.`,
        });
      } else {
        toast({
          title: "No previous result",
          description: result.error || "No OCR result found.",
        });
      }
    } catch (error) {
      toast({
        title: "Error retrieving last result",
        description: "Failed to connect to OCR service.",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreview(null);
    setOcrResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">🌱 Emissionary MVP</h1>
          <p className="text-lg text-gray-600">
            Upload a receipt to see carbon emissions analysis
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upload Section */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Receipt
              </CardTitle>
              <CardDescription>
                Upload a photo of your grocery receipt to calculate carbon emissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedFile ? (
                <div className="border-2 border-dashed rounded-lg p-8 text-center transition-colors border-gray-300 hover:border-green-500">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <span className="text-lg font-medium mb-2">Click to upload</span>
                    <span className="text-sm text-gray-500">
                      PNG, JPG, JPEG up to 10MB
                    </span>
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    {preview && (
                      <div className="relative rounded-lg overflow-hidden border border-gray-200">
                        <img 
                          src={preview} 
                          alt="Receipt preview" 
                          className="w-full h-64 object-contain bg-gray-50"
                        />
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                      <FileImage className="h-4 w-4" />
                      <span>{selectedFile.name}</span>
                      <span>({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleProcessReceipt} 
                      disabled={isProcessing}
                      className="flex-1"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Process Receipt
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleReset}
                      disabled={isProcessing}
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Results
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGetLastResult}
                  disabled={isProcessing}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Get Last Result
                </Button>
              </div>
              <CardDescription>
                Carbon emissions analysis from your receipt
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!ocrResult ? (
                <div className="text-center py-8 text-gray-500">
                  <FileImage className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Upload a receipt to see results</p>
                </div>
              ) : ocrResult.success && ocrResult.data ? (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-green-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Total Emissions</p>
                      <p className="text-2xl font-bold text-green-700">
                        {ocrResult.data.total_carbon_emissions?.toFixed(2) || 0} kg CO2e
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Items Found</p>
                      <p className="text-2xl font-bold text-green-700">
                        {ocrResult.data.items?.length || 0}
                      </p>
                    </div>
                  </div>

                  {/* Receipt Info */}
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      <strong>Merchant:</strong> {ocrResult.data.merchant || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Total:</strong> ${ocrResult.data.total?.toFixed(2) || 0}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Processing Time:</strong> {ocrResult.data.processing_time?.toFixed(2) || 0}s
                    </p>
                  </div>

                  {/* Items List */}
                  {ocrResult.data.items && ocrResult.data.items.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Items with Emissions:</h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {ocrResult.data.items.map((item, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-sm text-gray-600">{item.category}</p>
                              {item.source && (
                                <p className="text-xs text-blue-600">Source: {item.source}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-green-700">
                                {item.carbon_emissions?.toFixed(2) || 0} kg CO2e
                              </p>
                              <p className="text-xs text-gray-500">
                                {item.estimated_weight_kg ? `${item.estimated_weight_kg}kg` : 'Unknown weight'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-red-500">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                  <p>{ocrResult.error || 'Failed to process receipt'}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>🌱 Emissionary MVP - Carbon emissions from your receipts</p>
        </div>
      </div>
    </div>
  );
} 