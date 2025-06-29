#!/bin/bash

# Emissionary OCR Service Setup Script
# This script sets up the Python OCR service with all dependencies

set -e  # Exit on any error

echo "🚀 Setting up Emissionary OCR Service..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Navigate to OCR service directory
cd ocr-service

print_status "Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
print_success "Python version: $PYTHON_VERSION"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    print_status "Creating virtual environment..."
    python3 -m venv venv
    print_success "Virtual environment created"
else
    print_status "Virtual environment already exists"
fi

# Activate virtual environment
print_status "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
print_status "Upgrading pip..."
pip install --upgrade pip

# Install dependencies
print_status "Installing Python dependencies..."
pip install -r requirements.txt

# Test OCR service
print_status "Testing OCR service..."
python -c "
import sys
try:
    import fastapi
    import uvicorn
    import cv2
    import numpy as np
    from PIL import Image
    from paddleocr import PaddleOCR
    print('✅ All dependencies imported successfully')
except ImportError as e:
    print(f'❌ Import error: {e}')
    sys.exit(1)
"

if [ $? -eq 0 ]; then
    print_success "All dependencies are working correctly"
else
    print_error "Dependency test failed"
    exit 1
fi

# Test PaddleOCR initialization
print_status "Testing PaddleOCR initialization..."
python -c "
from paddleocr import PaddleOCR
try:
    ocr = PaddleOCR(use_gpu=False, show_log=False)
    print('✅ PaddleOCR initialized successfully')
except Exception as e:
    print(f'❌ PaddleOCR initialization failed: {e}')
    exit(1)
"

if [ $? -eq 0 ]; then
    print_success "PaddleOCR is working correctly"
else
    print_error "PaddleOCR test failed"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    print_status "Creating .env file from template..."
    cp env.example .env
    print_success ".env file created"
else
    print_status ".env file already exists"
fi

# Test the startup script
print_status "Testing startup script..."
python start.py --help 2>/dev/null || python -c "import start; print('✅ Startup script is valid')"

print_success "OCR service setup completed successfully!"
print_status "To start the OCR service, run:"
echo "  cd ocr-service"
echo "  source venv/bin/activate"
echo "  python start.py"
echo ""
print_status "Or from the project root:"
echo "  npm run ocr:start"
echo ""
print_status "To test the service:"
echo "  npm run ocr:health" 