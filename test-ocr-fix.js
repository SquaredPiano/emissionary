const fs = require('fs');
const path = require('path');

async function testOCRFix() {
  console.log('🧪 Testing OCR Fix for Null Values...\n');

  // Test 1: Check OCR service health
  console.log('1. Checking OCR service health...');
  try {
    const healthResponse = await fetch('http://localhost:8000/health');
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ OCR service is healthy');
    } else {
      console.log('❌ OCR service health check failed');
      return;
    }
  } catch (error) {
    console.log('❌ OCR service is not running. Please start it first:');
    console.log('   cd ocr-service && python main.py');
    return;
  }

  // Test 2: Test with a sample receipt
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
      
      // Check for null values in items
      if (result.items && result.items.length > 0) {
        console.log('\n   Checking for null values in items:');
        let hasNullValues = false;
        result.items.forEach((item, index) => {
          const nullFields = Object.keys(item).filter(key => item[key] === null);
          if (nullFields.length > 0) {
            console.log(`   ❌ Item ${index + 1} (${item.name}): null fields = ${nullFields.join(', ')}`);
            hasNullValues = true;
          } else {
            console.log(`   ✅ Item ${index + 1} (${item.name}): No null values`);
          }
        });
        
        if (!hasNullValues) {
          console.log('\n🎉 SUCCESS: No null values found in OCR response!');
        } else {
          console.log('\n⚠️  WARNING: Some null values still present');
        }
      }
      
      // Test 3: Validate against frontend schema
      console.log('\n3. Testing schema validation...');
      try {
        const { OCRResponseSchema } = require('./src/lib/schemas');
        const validatedResult = OCRResponseSchema.parse(result);
        console.log('✅ Schema validation successful!');
        console.log('   All fields properly validated and transformed');
      } catch (error) {
        console.log('❌ Schema validation failed:');
        console.log('   Error:', error.message);
      }
    } else {
      const errorText = await response.text();
      console.log('❌ OCR processing failed:', errorText);
    }
  } catch (error) {
    console.log('❌ Error testing OCR:', error.message);
  }

  console.log('\n🎉 Test completed!');
}

testOCRFix().catch(console.error); 