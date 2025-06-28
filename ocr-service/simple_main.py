"""
Simple version of the OCR service for testing and development.
This file provides a simplified implementation using PaddleOCR.
For production use, see main.py for the full implementation with advanced features.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import io
from PIL import Image
from typing import List, Optional
import json
from paddleocr import PaddleOCR
import cv2
import numpy as np

app = FastAPI(title="Emissionary OCR Service - Simple", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize PaddleOCR
try:
    reader = PaddleOCR(
        use_textline_orientation=True,
        lang='en',
        use_gpu=False
    )
except Exception as e:
    print(f"Failed to initialize PaddleOCR: {e}")
    reader = None

class OCRRequest(BaseModel):
    image: str  # Base64 encoded image
    image_type: str

class ReceiptItem(BaseModel):
    name: str
    quantity: float
    unit_price: float
    total_price: float
    category: Optional[str] = None
    brand: Optional[str] = None

class OCRResponse(BaseModel):
    success: bool
    text: str
    confidence: float
    items: Optional[List[ReceiptItem]] = None
    merchant: Optional[str] = None
    total: Optional[float] = None
    date: Optional[str] = None

@app.post("/ocr", response_model=OCRResponse)
async def process_receipt(request: OCRRequest):
    try:
        if reader is None:
            raise HTTPException(status_code=500, detail="OCR service not available")
        
        # Decode the image
        try:
            image_bytes = base64.b64decode(request.image)
            image = Image.open(io.BytesIO(image_bytes))
            # Convert to RGB if necessary
            if image.mode in ("RGBA", "P"):
                image = image.convert("RGB")
            image_np = np.array(image)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")
        
        # Perform OCR
        try:
            results = reader.predict(image_np)
        except AttributeError:
            # Fallback to old API if predict doesn't exist
            results = reader.ocr(image_np)
        
        if not results or not results[0]:
            return OCRResponse(
                success=True,
                text="No text detected",
                confidence=0.0,
                items=[],
                merchant="Unknown",
                total=0.0,
                date="Unknown"
            )
        
        # Extract text
        text_lines = []
        total_confidence = 0.0
        valid_results = 0
        
        for line in results[0]:
            if line and len(line) >= 2:
                text = line[1][0]
                confidence = line[1][1]
                if text.strip() and confidence > 0.1:
                    text_lines.append(text.strip())
                    total_confidence += confidence
                    valid_results += 1
        
        full_text = " ".join(text_lines)
        avg_confidence = total_confidence / valid_results if valid_results > 0 else 0.0
        
        # Simple parsing for demonstration
        items = []
        total = 0.0
        
        # Look for price patterns in the text
        import re
        price_pattern = r'\$?\d+\.\d{2}'
        prices = re.findall(price_pattern, full_text)
        
        for i, price in enumerate(prices[:5]):  # Limit to 5 items
            price_val = float(price.replace('$', ''))
            items.append(ReceiptItem(
                name=f"Item {i+1}",
                quantity=1.0,
                unit_price=price_val,
                total_price=price_val,
                category="unknown"
            ))
            total += price_val
        
        return OCRResponse(
            success=True,
            text=full_text,
            confidence=avg_confidence,
            items=items,
            merchant="Detected Store",
            total=total,
            date="Detected Date"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "OCR-Simple", "paddleocr_available": reader is not None}

@app.get("/")
async def root():
    return {"message": "Emissionary OCR Service - Simple Version", "status": "running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)  # Different port to avoid conflicts 