#!/bin/bash
set -e
cd "$(dirname "$0")"

# Activate virtual environment
source venv/bin/activate

# Kill any running OCR service
pkill -f "uvicorn app:app" || true
sleep 2

# Start the OCR FastAPI service
nohup uvicorn app:app --host 0.0.0.0 --port 8000 > ocr_service.log 2>&1 &
echo "OCR service started on port 8000. Logs: ocr_service.log" 