import os
import sys
import io
import re
import base64
import logging
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from PIL import Image
import numpy as np
import cv2
import pytesseract

# --- Logging ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("emissionary-ocr")

# --- FastAPI Setup ---
app = FastAPI(title="Emissionary OCR Service", version="3.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Models ---
class OCRRequest(BaseModel):
    image: str  # base64-encoded image
    image_type: str = Field(default="image/jpeg")

class ReceiptItem(BaseModel):
    name: str
    quantity: float = 1.0
    unit_price: Optional[float] = None
    total_price: Optional[float] = None

class OCRResponse(BaseModel):
    success: bool
    text: str = ""
    items: Optional[List[ReceiptItem]] = None
    merchant: Optional[str] = None
    total: Optional[float] = None
    date: Optional[str] = None
    error_message: Optional[str] = None

# --- Preprocessing ---
def preprocess_image(image: Image.Image, debug: bool = False) -> Image.Image:
    # Convert to grayscale
    img = image.convert('L')
    min_height = 1000
    if img.height < min_height:
        scale = min_height / img.height
        new_w = int(img.width * scale)
        try:
            # PIL >= 9.1.0 uses Image.Resampling.LANCZOS
            pre_img = img.resize((new_w, min_height), Image.Resampling.LANCZOS)
        except AttributeError:
            # For older PIL versions, fallback to integer values if attributes are missing
            try:
                pre_img = img.resize((new_w, min_height), getattr(Image, 'LANCZOS', 1))
            except Exception:
                pre_img = img.resize((new_w, min_height), getattr(Image, 'BICUBIC', 3))
    else:
        pre_img = img
    if debug:
        pre_img.save("debug_preprocessed.png")
    return pre_img

# Try multiple Tesseract configs and pick the best result
TESSERACT_CONFIGS = ["--psm 6", "--psm 4", "--psm 11", "--psm 3"]
def ocr_image(image: Image.Image) -> str:
    best_text = ""
    best_len = 0
    for config in TESSERACT_CONFIGS:
        try:
            text = pytesseract.image_to_string(image, config=config)
            if len(text) > best_len:
                best_text = text
                best_len = len(text)
        except Exception as e:
            logger.error(f"Tesseract failed with config {config}: {e}")
    logger.info(f"Best OCR text length: {best_len}")
    return best_text

# --- Receipt Parsing ---
def parse_receipt(text: str) -> Dict[str, Any]:
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    merchant = None
    date = None
    total = None
    items = []
    # Merchant: first line with 'walmart' or similar
    for line in lines:
        if re.search(r'walmart|market|grocery|foods|supermarket|shop', line, re.I):
            merchant = line
            break
    # Date: look for date patterns
    for line in lines:
        m = re.search(r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})', line)
        if m:
            date = m.group(0)
            break
    # Total: last line with 'total' and a price
    for line in reversed(lines):
        if 'total' in line.lower():
            m = re.search(r'(\d+\.\d{2})', line)
            if m:
                total = float(m.group(1))
                break
    # Items: lines with a price, not containing 'total', 'tax', etc.
    skip = ['total', 'tax', 'change', 'balance', 'visa', 'debit', 'tend', 'cash', 'hst', 'subtotal']
    for line in lines:
        if any(s in line.lower() for s in skip):
            continue
        m = re.findall(r'(.*?)(\d+\.\d{2})', line)
        if m:
            name = m[0][0].strip(' -:')
            price = float(m[0][1])
            if len(name) > 2:
                items.append(ReceiptItem(name=name, total_price=price))
    return dict(merchant=merchant, date=date, total=total, items=items)

# --- API Endpoints ---
@app.post("/ocr", response_model=OCRResponse)
async def ocr_endpoint(request: OCRRequest):
    try:
        # Decode base64
        img_data = request.image.split(',')[-1]
        img_bytes = base64.b64decode(img_data)
        image = Image.open(io.BytesIO(img_bytes))
        pre_img = preprocess_image(image, debug=True)
        text = ocr_image(pre_img)
        parsed = parse_receipt(text)
        return OCRResponse(success=True, text=text, **parsed)
    except Exception as e:
        logger.error(f"OCR error: {e}")
        return OCRResponse(success=False, error_message=str(e))

@app.post("/upload", response_model=OCRResponse)
async def upload_endpoint(file: UploadFile = File(...)):
    try:
        img_bytes = await file.read()
        image = Image.open(io.BytesIO(img_bytes))
        pre_img = preprocess_image(image, debug=True)
        text = ocr_image(pre_img)
        parsed = parse_receipt(text)
        return OCRResponse(success=True, text=text, **parsed)
    except Exception as e:
        logger.error(f"Upload error: {e}")
        return OCRResponse(success=False, error_message=str(e))

@app.get("/", response_class=HTMLResponse)
async def root():
    return """
    <html><body><h2>Emissionary OCR Service</h2>
    <form action='/upload' enctype='multipart/form-data' method='post'>
    <input name='file' type='file' accept='image/*'>
    <input type='submit'>
    </form></body></html>
    """

@app.get("/health")
async def health():
    return {"status": "healthy"}

# --- CLI for Local Testing ---
def cli_main():
    import argparse
    parser = argparse.ArgumentParser(description="Test OCR on local image file.")
    parser.add_argument("image_path", help="Path to image file")
    args = parser.parse_args()
    if not os.path.exists(args.image_path):
        print(f"File not found: {args.image_path}")
        sys.exit(1)
    image = Image.open(args.image_path)
    pre_img = preprocess_image(image, debug=True)
    text = ocr_image(pre_img)
    print("\n--- OCR TEXT ---\n")
    print(text)
    print("\n--- PARSED RECEIPT ---\n")
    parsed = parse_receipt(text)
    for k, v in parsed.items():
        print(f"{k}: {v}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        cli_main()
    else:
        import uvicorn
        uvicorn.run(app, host="0.0.0.0", port=8000)