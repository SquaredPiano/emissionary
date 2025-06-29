# OCR Integration Testing Guide

## 🚀 Quick Start

### 1. Start the OCR Service

```bash
# Option 1: Use the script
./scripts/start-ocr.sh

# Option 2: Manual start
cd ocr-service
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

The OCR service will start on `http://localhost:8000`

### 2. Start the Frontend

```bash
# In a new terminal
npm run dev
```

The frontend will start on `http://localhost:3000`

### 3. Test the Integration

```bash
# Run the integration test
node test-ocr-integration.js
```

## 🧪 Testing Steps

### Step 1: Verify OCR Service Health

Visit `http://localhost:8000/health` in your browser or run:

```bash
curl http://localhost:8000/health
```

You should see:
```json
{
  "status": "healthy",
  "service": "Clean OCR Service v4.0",
  "timestamp": "2024-01-XX...",
  "database_stats": {
    "total_items": 76,
    "categories": 8,
    "avg_co2_per_kg": 2.34,
    "min_co2_per_kg": 0.1,
    "max_co2_per_kg": 13.3
  }
}
```

### Step 2: Test OCR Processing

Visit `http://localhost:8000/` to see the service dashboard, or test with a sample image:

```bash
# Test with the included sample receipt
curl -X POST http://localhost:8000/ocr \
  -H "Content-Type: application/json" \
  -d '{
    "image": "'$(base64 -i ocr-service/receipt.png)'",
    "image_type": "image/png"
  }'
```

### Step 3: Test Frontend Integration

1. Go to `http://localhost:3000/upload`
2. Upload a receipt image
3. Check the results

## 📁 File Structure

```
emissionary/
├── ocr-service/
│   ├── main.py              # Main OCR service (FastAPI)
│   ├── emissions_db.py      # Carbon footprint database
│   ├── requirements.txt     # Python dependencies
│   └── receipt.png          # Sample receipt for testing
├── src/
│   ├── app/api/ocr/route.ts # Frontend OCR API endpoint
│   └── lib/services/ocr.ts  # Frontend OCR service
├── scripts/
│   └── start-ocr.sh         # OCR service startup script
└── test-ocr-integration.js  # Integration test script
```

## 🔧 Configuration

### Environment Variables

The OCR service uses these environment variables (optional):

```bash
# OCR Service Configuration
OCR_HOST=0.0.0.0
OCR_PORT=8000
OCR_RELOAD=false
OCR_WORKERS=1

# Logging Configuration
LOG_LEVEL=INFO

# Groq AI Configuration (optional - for enhanced classification)
GROQ_API_KEY=your_groq_api_key_here
```

### Frontend Configuration

The frontend expects the OCR service URL:

```bash
# In your .env.local
OCR_SERVICE_URL=http://localhost:8000
```

## 🐛 Troubleshooting

### OCR Service Won't Start

1. **Check Python version**: Ensure you have Python 3.8+
2. **Check dependencies**: Run `pip install -r requirements.txt`
3. **Check port**: Ensure port 8000 is not in use
4. **Check Tesseract**: Ensure Tesseract OCR is installed

### OCR Service Not Responding

1. **Check if running**: `curl http://localhost:8000/health`
2. **Check logs**: Look at the terminal output
3. **Check firewall**: Ensure port 8000 is accessible

### Frontend Can't Connect

1. **Check OCR service**: Ensure it's running on port 8000
2. **Check CORS**: The OCR service allows all origins
3. **Check environment**: Ensure `OCR_SERVICE_URL` is set correctly

### Poor OCR Results

1. **Image quality**: Ensure the receipt image is clear and well-lit
2. **Image size**: Larger images work better (min 1000px height)
3. **Image format**: JPEG, PNG, WebP are supported
4. **Receipt type**: Works best with standard grocery receipts

## 📊 Expected Results

### Sample OCR Response

```json
{
  "success": true,
  "text": "WALMART...",
  "confidence": 0.85,
  "items": [
    {
      "name": "banana",
      "quantity": 1.0,
      "unit_price": 0.59,
      "total_price": 0.59,
      "category": "fruits",
      "carbon_emissions": 0.48,
      "confidence": 0.9,
      "estimated_weight_kg": 0.12,
      "source": "database"
    }
  ],
  "merchant": "WALMART",
  "total": 45.67,
  "date": "2024-01-15",
  "total_carbon_emissions": 12.34,
  "processing_time": 2.45,
  "database_stats": {
    "total_items": 76,
    "categories": 8
  }
}
```

## 🎯 Features

- ✅ Advanced OCR with multiple Tesseract configurations
- ✅ Comprehensive carbon footprint calculation
- ✅ Built-in emissions database with 76 food items
- ✅ Smart item categorization and weight estimation
- ✅ Groq AI integration for enhanced classification (optional)
- ✅ Fast processing (< 5 seconds typical)
- ✅ CORS enabled for frontend integration
- ✅ Health check endpoint
- ✅ Error handling and validation

## 🚀 Production Deployment

For production, consider:

1. **Environment variables**: Set proper API keys and URLs
2. **Security**: Configure CORS properly
3. **Monitoring**: Add logging and metrics
4. **Scaling**: Use multiple workers
5. **SSL**: Add HTTPS support

## 📝 Notes

- The OCR service is designed to work with standard grocery receipts
- Carbon emissions are calculated using a comprehensive database
- Processing time is typically 2-5 seconds
- The service includes fallback mechanisms for unknown items
- Groq AI integration is optional but improves accuracy 