const fs = require('fs');
const path = require('path');

async function testOCRSimple() {
  console.log('🧪 Simple OCR Test...\n');

  // Test 1: Check OCR service health
  console.log('1. Checking OCR service health...');
  try {
    const healthResponse = await fetch('http://localhost:8000/health');
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ OCR service is healthy');
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

  // Test 2: Test with a simple receipt
  console.log('\n2. Testing OCR with sample receipt...');
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
      
      // Check for unrealistic emissions
      if (result.total_carbon_emissions > 100) {
        console.log('⚠️  WARNING: Very high emissions detected!');
        console.log('   This might indicate an issue with the calculation.');
      }
      
      if (result.items && result.items.length > 0) {
        console.log('\n   Items with emissions:');
        result.items.forEach(item => {
          const emissions = item.carbon_emissions || 0;
          const status = emissions > 50 ? '⚠️  HIGH' : emissions > 10 ? '⚠️  MEDIUM' : '✅ OK';
          console.log(`   ${status} ${item.name}: ${emissions.toFixed(2)} kg CO2e (${item.category || 'unknown'})`);
        });
      }
    } else {
      const errorText = await response.text();
      console.log('❌ OCR processing failed:', errorText);
    }
  } catch (error) {
    console.log('❌ Error testing OCR:', error.message);
  }

  console.log('\n🎉 Simple test completed!');
}

testOCRSimple().catch(console.error); 