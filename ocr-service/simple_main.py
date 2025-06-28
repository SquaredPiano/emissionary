"""
Simple version of the OCR service for testing and development.
This file provides a simplified implementation using PaddleOCR.
For production use, see main.py for the full implementation with advanced features.
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
import cv2
import numpy as np
from PIL import Image
import base64
import io
import re
from typing import List, Optional, Dict, Any
import json
from datetime import datetime
import os
import pytesseract
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
MIN_IMAGE_HEIGHT = 1000
CLAHE_CLIP_LIMIT = 2.0
CLAHE_TILE_GRID_SIZE = (8, 8)

app = FastAPI(title="Emissionary OCR Service", version="2.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class OCRRequest(BaseModel):
    image: str  # Base64 encoded image
    image_type: str = Field(default="image/jpeg", description="Image MIME type")
    user_id: Optional[str] = Field(default=None, description="For tracking user emissions")

class ReceiptItem(BaseModel):
    name: str
    quantity: float = Field(default=1.0, ge=0)
    unit_price: Optional[float] = Field(default=None, ge=0)
    total_price: Optional[float] = Field(default=None, ge=0)
    category: Optional[str] = None
    brand: Optional[str] = None
    carbon_emissions: Optional[float] = Field(default=None, ge=0)  # kg CO2e
    confidence: Optional[float] = Field(default=None, ge=0, le=1)

class OCRResponse(BaseModel):
    success: bool
    text: str = ""
    confidence: float = Field(default=0.0, ge=0, le=1)
    items: Optional[List[ReceiptItem]] = None
    merchant: Optional[str] = None
    total: Optional[float] = Field(default=None, ge=0)
    date: Optional[str] = None
    total_carbon_emissions: Optional[float] = Field(default=None, ge=0)
    processing_time: Optional[float] = Field(default=None, ge=0)
    llm_enhanced: Optional[bool] = False
    error_message: Optional[str] = None
    raw_ocr_data: Optional[List[Dict]] = None  # For debugging

def preprocess_image(image_data: str) -> np.ndarray:
    """Preprocess image for better OCR results"""
    try:
        # Remove data URL prefix if present
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        # Decode base64 image
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if necessary
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")
        
        # Convert to numpy array
        image_np = np.array(image)
        
        # Convert to grayscale
        if len(image_np.shape) == 3:
            gray = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)
        else:
            gray = image_np
        
        # Resize if too small
        if gray.shape[0] < MIN_IMAGE_HEIGHT:
            scale_factor = MIN_IMAGE_HEIGHT / gray.shape[0]
            new_width = int(gray.shape[1] * scale_factor)
            new_height = int(gray.shape[0] * scale_factor)
            gray = cv2.resize(gray, (new_width, new_height), interpolation=cv2.INTER_CUBIC)
        
        # Apply CLAHE for better contrast
        clahe = cv2.createCLAHE(clipLimit=CLAHE_CLIP_LIMIT, tileGridSize=CLAHE_TILE_GRID_SIZE)
        enhanced = clahe.apply(gray)
        
        return enhanced
        
    except (ValueError, OSError, IOError) as error:
        logger.error(f"Error in image preprocessing: {error}")
        raise ValueError(f"Failed to preprocess image: {str(error)}")

def extract_text_with_tesseract(image: np.ndarray) -> tuple:
    """Extract text using Tesseract OCR"""
    try:
        # Configure Tesseract for better receipt parsing
        custom_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,$% '
        
        # Extract text
        text = pytesseract.image_to_string(image, config=custom_config)
        
        # Get confidence scores (if available)
        data = pytesseract.image_to_data(image, config=custom_config, output_type=pytesseract.Output.DICT)
        
        # Calculate average confidence
        confidences = [int(conf) for conf in data['conf'] if int(conf) > 0]
        avg_confidence = sum(confidences) / len(confidences) / 100.0 if confidences else 0.5
        
        return text.strip(), avg_confidence
        
    except Exception as error:
        logger.error(f"Error in Tesseract OCR: {error}")
        return "", 0.0

def extract_receipt_info(text: str) -> dict:
    """Extract receipt information from OCR text"""
    try:
        lines = text.split('\n')
        items = []
        merchant = None
        total = None
        date = None
        
        # Simple patterns for receipt parsing
        total_pattern = r'total.*?(\d+\.?\d*)'
        date_pattern = r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})'
        price_pattern = r'(\d+\.?\d*)'
        
        # Extract total
        for line in lines:
            if 'total' in line.lower():
                match = re.search(total_pattern, line.lower())
                if match:
                    total = float(match.group(1))
                break
        
        # Extract date
        for line in lines:
            match = re.search(date_pattern, line)
            if match:
                date = match.group(1)
                break
        
        # Extract merchant (first line that's not empty and doesn't look like a price)
        for line in lines:
            line = line.strip()
            if line and not re.match(r'^\d+\.?\d*$', line) and len(line) > 3:
                merchant = line
                break
        
        # Simple item extraction (lines with prices)
        for line in lines:
            line = line.strip()
            if line and re.search(price_pattern, line):
                # Skip if it's likely a total or tax line
                if any(keyword in line.lower() for keyword in ['total', 'tax', 'subtotal', 'change']):
                    continue
                
                # Extract price
                price_match = re.search(price_pattern, line)
                if price_match:
                    price = float(price_match.group(1))
                    
                    # Extract item name (everything before the price)
                    name_part = line[:price_match.start()].strip()
                    if name_part:
                        items.append(ReceiptItem(
                            name=name_part,
                            total_price=price,
                            confidence=0.7
                        ))
        
        return {
            'items': items,
            'merchant': merchant,
            'total': total,
            'date': date
        }
        
    except Exception as error:
        logger.error(f"Error extracting receipt info: {error}")
        return {
            'items': [],
            'merchant': None,
            'total': None,
            'date': None
        }

@app.post("/ocr", response_model=OCRResponse)
async def process_receipt(request: OCRRequest):
    """Process receipt image and extract information"""
    start_time = datetime.now()
    
    try:
        logger.info("Starting OCR processing")
        
        # Preprocess image
        processed_image = preprocess_image(request.image)
        
        # Extract text using Tesseract
        text, confidence = extract_text_with_tesseract(processed_image)
        
        if not text:
            return OCRResponse(
                success=False,
                error_message="No text could be extracted from the image",
                processing_time=(datetime.now() - start_time).total_seconds()
            )
        
        # Extract receipt information
        receipt_info = extract_receipt_info(text)
        
        # Calculate processing time
        processing_time = (datetime.now() - start_time).total_seconds()
        
        logger.info(f"OCR processing completed in {processing_time:.2f}s")
        
        return OCRResponse(
            success=True,
            text=text,
            confidence=confidence,
            items=receipt_info['items'],
            merchant=receipt_info['merchant'],
            total=receipt_info['total'],
            date=receipt_info['date'],
            processing_time=processing_time,
            llm_enhanced=False
        )
        
    except Exception as error:
        logger.error(f"Error in OCR processing: {error}")
        return OCRResponse(
            success=False,
            error_message=str(error),
            processing_time=(datetime.now() - start_time).total_seconds()
        )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "OCR Service"}

@app.get("/")
async def root():
    return {"message": "Emissionary OCR Service - Simple Version", "status": "running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 