#!/bin/bash

# Emissionary App Startup Script
# This script starts both the Python OCR service and Next.js frontend

set -e  # Exit on any error

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

print_status "🚀 Starting Emissionary Application..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_error "Error: .env file not found. Please copy env.example to .env and configure your environment variables."
    exit 1
fi

# Start OCR service in background
print_status "Starting OCR service..."
cd ocr-service

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    print_warning "Creating OCR virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment and install dependencies
source venv/bin/activate
pip install -r requirements.txt > /dev/null 2>&1

# Start OCR service in background
print_status "Starting OCR service on http://localhost:8000"
python app.py &
OCR_PID=$!

# Wait a moment for OCR service to start
sleep 3

# Check if OCR service is running
if ! curl -s http://localhost:8000/health > /dev/null; then
    print_warning "Warning: OCR service may not be running properly"
else
    print_success "OCR service is running"
fi

# Go back to root directory
cd ..

# Start Next.js development server
print_status "Starting Next.js development server..."
print_status "Frontend will be available at http://localhost:3000"
print_status "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    print_status "Stopping services..."
    if [ ! -z "$OCR_PID" ]; then
        kill $OCR_PID 2>/dev/null
    fi
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Start Next.js
pnpm dev

# Cleanup when Next.js exits
cleanup 