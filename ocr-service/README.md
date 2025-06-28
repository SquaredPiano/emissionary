# Emissionary OCR Service - Setup and Debugging Guide

## Overview
This FastAPI service processes receipt images using OCR (Optical Character Recognition) and calculates carbon emissions for detected items. It uses PaddleOCR for text extraction and optionally integrates with Groq's LLM API for enhanced emission calculations.

## Key Issues Fixed

### 1. **PaddleOCR Initialization**
- Added error handling for PaddleOCR initialization
- Set `use_gpu=False` for CPU-only systems
- Added proper logging for debugging
- Configured optimized settings for receipt parsing

### 2. **Image Processing**
- Fixed base64 decoding (handles data URL prefixes)
- Added proper image format conversion (RGBA/P to RGB)
- Improved image preprocessing with better resizing
- Added comprehensive error handling
- Advanced preprocessing pipeline for receipt images

### 3. **Data Validation**
- Added Pydantic field validation with constraints
- Improved error messages for debugging
- Added file type and size validation

### 4. **Receipt Parsing**
- Enhanced text extraction with better regex patterns
- Improved item detection and price parsing
- Added null/empty value handling
- Better quantity extraction
- Layout-aware text processing

### 5. **LLM Integration**
- Fixed JSON parsing from Groq API responses
- Added proper error handling for API calls
- Improved prompt engineering
- Added fallback to basic calculations

### 6. **API Endpoints**
- Better error responses with detailed messages
- Improved file upload validation
- Enhanced HTML interface with loading states
- Added comprehensive health check

## Installation

### 1. Install System Dependencies

#### Ubuntu/Debian:
```bash
sudo apt-get update
sudo apt-get install -y python3-pip python3-dev
sudo apt-get install -y libgl1-mesa-glx libglib2.0-0 libsm6 libxext6 libxrender-dev libgomp1
sudo apt-get install -y libgdal-dev
```

#### macOS:
```bash
brew install python3
# OpenCV dependencies are usually handled by pip
```

#### Windows:
- Install Python 3.8+ from python.org
- Install Visual C++ Redistributable

### 2. Create Virtual Environment
```bash
python3 -m venv ocr_env
source ocr_env/bin/activate  # On Windows: ocr_env\Scripts\activate
```

### 3. Install Python Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Set Environment Variables
```bash
# Optional: For enhanced LLM features
export GROQ_API_KEY="your_actual_groq_api_key_here"
```

## Running the Service

### Development Mode
```bash
python main.py
```

### Production Mode
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

## Testing the Service

### 1. Health Check
```bash
curl http://localhost:8000/health
```

### 2. Web Interface
Open your browser to: `http://localhost:8000`

### 3. API Testing
```bash
# Test with curl
curl -X POST "http://localhost:8000/upload" \
     -H "accept: application/json" \
     -H "Content-Type: multipart/form-data" \
     -F "file=@receipt.jpg"
```

### 4. Run Test Suite
```bash
python test_ocr.py
```

## Common Issues and Solutions

### 1. **PaddleOCR Installation Issues**

**Problem**: `ImportError: libGL.so.1: cannot open shared object file`
**Solution**:
```bash
sudo apt-get install libgl1-mesa-glx
```

**Problem**: CUDA/GPU issues
**Solution**: PaddleOCR is configured to use CPU-only mode. For GPU support:
```bash
pip install paddlepaddle-gpu  # Instead of paddlepaddle
# Then change: use_gpu=True in PaddleOCR initialization
```

**Problem**: PaddleOCR model download issues
**Solution**:
```bash
# Clear PaddleOCR cache and retry
rm -rf ~/.paddleocr
python -c "from paddleocr import PaddleOCR; PaddleOCR()"
```

### 2. **OpenCV Issues**

**Problem**: OpenCV import errors
**Solution**:
```bash
pip uninstall opencv-python opencv-python-headless
pip install opencv-python==4.6.0.66
```

### 3. **Memory Issues**

**Problem**: Large image processing fails
**Solution**: 
- Reduce image size before processing
- Increase system memory
- Process images in batches

### 4. **Groq API Issues**

**Problem**: LLM enhancement not working
**Check**:
- API key is correctly set
- Network connectivity to api.groq.com
- API quota/rate limits

### 5. **Poor OCR Results**

**Troubleshooting**:
- Ensure images are high resolution (>1000px height)
- Check image quality and contrast
- Verify receipt is clearly visible and not rotated
- Test with different image formats (PNG, JPEG)
- Use the advanced preprocessing pipeline

## API Documentation

### Endpoints

#### `POST /ocr`
Process base64 encoded image
```json
{
  "image": "base64_encoded_image_data",
  "image_type": "image/jpeg",
  "user_id": "optional_user_id"
}
```

#### `POST /upload`
Upload image file directly
- Accepts: JPEG, PNG, WebP
- Max size: 10MB

#### `GET /health`
Service health check

### Response Format
```json
{
  "success": true,
  "text": "extracted_ocr_text",
  "confidence": 0.95,
  "items": [
    {
      "name": "product_name",
      "quantity": 1.0,
      "total_price": 5.99,
      "carbon_emissions": 2.3,
      "category": "dairy"
    }
  ],
  "merchant": "Store Name",
  "total": 15.99,
  "date": "2024-01-15",
  "total_carbon_emissions": 8.5,
  "processing_time": 2.1,
  "llm_enhanced": true,
  "raw_ocr_data": []
}
```

## Performance Optimization

### 1. **Image Processing**
- Resize large images before OCR
- Use appropriate image formats
- Consider batch processing
- Advanced preprocessing pipeline for better results

### 2. **Memory Management**
- Monitor memory usage with large images
- Implement image cleanup after processing
- Use streaming for large file uploads

### 3. **API Optimization**
- Cache emission factors
- Implement request rate limiting
- Use connection pooling for external APIs

## Monitoring and Logging

The service includes comprehensive logging. Key log messages:
- PaddleOCR initialization status
- Image processing errors
- LLM API call results
- Performance metrics

View logs in real-time:
```bash
tail -f /var/log/ocr_service.log
```

## Security Considerations

### Production Deployment
1. **Environment Variables**: Store API keys securely
2. **CORS**: Configure appropriate origins
3. **File Validation**: Implement strict file type checking
4. **Rate Limiting**: Add request rate limiting
5. **Authentication**: Add user authentication if needed

### Example Production Configuration
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # Specific domains
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

## Deployment

### Docker Deployment
```dockerfile
FROM python:3.9-slim

RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx libglib2.0-0 libsm6 libxext6 libxrender-dev libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Cloud Deployment
- **AWS**: Use EC2 with appropriate instance types (CPU/GPU)
- **Google Cloud**: Use Compute Engine or Cloud Run
- **Azure**: Use Container Instances or App Service

## Contributing

When modifying the code:
1. Test with various receipt formats
2. Validate against different image qualities
3. Check memory usage with large images
4. Test both with and without Groq API
5. Verify error handling paths
6. Run the test suite: `python test_ocr.py`