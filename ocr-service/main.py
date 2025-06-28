from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import easyocr
import cv2
import numpy as np
from PIL import Image
import base64
import io
import re
from typing import List, Optional
import json

app = FastAPI(title="Emissionary OCR Service", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize EasyOCR reader
reader = easyocr.Reader(['en'])

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

def preprocess_image(image_data: str) -> np.ndarray:
    """Preprocess the image for better OCR results"""
    # Decode base64 image
    image_bytes = base64.b64decode(image_data)
    image = Image.open(io.BytesIO(image_bytes))
    
    # Convert to numpy array
    image_np = np.array(image)
    
    # Convert to grayscale if it's a color image
    if len(image_np.shape) == 3:
        gray = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)
    else:
        gray = image_np
    
    # Apply preprocessing
    # Resize if too small
    if gray.shape[0] < 800:
        scale_factor = 800 / gray.shape[0]
        gray = cv2.resize(gray, None, fx=scale_factor, fy=scale_factor)
    
    # Apply Gaussian blur to reduce noise
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Apply thresholding
    _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    return thresh

def extract_receipt_info(text: str) -> dict:
    """Extract receipt information from OCR text"""
    lines = text.split('\n')
    
    # Initialize variables
    items = []
    merchant = None
    total = None
    date = None
    
    # Extract merchant (usually at the top)
    for line in lines[:5]:
        line = line.strip()
        if line and not re.search(r'\d+\.\d{2}', line):  # No price pattern
            merchant = line
            break
    
    # Extract total (look for patterns like "TOTAL: $XX.XX")
    total_patterns = [
        r'total.*?(\d+\.\d{2})',
        r'TOTAL.*?(\d+\.\d{2})',
        r'amount.*?(\d+\.\d{2})',
        r'(\d+\.\d{2}).*?total',
    ]
    
    for line in lines:
        line_lower = line.lower()
        for pattern in total_patterns:
            match = re.search(pattern, line_lower)
            if match:
                total = float(match.group(1))
                break
        if total:
            break
    
    # Extract date
    date_patterns = [
        r'\d{1,2}/\d{1,2}/\d{2,4}',
        r'\d{1,2}-\d{1,2}-\d{2,4}',
        r'\d{4}-\d{2}-\d{2}',
    ]
    
    for line in lines:
        for pattern in date_patterns:
            match = re.search(pattern, line)
            if match:
                date = match.group(0)
                break
        if date:
            break
    
    # Extract items (simplified - in a real implementation, you'd use more sophisticated parsing)
    item_pattern = r'([A-Za-z\s]+)\s+(\d+)\s+(\d+\.\d{2})\s+(\d+\.\d{2})'
    
    for line in lines:
        match = re.search(item_pattern, line)
        if match:
            name = match.group(1).strip()
            quantity = float(match.group(2))
            unit_price = float(match.group(3))
            total_price = float(match.group(4))
            
            if name and len(name) > 2:  # Filter out very short names
                items.append(ReceiptItem(
                    name=name,
                    quantity=quantity,
                    unit_price=unit_price,
                    total_price=total_price
                ))
    
    return {
        'items': items,
        'merchant': merchant,
        'total': total,
        'date': date
    }

@app.post("/ocr", response_model=OCRResponse)
async def process_receipt(request: OCRRequest):
    try:
        # Preprocess image
        processed_image = preprocess_image(request.image)
        
        # Perform OCR
        results = reader.readtext(processed_image)
        
        # Extract text and calculate confidence
        text_lines = []
        total_confidence = 0
        
        for (bbox, text, confidence) in results:
            text_lines.append(text)
            total_confidence += confidence
        
        full_text = '\n'.join(text_lines)
        avg_confidence = total_confidence / len(results) if results else 0
        
        # Extract receipt information
        receipt_info = extract_receipt_info(full_text)
        
        return OCRResponse(
            success=True,
            text=full_text,
            confidence=avg_confidence,
            items=receipt_info['items'],
            merchant=receipt_info['merchant'],
            total=receipt_info['total'],
            date=receipt_info['date']
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "OCR"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 