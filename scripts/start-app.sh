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

# Check if Python OCR service is already running
if curl -s http://127.0.0.1:8000/health > /dev/null 2>&1; then
    print_warning "OCR service is already running on port 8000"
else
    print_status "Starting Python OCR service..."
    
    # Check if OCR service directory exists
    if [ ! -d "ocr-service" ]; then
        print_error "OCR service directory not found. Please ensure the project is properly set up."
        exit 1
    fi
    
    # Start OCR service in background
    cd ocr-service
    
    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        print_warning "Virtual environment not found. Creating one..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment and start service
    source venv/bin/activate
    
    # Check if dependencies are installed
    if ! python -c "import fastapi" > /dev/null 2>&1; then
        print_warning "Dependencies not installed. Installing..."
        pip install -r requirements.txt
    fi
    
    # Start the OCR service
    python start.py &
    OCR_PID=$!
    
    # Wait for OCR service to start
    print_status "Waiting for OCR service to start..."
    for i in {1..30}; do
        if curl -s http://127.0.0.1:8000/health > /dev/null 2>&1; then
            print_success "OCR service started successfully!"
            break
        fi
        sleep 1
    done
    
    if [ $i -eq 30 ]; then
        print_error "OCR service failed to start within 30 seconds"
        kill $OCR_PID 2>/dev/null || true
        exit 1
    fi
    
    cd ..
fi

# Check if Next.js is already running
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    print_warning "Next.js app is already running on port 3000"
else
    print_status "Starting Next.js frontend..."
    
    # Check if dependencies are installed
    if [ ! -d "node_modules" ]; then
        print_warning "Node.js dependencies not installed. Installing..."
        pnpm install
    fi
    
    # Start Next.js in background
    pnpm dev &
    NEXTJS_PID=$!
    
    # Wait for Next.js to start
    print_status "Waiting for Next.js to start..."
    for i in {1..30}; do
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            print_success "Next.js started successfully!"
            break
        fi
        sleep 1
    done
    
    if [ $i -eq 30 ]; then
        print_error "Next.js failed to start within 30 seconds"
        kill $NEXTJS_PID 2>/dev/null || true
        exit 1
    fi
fi

# Test the integration
print_status "Testing application integration..."
if curl -s http://localhost:3000/api/ocr | grep -q "healthy"; then
    print_success "✅ Application integration test passed!"
else
    print_warning "⚠️  Application integration test failed. Check the logs above."
fi

print_success "🎉 Emissionary is now running!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 OCR API:  http://127.0.0.1:8000"
echo "📊 Health:   http://localhost:3000/api/ocr"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    print_status "Shutting down services..."
    kill $OCR_PID 2>/dev/null || true
    kill $NEXTJS_PID 2>/dev/null || true
    print_success "Services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Keep script running
wait 