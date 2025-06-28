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
import requests
from dotenv import load_dotenv
from carbon_footprint_db import get_carbon_footprint, categorize_food_item, estimate_quantity_from_name
import time
load_dotenv()

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

class EnhancedReceiptItem(ReceiptItem):
    carbon_emissions: Optional[float] = None
    category: Optional[str] = None
    confidence: Optional[float] = None

class OCRResponse(BaseModel):
    success: bool
    text: str = ""
    items: Optional[List[ReceiptItem]] = None
    merchant: Optional[str] = None
    total: Optional[float] = None
    date: Optional[str] = None
    error_message: Optional[str] = None

class EnhancedOCRResponse(OCRResponse):
    items: Optional[List[EnhancedReceiptItem]] = None
    total_carbon_emissions: Optional[float] = None
    llm_enhanced: Optional[bool] = False
    processing_time: Optional[float] = None
    raw_ocr_data: Optional[Any] = None

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
@app.post("/ocr", response_model=EnhancedOCRResponse)
async def ocr_endpoint(request: OCRRequest):
    start_time = time.time()
    try:
        img_data = request.image.split(',')[-1]
        img_bytes = base64.b64decode(img_data)
        image = Image.open(io.BytesIO(img_bytes))
        pre_img = preprocess_image(image, debug=True)
        text = ocr_image(pre_img)
        parsed = parse_receipt(text)
        items = parsed.get('items', [])
        llm_enhanced = False
        enhanced_items = []
        if items:
            llm_items = call_groq_llm(items, text)
            if llm_items:
                enhanced_items = llm_items
                llm_enhanced = True
            else:
                enhanced_items = fallback_carbon(items)
        total_carbon = sum(item.carbon_emissions or 0 for item in enhanced_items)
        processing_time = time.time() - start_time
        return EnhancedOCRResponse(
            success=True,
            text=text,
            items=enhanced_items,
            merchant=parsed.get('merchant'),
            total=parsed.get('total'),
            date=parsed.get('date'),
            total_carbon_emissions=total_carbon,
            llm_enhanced=llm_enhanced,
            processing_time=processing_time,
            raw_ocr_data=None
        )
    except Exception as e:
        logger.error(f"OCR error: {e}")
        return EnhancedOCRResponse(success=False, error_message=str(e))

@app.post("/upload", response_model=EnhancedOCRResponse)
async def upload_endpoint(file: UploadFile = File(...)):
    start_time = time.time()
    try:
        img_bytes = await file.read()
        image = Image.open(io.BytesIO(img_bytes))
        pre_img = preprocess_image(image, debug=True)
        text = ocr_image(pre_img)
        parsed = parse_receipt(text)
        items = parsed.get('items', [])
        llm_enhanced = False
        enhanced_items = []
        if items:
            llm_items = call_groq_llm(items, text)
            if llm_items:
                enhanced_items = llm_items
                llm_enhanced = True
            else:
                enhanced_items = fallback_carbon(items)
        total_carbon = sum(item.carbon_emissions or 0 for item in enhanced_items)
        processing_time = time.time() - start_time
        return EnhancedOCRResponse(
            success=True,
            text=text,
            items=enhanced_items,
            merchant=parsed.get('merchant'),
            total=parsed.get('total'),
            date=parsed.get('date'),
            total_carbon_emissions=total_carbon,
            llm_enhanced=llm_enhanced,
            processing_time=processing_time,
            raw_ocr_data=None
        )
    except Exception as e:
        logger.error(f"Upload error: {e}")
        return EnhancedOCRResponse(success=False, error_message=str(e))

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
    parsed = parse_receipt(text)
    items = parsed.get('items', [])
    llm_enhanced = False
    enhanced_items = []
    if items:
        llm_items = call_groq_llm(items, text)
        if llm_items:
            enhanced_items = llm_items
            llm_enhanced = True
        else:
            enhanced_items = fallback_carbon(items)
    total_carbon = sum(item.carbon_emissions or 0 for item in enhanced_items)
    print("\n--- OCR TEXT ---\n")
    print(text)
    print("\n--- FINAL JSON ---\n")
    import json
    print(json.dumps({
        "success": True,
        "text": text,
        "items": [item.dict() for item in enhanced_items],
        "merchant": parsed.get('merchant'),
        "total": parsed.get('total'),
        "date": parsed.get('date'),
        "total_carbon_emissions": total_carbon,
        "llm_enhanced": llm_enhanced
    }, indent=2, default=str))

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

def call_groq_llm(items: List[ReceiptItem], receipt_text: str) -> Optional[List[EnhancedReceiptItem]]:
    if not GROQ_API_KEY:
        return None
    try:
        items_data = [item.dict() for item in items]
        prompt = f"""
You are an expert in calculating carbon footprints for food items. Analyze the following receipt items and provide accurate carbon emissions data.

Receipt Text:
{receipt_text}

Current Items:
{items_data}

For each item, provide:
1. Corrected item name (if OCR made errors)
2. Accurate quantity (in kg or appropriate units)
3. Carbon footprint in kg CO2e (based on scientific data)
4. Food category (meat, dairy, fruits, vegetables, grains, seafood, nuts, beverages, processed)
5. Confidence level (0.0-1.0)

Return a JSON array with enhanced items. Each item should have:
- name: corrected item name
- quantity: quantity in kg
- carbon_emissions: carbon footprint in kg CO2e
- category: food category
- confidence: confidence level (0.0-1.0)
"""
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        data = {
            "model": "llama3-70b-8192",
            "messages": [
                {"role": "system", "content": "You are an expert in food carbon footprint calculation. Provide accurate, scientific data in JSON format."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.1,
            "max_tokens": 2000
        }
        response = requests.post(GROQ_API_URL, headers=headers, json=data, timeout=30)
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            import json as pyjson
            try:
                json_match = re.search(r'\[.*\]', content, re.DOTALL)
                if json_match:
                    enhanced_data = pyjson.loads(json_match.group(0))
                    enhanced_items = []
                    for i, enhanced_item in enumerate(enhanced_data):
                        enhanced_items.append(EnhancedReceiptItem(
                            name=enhanced_item.get('name', items[i].name if i < len(items) else 'Unknown'),
                            quantity=enhanced_item.get('quantity', 1.0),
                            unit_price=items[i].unit_price if i < len(items) else None,
                            total_price=items[i].total_price if i < len(items) else None,
                            carbon_emissions=enhanced_item.get('carbon_emissions', 0.0),
                            category=enhanced_item.get('category', 'processed'),
                            confidence=enhanced_item.get('confidence', 0.8)
                        ))
                    return enhanced_items
            except Exception as e:
                logger.error(f"Failed to parse Groq LLM response: {e}")
        logger.warning("Groq LLM enhancement failed, using fallback calculation")
        return None
    except Exception as e:
        logger.error(f"Groq LLM API error: {e}")
        return None

def fallback_carbon(items: List[ReceiptItem]) -> List[EnhancedReceiptItem]:
    enhanced = []
    for item in items:
        q = item.quantity if item.quantity else estimate_quantity_from_name(item.name)
        carbon = get_carbon_footprint(item.name, q)
        cat = categorize_food_item(item.name)
        enhanced.append(EnhancedReceiptItem(
            name=item.name,
            quantity=q,
            unit_price=item.unit_price,
            total_price=item.total_price,
            carbon_emissions=carbon,
            category=cat,
            confidence=1.0
        ))
    return enhanced

if __name__ == "__main__":
    if len(sys.argv) > 1:
        cli_main()
    else:
        import uvicorn
        uvicorn.run(app, host="0.0.0.0", port=8000)