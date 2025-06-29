const fs = require('fs');
const path = require('path');

async function testOCRIntegration() {
  console.log('🧪 Testing OCR Integration...\n');

  // Test 1: Check if OCR service is running
  console.log('1. Checking OCR service health...');
  try {
    const healthResponse = await fetch('http://localhost:8000/health');
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ OCR service is healthy:', healthData.status);
      console.log('   Database stats:', healthData.database_stats);
    } else {
      console.log('❌ OCR service health check failed');
      return;
    }
  } catch (error) {
    console.log('❌ OCR service is not running. Please start it first:');
    console.log('   cd ocr-service && python main.py');
    return;
  }

  // Test 2: Test with a sample image
  console.log('\n2. Testing OCR with sample image...');
  try {
    const imagePath = path.join(__dirname, 'ocr-service', 'receipt.png');
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const response = await fetch('http://localhost:8000/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image,
        image_type: 'image/png'
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ OCR processing successful!');
      console.log('   Items found:', result.items?.length || 0);
      console.log('   Total emissions:', result.total_carbon_emissions?.toFixed(2) + ' kg CO2e');
      console.log('   Processing time:', result.processing_time?.toFixed(2) + 's');
      
      if (result.items && result.items.length > 0) {
        console.log('\n   Sample items:');
        result.items.slice(0, 3).forEach(item => {
          console.log(`   - ${item.name}: ${item.carbon_emissions?.toFixed(2) || 'N/A'} kg CO2e`);
        });
      }
    } else {
      const errorText = await response.text();
      console.log('❌ OCR processing failed:', errorText);
    }
  } catch (error) {
    console.log('❌ Error testing OCR:', error.message);
  }

  // Test 3: Test frontend integration
  console.log('\n3. Testing frontend integration...');
  try {
    const response = await fetch('http://localhost:3000/api/ocr', {
      method: 'GET'
    });
    
    if (response.ok) {
      console.log('✅ Frontend OCR endpoint is accessible');
    } else {
      console.log('❌ Frontend OCR endpoint not accessible');
    }
  } catch (error) {
    console.log('❌ Frontend not running or OCR endpoint not accessible');
  }

  console.log('\n🎉 Integration test completed!');
  console.log('\nTo test the full flow:');
  console.log('1. Start the OCR service: cd ocr-service && python main.py');
  console.log('2. Start the frontend: npm run dev');
  console.log('3. Go to http://localhost:3000/upload');
  console.log('4. Upload a receipt image');
}

testOCRIntegration().catch(console.error); 