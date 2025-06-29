#!/bin/bash

# Start OCR Service with proper environment setup
echo "Starting OCR Service..."

# Navigate to OCR service directory
cd ocr-service

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies if needed
if [ ! -f "venv/lib/python*/site-packages/cv2" ]; then
    echo "Installing dependencies..."
    pip install -r requirements.txt
fi

# Start the OCR service
echo "Starting OCR service on http://localhost:8000"
echo "Health check: http://localhost:8000/health"
echo "Press Ctrl+C to stop"

# Run the service
python app.py 