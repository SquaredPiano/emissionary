const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Emissionary MVP...\n');

// Test 1: Check if OCR service is running
async function testOCRHealth() {
  console.log('1️⃣ Testing OCR service health...');
  try {
    const response = await fetch('http://localhost:8000/health');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ OCR service is healthy:', data.status);
      return true;
    } else {
      console.log('❌ OCR service health check failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ OCR service is not running:', error.message);
    return false;
  }
}

// Test 2: Check if Next.js app is running
async function testNextJSHealth() {
  console.log('\n2️⃣ Testing Next.js app health...');
  try {
    const response = await fetch('http://localhost:3000');
    if (response.ok) {
      console.log('✅ Next.js app is running');
      return true;
    } else {
      console.log('❌ Next.js app health check failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Next.js app is not running:', error.message);
    return false;
  }
}

// Test 3: Check if MVP upload page is accessible
async function testMVPUploadPage() {
  console.log('\n3️⃣ Testing MVP upload page...');
  try {
    const response = await fetch('http://localhost:3000/mvp-upload');
    if (response.ok) {
      console.log('✅ MVP upload page is accessible');
      return true;
    } else {
      console.log('❌ MVP upload page failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ MVP upload page error:', error.message);
    return false;
  }
}

// Test 4: Check if we can get last OCR result
async function testLastOCRResult() {
  console.log('\n4️⃣ Testing last OCR result endpoint...');
  try {
    const response = await fetch('http://localhost:8000/ocr/last');
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        console.log('✅ Last OCR result available');
        console.log('   Items found:', data.data?.items?.length || 0);
        console.log('   Total emissions:', data.data?.total_carbon_emissions || 0, 'kg CO2e');
      } else {
        console.log('ℹ️  No previous OCR result (this is normal for first run)');
      }
      return true;
    } else {
      console.log('❌ Last OCR result endpoint failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Last OCR result endpoint error:', error.message);
    return false;
  }
}

// Test 5: Check if test receipt exists
function testTestReceipt() {
  console.log('\n5️⃣ Checking for test receipt...');
  const testReceiptPath = path.join(__dirname, 'ocr-service', 'receipt.png');
  if (fs.existsSync(testReceiptPath)) {
    console.log('✅ Test receipt found:', testReceiptPath);
    return true;
  } else {
    console.log('⚠️  Test receipt not found. You can use any receipt image.');
    return false;
  }
}

// Main test function
async function runTests() {
  const results = [];
  
  results.push(await testOCRHealth());
  results.push(await testNextJSHealth());
  results.push(await testMVPUploadPage());
  results.push(await testLastOCRResult());
  results.push(testTestReceipt());
  
  const passed = results.filter(Boolean).length;
  const total = results.length;
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Test Results: ${passed}/${total} passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! MVP is ready to use.');
    console.log('\n🌐 Access your MVP:');
    console.log('   📱 MVP Upload: http://localhost:3000/mvp-upload');
    console.log('   🏠 Home Page: http://localhost:3000');
    console.log('   📡 OCR Service: http://localhost:8000/health');
  } else {
    console.log('⚠️  Some tests failed. Check the services are running.');
    console.log('\n💡 To start the MVP, run: ./scripts/start-mvp.sh');
  }
  
  console.log('='.repeat(50));
}

// Run tests
runTests().catch(console.error); 