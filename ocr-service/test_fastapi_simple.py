#!/usr/bin/env python3
"""
Simple FastAPI test to isolate OCR service issues
"""

import cv2
import numpy as np
import pytesseract
from fastapi import FastAPI, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import logging
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Simple OCR Test"}

@app.post("/test-ocr")
async def test_ocr_simple(file: UploadFile):
    """Simple OCR test endpoint"""
    try:
        logger.info(f"Received file: {file.filename}")
        
        # Read file
        start_time = time.time()
        image_bytes = await file.read()
        read_time = time.time() - start_time
        logger.info(f"File read time: {read_time:.2f}s")
        
        # Convert to numpy array
        start_time = time.time()
        img_array = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        decode_time = time.time() - start_time
        logger.info(f"Image decode time: {decode_time:.2f}s")
        logger.info(f"Image shape: {img.shape}")
        
        # Simple OCR
        start_time = time.time()
        text = pytesseract.image_to_string(img, config='--psm 6 --oem 1')
        ocr_time = time.time() - start_time
        logger.info(f"OCR time: {ocr_time:.2f}s")
        logger.info(f"Text length: {len(text)}")
        
        return JSONResponse(content={
            "success": True,
            "text": text,
            "text_length": len(text),
            "timing": {
                "read_time": read_time,
                "decode_time": decode_time,
                "ocr_time": ocr_time,
                "total_time": read_time + decode_time + ocr_time
            }
        }, status_code=200)
        
    except Exception as e:
        logger.error(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse(content={"error": str(e)}, status_code=400)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001) 