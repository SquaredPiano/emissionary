#!/bin/bash

echo "🚀 Starting Emissionary MVP..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${YELLOW}⚠️  Port $port is already in use${NC}"
        return 0
    else
        return 1
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    echo -e "${YELLOW}🔄 Killing process on port $port...${NC}"
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
    sleep 2
}

# Check and kill port 8000 (OCR service)
if check_port 8000; then
    echo -e "${YELLOW}Found process on port 8000. Killing it...${NC}"
    kill_port 8000
fi

# Check and kill port 3000 (Next.js)
if check_port 3000; then
    echo -e "${YELLOW}Found process on port 3000. Killing it...${NC}"
    kill_port 3000
fi

# Start OCR service
echo -e "${BLUE}📡 Starting OCR service on port 8000...${NC}"
cd ocr-service

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}⚠️  Virtual environment not found. Creating one...${NC}"
    python3 -m venv venv
fi

# Activate virtual environment and install dependencies
echo -e "${BLUE}📦 Activating virtual environment and installing dependencies...${NC}"
source venv/bin/activate
pip install -r requirements.txt

# Start OCR service in background
echo -e "${GREEN}🚀 Starting OCR service...${NC}"
python main.py &
OCR_PID=$!

# Wait a moment for OCR service to start
sleep 3

# Check if OCR service is running
if curl -s http://localhost:8000/health > /dev/null; then
    echo -e "${GREEN}✅ OCR service is running on http://localhost:8000${NC}"
else
    echo -e "${RED}❌ Failed to start OCR service${NC}"
    exit 1
fi

# Go back to root directory
cd ..

# Start Next.js app
echo -e "${BLUE}🌐 Starting Next.js app on port 3000...${NC}"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  node_modules not found. Installing dependencies...${NC}"
    npm install
fi

# Start Next.js in background
echo -e "${GREEN}🚀 Starting Next.js app...${NC}"
npm run dev &
NEXT_PID=$!

# Wait a moment for Next.js to start
sleep 5

# Check if Next.js is running
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✅ Next.js app is running on http://localhost:3000${NC}"
else
    echo -e "${RED}❌ Failed to start Next.js app${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 MVP is ready!${NC}"
echo ""
echo -e "${BLUE}📱 MVP Upload Page:${NC} http://localhost:3000/mvp-upload"
echo -e "${BLUE}🏠 Home Page:${NC} http://localhost:3000"
echo -e "${BLUE}📡 OCR Service:${NC} http://localhost:8000/health"
echo -e "${BLUE}📊 Last OCR Result:${NC} http://localhost:8000/ocr/last"
echo ""
echo -e "${YELLOW}💡 To stop the services, press Ctrl+C${NC}"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Stopping services...${NC}"
    kill $OCR_PID 2>/dev/null || true
    kill $NEXT_PID 2>/dev/null || true
    echo -e "${GREEN}✅ Services stopped${NC}"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Keep script running
wait 