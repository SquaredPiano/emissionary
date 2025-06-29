'use client';

import { useState } from 'react';

export function MVPTestButton() {
  const [isTesting, setIsTesting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTestOCR = async () => {
    setIsTesting(true);
    setError(null);
    setResult(null);
    
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
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm">
        <h3 className="font-bold text-sm mb-2">🌱 MVP Test</h3>
        
        <button
          onClick={handleTestOCR}
          disabled={isTesting}
          className="w-full px-3 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600 disabled:opacity-50"
        >
          {isTesting ? 'Testing...' : 'Test OCR Service'}
        </button>
        
        {error && (
          <div className="mt-2 p-2 bg-red-100 border border-red-400 text-red-700 text-xs rounded">
            Error: {error}
          </div>
        )}
        
        {result && (
          <div className="mt-2 p-2 bg-green-100 border border-green-400 text-green-700 text-xs rounded">
            <div className="font-bold">✅ OCR Service Working!</div>
            <div className="mt-1">
              {result.lastResult?.success ? (
                <div>
                  Last result: {result.lastResult.data?.items?.length || 0} items, 
                  {result.lastResult.data?.total_carbon_emissions?.toFixed(2) || 0} kg CO2e
                </div>
              ) : (
                <div>No previous results</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 