const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Test the complete flow: OCR → Database → Retrieval
async function testCompleteFlow() {
  console.log('🧪 Testing Complete Flow: OCR → Database → Retrieval\n');

  // Step 1: Test OCR Service directly
  console.log('1️⃣ Testing OCR Service...');
  try {
    const imageBuffer = fs.readFileSync('ocr-service/walmart_receipt.png');
    const base64Image = imageBuffer.toString('base64');
    
    const ocrResponse = await fetch('http://127.0.0.1:8000/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: base64Image,
        image_type: 'image/png'
      })
    });

    if (!ocrResponse.ok) {
      throw new Error(`OCR service error: ${ocrResponse.status}`);
    }

    const ocrResult = await ocrResponse.json();
    console.log('✅ OCR Service Response:');
    console.log(`   Success: ${ocrResult.success}`);
    console.log(`   Items: ${ocrResult.items?.length || 0}`);
    console.log(`   Total Carbon Emissions: ${ocrResult.total_carbon_emissions}`);
    console.log(`   Processing Time: ${ocrResult.processing_time}s`);
    
    if (ocrResult.items && ocrResult.items.length > 0) {
      console.log('   Sample Item:', {
        name: ocrResult.items[0].name,
        carbon_emissions: ocrResult.items[0].carbon_emissions,
        category: ocrResult.items[0].category
      });
    }

  } catch (error) {
    console.error('❌ OCR Service Test Failed:', error.message);
    return;
  }

  // Step 2: Test Database Connection
  console.log('\n2️⃣ Testing Database Connection...');
  try {
    // Load environment variables
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const envVars = {};
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim().replace(/"/g, '');
      }
    });

    const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials in .env.local');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test database connection
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (userError) {
      throw new Error(`Database connection failed: ${userError.message}`);
    }

    console.log('✅ Database Connection: Success');

    // Test receipts table
    const { data: receipts, error: receiptError } = await supabase
      .from('receipts')
      .select('id, total_carbon_emissions')
      .limit(5);

    if (receiptError) {
      throw new Error(`Receipts table error: ${receiptError.message}`);
    }

    console.log(`✅ Receipts Table: ${receipts?.length || 0} receipts found`);
    if (receipts && receipts.length > 0) {
      console.log('   Sample Receipt:', {
        id: receipts[0].id,
        total_carbon_emissions: receipts[0].total_carbon_emissions
      });
    }

  } catch (error) {
    console.error('❌ Database Test Failed:', error.message);
    return;
  }

  // Step 3: Test Next.js API (if running)
  console.log('\n3️⃣ Testing Next.js API...');
  try {
    const apiResponse = await fetch('http://localhost:3000/api/emissions/stats', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Note: This would need authentication in a real test
      }
    });

    if (apiResponse.status === 401) {
      console.log('⚠️  API requires authentication (expected)');
    } else if (apiResponse.ok) {
      const apiResult = await apiResponse.json();
      console.log('✅ Next.js API Response:', apiResult);
    } else {
      console.log(`⚠️  API returned status: ${apiResponse.status}`);
    }

  } catch (error) {
    console.log('⚠️  Next.js API not available (server may not be running)');
  }

  console.log('\n🎯 Flow Test Summary:');
  console.log('   OCR Service: ✅ Working');
  console.log('   Database: ✅ Connected');
  console.log('   Next.js API: ⚠️  Needs authentication');
  console.log('\n💡 Next Steps:');
  console.log('   1. Ensure Next.js dev server is running');
  console.log('   2. Test with authenticated user session');
  console.log('   3. Upload a receipt through the UI');
}

// Run the test
testCompleteFlow().catch(console.error); 