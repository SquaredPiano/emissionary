#!/usr/bin/env node

/**
 * Test OCR Service Connection
 * This script tests the connection between Next.js and the Python OCR service
 */

async function testOCRConnection() {
  console.log('🔍 Testing OCR Service Connection...\n');
  
  const ocrServiceUrl = process.env.OCR_SERVICE_URL || 'http://localhost:8000';
  const nextAppUrl = 'http://localhost:3000';
  
  console.log(`📡 OCR Service URL: ${ocrServiceUrl}`);
  console.log(`🌐 Next.js App URL: ${nextAppUrl}\n`);
  
  try {
    // Test direct connection to Python service
    console.log('1️⃣ Testing direct connection to Python OCR service...');
    const pythonResponse = await fetch(`${ocrServiceUrl}/health`);
    const pythonData = await pythonResponse.json();
    console.log(`   Status: ${pythonResponse.status}`);
    console.log(`   Data:`, pythonData);
    console.log(`   ✅ Python service is ${pythonData.status}\n`);
    
    // Test Next.js API health check
    console.log('2️⃣ Testing Next.js API health check...');
    const nextResponse = await fetch(`${nextAppUrl}/api/ocr`);
    const nextData = await nextResponse.json();
    console.log(`   Status: ${nextResponse.status}`);
    console.log(`   Data:`, nextData);
    console.log(`   ${nextData.data.status === 'healthy' ? '✅' : '❌'} Next.js reports ${nextData.data.status}\n`);
    
    // Test environment variable
    console.log('3️⃣ Checking environment variables...');
    console.log(`   OCR_SERVICE_URL: ${process.env.OCR_SERVICE_URL || 'not set (using default)'}`);
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}\n`);
    
    // Test network connectivity
    console.log('4️⃣ Testing network connectivity...');
    try {
      const testResponse = await fetch(`${ocrServiceUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      console.log(`   ✅ Network connectivity: OK (${testResponse.status})`);
    } catch (error) {
      console.log(`   ❌ Network connectivity: FAILED - ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testOCRConnection(); 