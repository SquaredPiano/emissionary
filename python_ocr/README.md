# Python OCR Service Setup

This service provides OCR (Optical Character Recognition) processing for receipt images using Python, OpenCV, Tesseract, and OpenAI.

## Prerequisites

1. **Python 3.8+** installed
2. **Tesseract OCR** installed on your system
3. **OpenAI API Key** (already in your .env)

## Installation Steps

### 1. Install Tesseract OCR

**Windows:**
```bash
# Download and install from: https://github.com/UB-Mannheim/tesseract/wiki
# Add Tesseract to your PATH environment variable
```

**macOS:**
```bash
brew install tesseract
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install tesseract-ocr
```

### 2. Setup Python Environment

```bash
# Navigate to the python_ocr directory
cd python_ocr

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Environment

Create a `.env` file in the `python_ocr` directory:
```
OPENAI_API_KEY=your_openai_api_key_here
FLASK_ENV=development
```

### 4. Run the Service

```bash
# From the python_ocr directory with venv activated
python app.py
```

The service will run on `http://localhost:5000`

## API Endpoints

### POST /api/ocr/process
Process a receipt image and return structured data.

**Request:**
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."
}
```

**Response:**
```json
{
  "success": true,
  "raw_text": "WHOLE FOODS MARKET\n2 LB ORGANIC APPLES $6.99\n1 GAL MILK $3.49\nTOTAL: $10.48",
  "parsed_data": {
    "store_name": "Whole Foods Market",
    "items": [
      {
        "item_name": "Organic Apples",
        "quantity": "2 lb",
        "unit_price": 6.99
      },
      {
        "item_name": "Milk",
        "quantity": "1 gallon",
        "unit_price": 3.49
      }
    ],
    "total_amount": 10.48,
    "date": null
  },
  "processing_info": {
    "ocr_engine": "Tesseract",
    "ai_parser": "OpenAI GPT-4"
  }
}
```

### GET /api/ocr/health
Health check endpoint.

## Integration with Next.js

The Python service integrates with your Next.js app through the `/api/ocr/process` route. When a user uploads a receipt image:

1. Next.js receives the file upload
2. Converts image to base64
3. Sends to Python Flask service
4. Python processes with OCR + AI parsing
5. Returns structured data to Next.js
6. Next.js can then calculate emissions using the parsed items

## Troubleshooting

**Tesseract not found:**
- Ensure Tesseract is installed and in your PATH
- On Windows, you might need to set the tesseract path in the Python code

**OpenCV issues:**
- Try installing without headless: `pip install opencv-python`
- On some systems: `pip install opencv-python-headless`

**CORS errors:**
- The Flask app includes CORS headers for Next.js integration
- Ensure both services are running on the correct ports 