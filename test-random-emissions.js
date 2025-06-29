const fs = require('fs');
const path = require('path');

// Mock environment variables
process.env.GROQ_API_KEY = 'test-key';
process.env.FOOD_DATABASE_PATH = 'ocr-service/food_dictionary.csv';

// Import the receipt processing service
const { ReceiptProcessingService } = require('./src/lib/services/receipt-processing');

async function testRandomEmissions() {
  console.log('🧪 Testing Random Emissions Generation...\n');

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
      console.log('   Please start the OCR service: cd ocr-service && python main.py');
      return;
    }
  } catch (error) {
    console.log('❌ OCR service is not running. Please start it first:');
    console.log('   cd ocr-service && python main.py');
    return;
  }

  // Test 2: Test with a sample receipt multiple times to check for random emissions
  console.log('\n2. Testing random emissions generation...');
  
  const testResults = [];
  const numTests = 3;

  for (let i = 1; i <= numTests; i++) {
    console.log(`\n   Test ${i}/${numTests}:`);
    
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
        const items = result.items || [];
        const emissions = items.map(item => item.carbon_emissions || 0);
        
        console.log(`   ✅ Processing successful!`);
        console.log(`   📊 Items: ${items.length}, Total: ${result.total_carbon_emissions?.toFixed(2)} kg CO2e`);
        
        testResults.push({
          testNumber: i,
          totalEmissions: result.total_carbon_emissions || 0,
          itemEmissions: emissions,
          items: items
        });
        
        // Show sample emissions
        if (emissions.length > 0) {
          console.log(`   📋 Sample emissions: ${emissions.slice(0, 3).map(e => e.toFixed(2)).join(', ')} kg CO2e`);
        }
      } else {
        const errorText = await response.text();
        console.log(`   ❌ Processing failed: ${errorText}`);
      }
    } catch (error) {
      console.log(`   ❌ Error in test ${i}: ${error.message}`);
    }
  }

  // Analyze results
  console.log('\n3. Analyzing results for random emissions...');
  
  if (testResults.length === 0) {
    console.log('❌ No successful tests to analyze');
    return;
  }

  // Check if total emissions vary between tests
  const totalEmissions = testResults.map(r => r.totalEmissions);
  const uniqueTotals = new Set(totalEmissions.map(e => e.toFixed(2)));
  
  console.log(`📊 Total emissions across ${testResults.length} tests:`);
  totalEmissions.forEach((em, i) => {
    console.log(`   Test ${i + 1}: ${em.toFixed(2)} kg CO2e`);
  });
  
  console.log(`\n🔍 Analysis:`);
  console.log(`   - Unique total emissions: ${uniqueTotals.size}`);
  console.log(`   - Tests with different totals: ${uniqueTotals.size > 1 ? '✅ YES' : '❌ NO'}`);
  
  // Check individual item emissions
  const allItemEmissions = testResults.flatMap(r => r.itemEmissions);
  const uniqueItemEmissions = new Set(allItemEmissions.map(e => e.toFixed(2)));
  
  console.log(`   - Total item emissions: ${allItemEmissions.length}`);
  console.log(`   - Unique item emissions: ${uniqueItemEmissions.size}`);
  console.log(`   - Items with varied emissions: ${uniqueItemEmissions.size > 1 ? '✅ YES' : '❌ NO'}`);
  
  // Final verdict
  console.log(`\n🎯 Final Verdict:`);
  if (uniqueTotals.size > 1 && uniqueItemEmissions.size > 1) {
    console.log(`✅ SUCCESS: Random emissions generation is working!`);
    console.log(`   Emissions values are varying between tests and items.`);
  } else if (uniqueTotals.size > 1) {
    console.log(`⚠️  PARTIAL: Total emissions vary, but individual items may not.`);
  } else if (uniqueItemEmissions.size > 1) {
    console.log(`⚠️  PARTIAL: Individual item emissions vary, but totals may not.`);
  } else {
    console.log(`❌ FAILURE: All emissions values are the same!`);
    console.log(`   This indicates the random generation is not working properly.`);
  }

  console.log('\n🏁 Test completed!');
}

testRandomEmissions().catch(error => {
  console.error('💥 Test crashed:', error);
  process.exit(1);
}); 