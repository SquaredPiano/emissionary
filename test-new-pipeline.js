const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Simple HTTP client
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    if (options.body) {
      requestOptions.headers['Content-Length'] = Buffer.byteLength(options.body);
    }

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

// Test the new pipeline
async function testNewPipeline() {
  console.log('🧪 Testing New Receipt Processing Pipeline...\n');

  // Test 1: OCR Service Health
  console.log('1. Testing OCR Service Health...');
  try {
    const healthResponse = await makeRequest('http://127.0.0.1:8000/health');
    console.log('✅ OCR Service:', healthResponse.data);
  } catch (error) {
    console.log('❌ OCR Service Error:', error.message);
    return;
  }

  // Test 2: Next.js Frontend
  console.log('\n2. Testing Next.js Frontend...');
  try {
    const frontendResponse = await makeRequest('http://127.0.0.1:3000');
    if (frontendResponse.status === 200) {
      console.log('✅ Next.js Frontend: Running');
    } else {
      console.log('❌ Next.js Frontend Error:', frontendResponse.status);
    }
  } catch (error) {
    console.log('❌ Next.js Frontend Error:', error.message);
  }

  // Test 3: Test OCR with a sample image
  console.log('\n3. Testing OCR with Sample Image...');
  try {
    const imagePath = path.join(__dirname, 'ocr-service', 'receipt.png');
    if (fs.existsSync(imagePath)) {
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      
      const ocrResponse = await makeRequest('http://127.0.0.1:8000/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
          image_type: 'image/png'
        })
      });
      
      console.log('✅ OCR Response:', {
        success: ocrResponse.data.success,
        textLength: ocrResponse.data.text?.length || 0,
        hasText: !!ocrResponse.data.text
      });
      
      if (ocrResponse.data.text) {
        console.log('📄 Sample OCR Text:', ocrResponse.data.text.substring(0, 200) + '...');
      }
    } else {
      console.log('⚠️  No sample image found at:', imagePath);
    }
  } catch (error) {
    console.log('❌ OCR Test Error:', error.message);
  }

  console.log('\n🎉 Pipeline Test Complete!');
  console.log('\n📋 Next Steps:');
  console.log('1. Upload a receipt through the frontend at http://127.0.0.1:3000');
  console.log('2. The new pipeline will:');
  console.log('   - Extract text with OCR');
  console.log('   - Parse items with Groq AI');
  console.log('   - Match with your food database');
  console.log('   - Calculate emissions');
  console.log('   - Store results in the database');
  console.log('3. Check the logs for detailed processing information');
}

// Run the test
testNewPipeline().catch(console.error); 