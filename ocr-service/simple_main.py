from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import io
from PIL import Image
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
        # For now, return mock data to test the API
        # In production, this would use EasyOCR for actual text extraction
        
        # Decode the image to verify it's valid
        try:
            image_bytes = base64.b64decode(request.image)
            image = Image.open(io.BytesIO(image_bytes))
            # Image is valid, continue with mock response
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")
        
        # Mock OCR response for testing
        mock_items = [
            ReceiptItem(
                name="Organic Milk",
                quantity=1,
                unit_price=4.99,
                total_price=4.99,
                category="dairy"
            ),
            ReceiptItem(
                name="Whole Wheat Bread",
                quantity=1,
                unit_price=3.49,
                total_price=3.49,
                category="grains"
            ),
            ReceiptItem(
                name="Bananas",
                quantity=2,
                unit_price=1.99,
                total_price=3.98,
                category="fruits"
            ),
            ReceiptItem(
                name="Chicken Breast",
                quantity=1,
                unit_price=12.99,
                total_price=12.99,
                category="meat"
            )
        ]
        
        return OCRResponse(
            success=True,
            text="Mock OCR text extracted from receipt image",
            confidence=0.85,
            items=mock_items,
            merchant="Local Grocery Store",
            total=25.45,
            date="2024-01-15"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "OCR", "mode": "mock"}

@app.get("/")
async def root():
    return {"message": "Emissionary OCR Service", "status": "running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 