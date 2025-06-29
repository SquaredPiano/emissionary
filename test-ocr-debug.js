const fs = require('fs');
const path = require('path');

// Test the OCR service directly
async function testOCRService() {
  console.log('🔍 Testing OCR Service...\n');

  try {
    // Test 1: Check if OCR service is running
    console.log('1️⃣ Testing OCR service health...');
    const healthResponse = await fetch('http://127.0.0.1:8000/health');
    const healthData = await healthResponse.json();
    console.log('Health Response:', JSON.stringify(healthData, null, 2));
    console.log('');

    // Test 2: Test with Walmart receipt image
    console.log('2️⃣ Testing OCR with Walmart receipt image...');
    
    const imagePath = path.join(__dirname, 'ocr-service', 'walmart_receipt.png');
    
    if (!fs.existsSync(imagePath)) {
      console.log('❌ Walmart receipt image not found at:', imagePath);
      return;
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

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
    console.log('OCR Response Status:', ocrResponse.status);
    console.log('OCR Response Data:', JSON.stringify(ocrData, null, 2));
    console.log('');

    // Test 3: Test CLI version directly
    console.log('3️⃣ Testing CLI version directly...');
    const { execSync } = require('child_process');
    
    try {
      const cliOutput = execSync(`cd ocr-service && python main.py -i walmart_receipt.png`, { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      console.log('CLI Output:', cliOutput);
    } catch (cliError) {
      console.log('CLI Error:', cliError.message);
      if (cliError.stdout) console.log('CLI stdout:', cliError.stdout);
      if (cliError.stderr) console.log('CLI stderr:', cliError.stderr);
    }
    console.log('');

    // Test 4: Test with original receipt image via CLI
    console.log('4️⃣ Testing original receipt image via CLI...');
    
    try {
      const cliOutput2 = execSync(`cd ocr-service && python main.py -i receipt.png`, { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      console.log('CLI Output (receipt.png):', cliOutput2);
    } catch (cliError2) {
      console.log('CLI Error (receipt.png):', cliError2.message);
      if (cliError2.stdout) console.log('CLI stdout:', cliError2.stdout);
      if (cliError2.stderr) console.log('CLI stderr:', cliError2.stderr);
    }

  } catch (error) {
    console.error('❌ Error during testing:', error);
    console.error('Error stack:', error.stack);
  }
}

// Run the test
testOCRService().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
}); 