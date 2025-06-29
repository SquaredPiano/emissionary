'use client';

import { useState } from 'react';

export default function SimpleMVPPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTestOCR = async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Test the OCR service health
      const healthResponse = await fetch('http://localhost:8000/health');
      if (!healthResponse.ok) {
        throw new Error('OCR service not responding');
      }
      
      // Test the last OCR result
      const lastResponse = await fetch('http://localhost:8000/ocr/last');
      const lastResult = await lastResponse.json();
      
      setResult({
        health: 'OK',
        lastResult: lastResult
      });
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🌱 Simple MVP Test</h1>
      
      <div className="space-y-4">
        <button
          onClick={handleTestOCR}
          disabled={isProcessing}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isProcessing ? 'Testing...' : 'Test OCR Service'}
        </button>
        
        {error && (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            Error: {error}
          </div>
        )}
        
        {result && (
          <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            <h3 className="font-bold">Test Results:</h3>
            <pre className="mt-2 text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
} 