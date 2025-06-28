# Emissionary OCR Service

A FastAPI-based microservice for extracting text and item information from grocery receipts using EasyOCR.

## Features

- **OCR Processing**: Uses EasyOCR for robust text extraction
- **Image Preprocessing**: Automatic image enhancement for better OCR results
- **Receipt Parsing**: Extracts items, merchant, total, and date from receipts
- **REST API**: Simple HTTP interface for integration
- **CORS Support**: Configured for web application integration

## Setup

### Prerequisites

- Python 3.8+
- pip or conda

### Installation

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the service:
```bash
python main.py
```

The service will be available at `http://localhost:8000`

## API Endpoints

### POST /ocr

Process a receipt image and extract information.

**Request Body:**
```json
{
  "image": "base64_encoded_image_data",
  "image_type": "image/jpeg"
}
```

**Response:**
```json
{
  "success": true,
  "text": "extracted text from receipt",
  "confidence": 0.85,
  "items": [
    {
      "name": "Milk",
      "quantity": 1,
      "unit_price": 3.99,
      "total_price": 3.99,
      "category": null,
      "brand": null
    }
  ],
  "merchant": "Grocery Store",
  "total": 25.50,
  "date": "2024-01-15"
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "OCR"
}
```

## Deployment

### Local Development

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Production Deployment

#### Using Docker

1. Create a Dockerfile:
```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

2. Build and run:
```bash
docker build -t emissionary-ocr .
docker run -p 8000:8000 emissionary-ocr
```

#### Using Railway

1. Install Railway CLI
2. Deploy:
```bash
railway login
railway init
railway up
```

#### Using Render

1. Connect your repository to Render
2. Create a new Web Service
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

## Environment Variables

- `PORT`: Port to run the service on (default: 8000)
- `CORS_ORIGINS`: Comma-separated list of allowed origins (default: "*")

## Integration with Emissionary

This service is designed to work with the Emissionary Next.js application. The frontend sends base64-encoded images to the `/ocr` endpoint and receives structured data for carbon footprint calculations.

## Performance Notes

- First OCR run may be slow due to model loading
- Image preprocessing improves accuracy but adds processing time
- Consider caching for frequently processed images
- Monitor memory usage with large images

## Troubleshooting

### Common Issues

1. **EasyOCR installation fails**: Try installing system dependencies first:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install libgl1-mesa-glx libglib2.0-0
   
   # macOS
   brew install opencv
   ```

2. **Memory issues**: Reduce image size or use smaller OCR models

3. **CORS errors**: Configure CORS_ORIGINS environment variable

### Logs

Enable debug logging by setting the log level:
```bash
uvicorn main:app --log-level debug
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details 