#!/bin/bash

# Start OCR Service
echo "Starting OCR Service..."
cd ocr-service

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install requirements
echo "Installing requirements..."
pip install -r requirements.txt

# Start the service
echo "Starting OCR service on http://localhost:8000"
python main.py 