const fs = require('fs');
const path = require('path');

// Test the robust OCR service
async function testRobustOCR() {
  console.log('🔍 Testing Robust OCR Pipeline...\n');

  const testImages = [
    { name: 'Walmart Receipt', file: 'walmart_receipt.png' },
    { name: 'Original Receipt', file: 'receipt.png' }
  ];

  for (const testImage of testImages) {
    console.log(`\n📄 Testing: ${testImage.name}`);
    console.log('='.repeat(50));
    
    try {
      const imagePath = path.join(__dirname, 'ocr-service', testImage.file);
      
      if (!fs.existsSync(imagePath)) {
        console.log(`❌ Image not found: ${imagePath}`);
        continue;
      }

      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');

      console.log(`📊 Image size: ${(imageBuffer.length / 1024).toFixed(1)} KB`);

      // Test the robust OCR service
      const ocrResponse = await fetch('http://127.0.0.1:8000/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image
        })
      });

      const ocrData = await ocrResponse.json();
      
      console.log(`✅ Status: ${ocrResponse.status}`);
      console.log(`📝 Text Length: ${ocrData.text_length || ocrData.text?.length || 0} characters`);
      console.log(`🛒 Items Found: ${ocrData.items?.length || 0}`);
      console.log(`🏪 Merchant: ${ocrData.merchant || 'Unknown'}`);
      console.log(`💰 Total: ${ocrData.total || 'Unknown'}`);
      console.log(`🌱 Carbon Emissions: ${ocrData.total_carbon_emissions || 0}`);
      
      console.log('\n📄 Raw Text (first 300 chars):');
      console.log('-'.repeat(40));
      const preview = (ocrData.text || '').substring(0, 300).replace(/\n/g, '\\n');
      console.log(preview);
      
      if (ocrData.items && ocrData.items.length > 0) {
        console.log('\n🛒 Parsed Items:');
        console.log('-'.repeat(40));
        ocrData.items.forEach((item, index) => {
          console.log(`${index + 1}. ${item.name} - $${item.total_price} (${item.category})`);
        });
      }
      
      console.log('\n📁 Debug Images Generated:');
      const debugFiles = fs.readdirSync(path.join(__dirname, 'ocr-service'))
        .filter(file => file.startsWith('debug_') && file.endsWith('.png'));
      debugFiles.forEach(file => console.log(`  - ${file}`));

    } catch (error) {
      console.error(`❌ Error testing ${testImage.name}:`, error.message);
    }
  }

  console.log('\n🎯 Test Summary:');
  console.log('='.repeat(50));
  console.log('The robust OCR pipeline now uses:');
  console.log('• 7 different preprocessing techniques');
  console.log('• 5 different PSM modes');
  console.log('• 2 different OEM modes');
  console.log('• Confidence scoring based on receipt indicators');
  console.log('• Comprehensive fallback strategies');
  console.log('• Detailed logging and debug image generation');
}

// Run the test
testRobustOCR().then(() => {
  console.log('\n✅ Robust OCR test completed');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
}); 