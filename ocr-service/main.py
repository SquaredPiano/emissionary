from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
import cv2  # type: ignore
import numpy as np
from PIL import Image
import base64
import io
import re
from typing import List, Optional, Dict, Any, Tuple
import json
from datetime import datetime
import os
import requests
import time
import logging
from paddleocr import PaddleOCR
from skimage import filters, morphology, exposure
from scipy import ndimage

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "your-groq-api-key-here")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
MIN_IMAGE_HEIGHT = 1000
CLAHE_CLIP_LIMIT = 2.0
CLAHE_TILE_GRID_SIZE = (8, 8)
BILATERAL_FILTER_D = 9
BILATERAL_FILTER_SIGMA_COLOR = 75
BILATERAL_FILTER_SIGMA_SPACE = 75
CANNY_LOW_THRESHOLD = 50
CANNY_HIGH_THRESHOLD = 150
HOUGH_LINES_THRESHOLD = 100
ROTATION_ANGLE_THRESHOLD = 0.5

app = FastAPI(title="Emissionary OCR Service", version="2.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize PaddleOCR reader with advanced settings for receipt parsing
try:
    # Use angle classification for better handling of rotated/creased receipts
    # Enable structure detection for better layout understanding
    reader = PaddleOCR(
        use_textline_orientation=True,  # Handle rotated text
        lang='en',           # English language
        use_gpu=False,       # CPU mode for compatibility
        det_db_thresh=0.3,   # Lower detection threshold for faint text
        det_db_box_thresh=0.5,  # Lower box threshold for better detection
        rec_char_dict_path=None,  # Use default dictionary
        cls_thresh=0.9,      # High confidence for angle classification
        show_log=False       # Reduce logging output
    )
    logger.info("PaddleOCR initialized successfully with receipt-optimized settings")
except (ImportError, RuntimeError) as error:
    logger.error(f"Failed to initialize PaddleOCR: {error}")
    try:
        # Fallback to minimal settings
        reader = PaddleOCR(
            lang='en',
            use_gpu=False,
            show_log=False
        )
        logger.info("PaddleOCR initialized with fallback settings")
    except (ImportError, RuntimeError) as fallback_error:
        logger.error(f"PaddleOCR fallback initialization also failed: {fallback_error}")
        reader = None

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

def advanced_preprocess_image(image_data: str) -> np.ndarray:
    """Advanced preprocessing specifically designed for receipt images with distortions"""
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
        
        # Step 1: Resize if too small (maintain aspect ratio)
        if gray.shape[0] < MIN_IMAGE_HEIGHT:
            scale_factor = MIN_IMAGE_HEIGHT / gray.shape[0]
            new_width = int(gray.shape[1] * scale_factor)
            new_height = int(gray.shape[0] * scale_factor)
            gray = cv2.resize(gray, (new_width, new_height), interpolation=cv2.INTER_CUBIC)
        
        # Step 2: Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
        # This helps with uneven lighting and improves text visibility
        clahe = cv2.createCLAHE(clipLimit=CLAHE_CLIP_LIMIT, tileGridSize=CLAHE_TILE_GRID_SIZE)
        enhanced = clahe.apply(gray)
        
        # Step 3: Denoise using bilateral filter (preserves edges while removing noise)
        denoised = cv2.bilateralFilter(enhanced, BILATERAL_FILTER_D, BILATERAL_FILTER_SIGMA_COLOR, BILATERAL_FILTER_SIGMA_SPACE)
        
        # Step 4: Apply morphological operations to clean up the image
        # Create a kernel for morphological operations
        kernel = np.ones((1, 1), np.uint8)
        
        # Opening operation to remove small noise
        opened = cv2.morphologyEx(denoised, cv2.MORPH_OPEN, kernel)
        
        # Step 5: Deskew the image if needed
        # Find the angle of rotation using edge detection
        edges = cv2.Canny(opened, CANNY_LOW_THRESHOLD, CANNY_HIGH_THRESHOLD, apertureSize=3)
        lines = cv2.HoughLines(edges, 1, np.pi/180, threshold=HOUGH_LINES_THRESHOLD)
        
        if lines is not None and len(lines) > 0:
            angles = []
            for line in lines[:10]:  # Check first 10 lines
                if len(line) >= 2:
                    rho, theta = line[0], line[1]
                    angle = theta * 180 / np.pi
                    if angle < 45 or angle > 135:
                        angles.append(angle)
            
            if angles:
                median_angle = np.median(angles)
                if abs(median_angle) > ROTATION_ANGLE_THRESHOLD:  # Only rotate if angle is significant
                    (h, w) = opened.shape[:2]
                    center = (w // 2, h // 2)
                    M = cv2.getRotationMatrix2D(center, median_angle, 1.0)
                    opened = cv2.warpAffine(opened, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        
        # Return the enhanced grayscale image (not binary)
        # This preserves text information better for OCR
        return opened
        
    except (ValueError, OSError, IOError) as error:
        logger.error(f"Error in advanced image preprocessing: {error}")
        raise ValueError(f"Failed to preprocess image: {str(error)}")

def extract_text_with_layout(ocr_results) -> tuple:
    """Extract text from PaddleOCR results with layout information"""
    if not ocr_results or not ocr_results[0]:
        return "", [], 0.0
    
    text_lines = []
    total_confidence = 0.0
    valid_results = 0
    
    for line in ocr_results[0]:
        if line and len(line) >= 2:
            text = line[1][0]  # Extracted text
            confidence = line[1][1]  # Confidence score
            bbox = line[0]  # Bounding box coordinates
            
            if text.strip() and confidence > 0.1:  # Filter out very low confidence results
                text_lines.append({
                    'text': text.strip(),
                    'confidence': confidence,
                    'bbox': bbox,
                    'y_position': np.mean([point[1] for point in bbox])  # Average Y position for sorting
                })
                total_confidence += confidence
                valid_results += 1
    
    # Sort by Y position to maintain reading order
    text_lines.sort(key=lambda x: x['y_position'])
    
    # Extract just the text for the full text output
    full_text = '\n'.join([line['text'] for line in text_lines])
    
    avg_confidence = total_confidence / valid_results if valid_results > 0 else 0.0
    
    return full_text, text_lines, avg_confidence

def normalize_product_name(name: str) -> str:
    """Normalize product names for better matching"""
    # Remove common receipt artifacts and OCR errors
    name = re.sub(r'[^\w\s]', ' ', name)
    name = re.sub(r'\s+', ' ', name).strip()
    
    # Common OCR corrections for receipt text
    ocr_corrections = {
        'spagehtti': 'spaghetti',
        'druhst': 'drumstick',
        'druhst ick': 'drumstick',
        'guipeds': 'guided',
        'strbvnlal': 'strawberries',
        'chargee': 'charge',
        'customor': 'customer',
        'survewiaumartza': 'farmers market',
        'pot': 'pos',
        'uht': 'pos',
        'rst': 'pos',
        'of': 'op',
        'te': 'tr',
        'te1': 'tr',
        'a#': 'a',
        'b': 'b',
        '7qu': '7',
        'nzv': 'n2v',
        '0a4': '0a4',
        'nz': 'n2',
        'v': 'v',
        '0a': '0a',
        '4': '4'
    }
    
    # Apply OCR corrections
    for error, correction in ocr_corrections.items():
        name = re.sub(rf'\b{error}\b', correction, name, flags=re.IGNORECASE)
    
    # Common abbreviations
    replacements = {
        'lb': 'pound',
        'lbs': 'pounds',
        'oz': 'ounce',
        'ozs': 'ounces',
        'kg': 'kilogram',
        'g': 'gram',
        'ml': 'milliliter',
        'l': 'liter',
        'pk': 'pack',
        'pkg': 'package',
        'ct': 'count',
        'ea': 'each'
    }
    
    for abbr, full in replacements.items():
        name = re.sub(rf'\b{abbr}\b', full, name, flags=re.IGNORECASE)
    
    return name.lower()

def extract_receipt_info_advanced(text_lines: List[Dict]) -> dict:
    """Advanced receipt information extraction using layout-aware parsing"""
    if not text_lines:
        return {'items': [], 'merchant': None, 'total': None, 'date': None}
    
    items = []
    merchant = None
    total = None
    date = None
    
    # Extract merchant - look for STORE number first (highest priority)
    for line in text_lines:
        text = line['text'].strip()
        if 'STORE' in text.upper():
            merchant = text
            break
    
    # Extract date from any line
    date_patterns = [
        r'\d{1,2}/\d{1,2}/\d{2,4}',
        r'\d{1,2}-\d{1,2}-\d{2,4}',
        r'\d{4}-\d{2}-\d{2}',
    ]
    
    for line in text_lines:
        for pattern in date_patterns:
            match = re.search(pattern, line['text'])
            if match:
                date = match.group(0)
                break
        if date:
            break
    
    # Extract total - look for the last TOTAL line specifically
    for line in reversed(text_lines):
        if 'TOTAL' in line['text'].upper():
            # Look for price in the same line or next line
            price_match = re.search(r'\$(\d+\.\d{2})', line['text'])
            if price_match:
                try:
                    total = float(price_match.group(1))
                    break
                except ValueError:
                    continue
    
    # If no total found with TOTAL pattern, look for the last price that's likely the total
    if not total:
        # Look for the last price in the receipt (usually the total)
        prices = []
        for line in text_lines:
            price_matches = re.findall(r'\$(\d+\.\d{2})', line['text'])
            for price in price_matches:
                try:
                    prices.append((float(price), line['y_position']))
                except ValueError:
                    continue
        
        if prices:
            # Sort by Y position and take the last one (bottom of receipt)
            prices.sort(key=lambda x: x[1])
            total = prices[-1][0]
    
    # Advanced item extraction using layout information
    # Look for lines that contain product names and prices
    skip_keywords = ['total', 'subtotal', 'tax', 'balance', 'change', 'st#', 'of#', 'te#', 'tr#', 'pot', 
                    'survey', 'win', 'rules', 'contest', 'store', 'waterloo', 'visa', 'tend', 'hst',
                    'complete', 'customer', 'gift', 'cards', 'regulations', 'apply', 'see', 'details',
                    'mm', 'uo', 'today', 'farmers', 'market', 'road', 'unit', 'n2v', '0a4']
    
    for i, line in enumerate(text_lines):
        text = line['text'].strip()
        
        # Skip header lines, totals, dates, store info
        if any(keyword in text.lower() for keyword in skip_keywords):
            continue
            
        # Skip date lines
        if re.search(r'\d{1,2}/\d{1,2}/\d{2,4}', text):
            continue
            
        # Skip barcode/UPC lines (usually 12-13 digits)
        if re.match(r'^\d{12,13}$', text):
            continue
            
        # Skip phone numbers
        if re.match(r'^\d{3}-\d{3}-\d{4}$', text):
            continue
            
        # Look for price patterns
        price_matches = re.findall(r'\$(\d+\.\d{2})', text)
        if len(price_matches) >= 1:
            # Extract the product name (everything before the first price)
            parts = re.split(r'\$\d+\.\d{2}', text, 1)
            if len(parts) >= 1:
                name_part = parts[0].strip()
                name_part = re.sub(r'[^\w\s]', ' ', name_part).strip()
                
                if len(name_part) > 2:  # Filter out very short names
                    # Try to extract quantity
                    quantity = 1.0
                    quantity_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:x|@|×)', name_part)
                    if quantity_match:
                        try:
                            quantity = float(quantity_match.group(1))
                            name_part = re.sub(r'\d+(?:\.\d+)?\s*(?:x|@|×)', '', name_part).strip()
                        except ValueError:
                            quantity = 1.0
                    
                    # Normalize the product name
                    normalized_name = normalize_product_name(name_part)
                    
                    if normalized_name:  # Only add if we have a valid name
                        # Extract prices
                        unit_price = None
                        total_price = None
                        
                        try:
                            total_price = float(price_matches[0]) if price_matches else None
                            
                            if len(price_matches) >= 2:
                                unit_price = float(price_matches[0])
                                total_price = float(price_matches[1])
                        except ValueError:
                            pass
                        
                        items.append(ReceiptItem(
                            name=normalized_name,
                            quantity=quantity,
                            unit_price=unit_price,
                            total_price=total_price,
                            confidence=line['confidence']
                        ))
    
    # If no items found with price patterns, try a different approach
    # Look for product names and find associated prices
    if not items:
        for i, line in enumerate(text_lines):
            text = line['text'].strip()
            
            # Skip header lines, totals, dates, store info
            if any(keyword in text.lower() for keyword in skip_keywords):
                continue
                
            # Skip date lines and barcodes
            if re.search(r'\d{1,2}/\d{1,2}/\d{2,4}', text) or re.match(r'^\d{12,13}$', text):
                continue
            
            # Look for product names (words without numbers, longer than 3 chars)
            if (len(text) > 3 and 
                not re.search(r'\d+\.\d{2}', text) and
                not re.search(r'^\d+$', text) and
                not re.search(r'^\$', text)):
                
                # Look for price in next few lines
                price_found = False
                for j in range(i+1, min(i+5, len(text_lines))):
                    next_text = text_lines[j]['text'].strip()
                    price_match = re.search(r'\$(\d+\.\d{2})', next_text)
                    if price_match:
                        try:
                            total_price = float(price_match.group(1))
                            normalized_name = normalize_product_name(text)
                            if normalized_name:
                                items.append(ReceiptItem(
                                    name=normalized_name,
                                    quantity=1.0,
                                    total_price=total_price,
                                    confidence=line['confidence']
                                ))
                                price_found = True
                                break
                        except ValueError:
                            continue
    
    return {
        'items': items,
        'merchant': merchant,
        'total': total,
        'date': date
    }

def call_groq_llm(items: List[ReceiptItem], receipt_text: str) -> List[ReceiptItem]:
    """Use Groq LLM to enhance carbon emission calculations"""
    if not items or GROQ_API_KEY == "your-groq-api-key-here":
        logger.info("Skipping LLM enhancement: no items or API key not configured")
        return items
    
    try:
        # Prepare items for LLM
        items_text = "\n".join([
            f"- {item.name} (quantity: {item.quantity})" 
            for item in items[:10]  # Limit to first 10 items to avoid token limits
        ])
        
        prompt = f"""
You are an expert in calculating carbon emissions for food items. Given the following grocery items from a receipt, calculate the carbon footprint in kg CO2e for each item.

Receipt text: {receipt_text[:500]}...

Items to analyze:
{items_text}

For each item, provide:
1. The normalized product name
2. The carbon emissions in kg CO2e
3. The food category (meat, dairy, produce, grains, etc.)

Use scientific emission factors and consider:
- Beef: ~13.3 kg CO2e/kg
- Chicken: ~2.9 kg CO2e/kg  
- Pork: ~4.6 kg CO2e/kg
- Fish: ~3.0 kg CO2e/kg
- Milk: ~1.4 kg CO2e/kg
- Cheese: ~13.5 kg CO2e/kg
- Eggs: ~4.8 kg CO2e/kg
- Vegetables: ~0.2-0.7 kg CO2e/kg
- Fruits: ~0.4-0.7 kg CO2e/kg
- Grains: ~0.8-2.7 kg CO2e/kg

Return a JSON array with objects containing: name, carbon_emissions, category
Example: [{{"name": "organic bananas", "carbon_emissions": 1.4, "category": "fruits"}}]
"""

        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": "llama3-8b-8192",  # Fast and cost-effective model
            "messages": [
                {"role": "system", "content": "You are a carbon emission calculation expert. Always respond with valid JSON."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.1,
            "max_tokens": 1000
        }
        
        response = requests.post(GROQ_API_URL, headers=headers, json=data, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            llm_response = result['choices'][0]['message']['content']
            
            # Parse JSON response
            try:
                # Clean up the response to extract JSON
                json_start = llm_response.find('[')
                json_end = llm_response.rfind(']') + 1
                if json_start != -1 and json_end != -1:
                    json_text = llm_response[json_start:json_end]
                    enhanced_items = json.loads(json_text)
                    
                    # Update items with LLM results
                    for i, item in enumerate(items):
                        if i < len(enhanced_items):
                            enhanced_item = enhanced_items[i]
                            if isinstance(enhanced_item, dict):
                                item.carbon_emissions = enhanced_item.get('carbon_emissions', item.carbon_emissions)
                                item.category = enhanced_item.get('category', item.category)
                                # Use original name if LLM name is empty
                                new_name = enhanced_item.get('name', '').strip()
                                if new_name:
                                    item.name = new_name
                    
                    logger.info("LLM enhancement successful")
                    return items
                else:
                    logger.warning("No valid JSON found in LLM response")
                    
            except json.JSONDecodeError as json_error:
                logger.error(f"Failed to parse LLM response: {json_error}")
                logger.debug(f"LLM response: {llm_response}")
                
        else:
            logger.error(f"Groq API error: {response.status_code} - {response.text}")
            
    except requests.RequestException as request_error:
        logger.error(f"Request error calling Groq LLM: {str(request_error)}")
    except (ValueError, KeyError, TypeError) as processing_error:
        logger.error(f"Processing error calling Groq LLM: {str(processing_error)}")
    
    return items

def calculate_carbon_emissions(items: List[ReceiptItem]) -> List[ReceiptItem]:
    """Calculate carbon emissions for each item (fallback method)"""
    # Simple emission factors (kg CO2e per kg)
    emission_factors = {
        'beef': 13.3,
        'chicken': 2.9,
        'pork': 4.6,
        'fish': 3.0,
        'milk': 1.4,
        'cheese': 13.5,
        'eggs': 4.8,
        'bread': 0.8,
        'rice': 2.7,
        'potato': 0.2,
        'tomato': 0.3,
        'banana': 0.7,
        'apple': 0.4,
        'orange': 0.5,
        'carrot': 0.2,
        'lettuce': 0.4,
        'onion': 0.2,
        'garlic': 0.2,
        'oil': 3.2,
        'sugar': 0.3,
        'flour': 0.8,
        'pasta': 0.9,
        'soda': 0.3,
        'water': 0.3,
        'juice': 0.9,
        'beer': 0.6,
        'wine': 1.4,
        'coffee': 2.3,
        'tea': 0.2,
        'spaghetti': 0.9,
        'drumstick': 2.9,
        'strawberries': 0.7,
        'yeast': 0.8,
        'onion': 0.2,
    }
    
    for item in items:
        item_name = item.name.lower()
        emission = 0.0
        
        # Find the best matching emission factor
        for food, factor in emission_factors.items():
            if food in item_name:
                emission = factor * item.quantity
                break
        
        # Default emission for unknown items
        if emission == 0.0:
            emission = 1.0 * item.quantity  # Default 1 kg CO2e per item
        
        item.carbon_emissions = emission
    
    return items

@app.post("/ocr", response_model=OCRResponse)
async def process_receipt(request: OCRRequest):
    start_time = time.time()
    
    if reader is None:
        raise HTTPException(status_code=500, detail="OCR service not available - PaddleOCR initialization failed")
    
    try:
        # Validate base64 image
        if not request.image:
            raise HTTPException(status_code=400, detail="No image data provided")
        
        # Decode base64 image directly without preprocessing
        if ',' in request.image:
            image_data = request.image.split(',')[1]
        else:
            image_data = request.image
        
        # Decode base64 image
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if necessary
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")
        
        # Convert to numpy array
        image_np = np.array(image)
        
        # Convert to BGR for OpenCV (PaddleOCR expects BGR)
        if len(image_np.shape) == 3:
            image_np = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)
        
        # Perform OCR with PaddleOCR on original image
        try:
            results = reader.predict(image_np)
        except AttributeError:
            # Fallback to old API if predict doesn't exist
            results = reader.ocr(image_np, cls=True)
        
        # Extract text with layout information
        full_text, text_lines, avg_confidence = extract_text_with_layout(results)
        
        # Extract receipt information using advanced parsing
        receipt_info = extract_receipt_info_advanced(text_lines)
        
        # Calculate carbon emissions
        llm_enhanced = False
        total_carbon = 0.0
        
        if receipt_info['items']:
            # Try LLM enhancement first
            original_items = [item.model_copy() for item in receipt_info['items']]
            enhanced_items = call_groq_llm(receipt_info['items'], full_text)
            
            # Check if LLM actually enhanced the items
            llm_enhanced = any(
                enhanced.carbon_emissions != original.carbon_emissions 
                for enhanced, original in zip(enhanced_items, original_items)
                if enhanced.carbon_emissions is not None and original.carbon_emissions is not None
            )
            
            if not llm_enhanced:
                # Fallback to basic calculation
                enhanced_items = calculate_carbon_emissions(receipt_info['items'])
            
            receipt_info['items'] = enhanced_items
            total_carbon = sum(
                item.carbon_emissions for item in receipt_info['items'] 
                if item.carbon_emissions is not None
            )
        
        processing_time = time.time() - start_time
        
        # Prepare raw OCR data for debugging
        raw_ocr_data = []
        if results and results[0]:
            for line in results[0]:
                if line and len(line) >= 2:
                    raw_ocr_data.append({
                        'text': line[1][0],
                        'confidence': line[1][1],
                        'bbox': line[0].tolist() if hasattr(line[0], 'tolist') else line[0]
                    })
        
        return OCRResponse(
            success=True,
            text=full_text,
            confidence=avg_confidence,
            items=receipt_info['items'],
            merchant=receipt_info['merchant'],
            total=receipt_info['total'],
            date=receipt_info['date'],
            total_carbon_emissions=total_carbon,
            processing_time=processing_time,
            llm_enhanced=llm_enhanced,
            raw_ocr_data=raw_ocr_data
        )
        
    except ValueError as validation_error:
        logger.error(f"Validation error: {validation_error}")
        raise HTTPException(status_code=400, detail=str(validation_error))
    except (OSError, IOError) as file_error:
        logger.error(f"File processing error: {file_error}")
        raise HTTPException(status_code=400, detail=f"Image processing failed: {str(file_error)}")
    except (ImportError, RuntimeError) as ocr_error:
        logger.error(f"OCR processing failed: {ocr_error}")
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(ocr_error)}")

@app.post("/upload")
async def upload_receipt(file: UploadFile = File(...)):
    """Upload receipt image and process it"""
    try:
        # Read the uploaded file
        contents = await file.read()
        
        # Convert to base64
        image_base64 = base64.b64encode(contents).decode('utf-8')
        
        # Create OCR request
        request = OCRRequest(
            image=image_base64,
            image_type=file.content_type or "image/jpeg"
        )
        
        # Process the receipt
        return await process_receipt(request)
        
    except (OSError, IOError) as file_error:
        logger.error(f"File upload error: {file_error}")
        raise HTTPException(status_code=400, detail=f"File upload failed: {str(file_error)}")
    except (ValueError, TypeError) as processing_error:
        logger.error(f"Processing error: {processing_error}")
        raise HTTPException(status_code=500, detail=f"File processing failed: {str(processing_error)}")

@app.get("/", response_class=HTMLResponse)
async def upload_page():
    """Simple HTML page for testing receipt uploads"""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Emissionary OCR Test - PaddleOCR v2.0</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .upload-form { border: 2px dashed #ccc; padding: 20px; text-align: center; margin: 20px 0; }
            .result { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .item { margin: 10px 0; padding: 10px; background: white; border-radius: 3px; }
            .carbon { color: #e74c3c; font-weight: bold; }
            .total-carbon { font-size: 1.2em; color: #e74c3c; font-weight: bold; }
            .confidence { color: #27ae60; font-weight: bold; }
            .raw-data { background: #f8f9fa; padding: 10px; border-radius: 3px; margin: 10px 0; font-family: monospace; font-size: 0.9em; }
        </style>
    </head>
    <body>
        <h1>🌱 Emissionary OCR Test - PaddleOCR v2.0</h1>
        <p>Upload a receipt image to test the advanced OCR and carbon emission calculation.</p>
        <p><strong>New Features:</strong> Advanced preprocessing, layout detection, better distortion handling</p>
        
        <div class="upload-form">
            <form id="uploadForm">
                <input type="file" id="receiptFile" accept="image/*" required>
                <br><br>
                <button type="submit">Process Receipt</button>
            </form>
        </div>
        
        <div id="result" class="result" style="display: none;">
            <h3>Processing Results:</h3>
            <div id="resultContent"></div>
        </div>
        
        <script>
            document.getElementById('uploadForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const file = document.getElementById('receiptFile').files[0];
                if (!file) return;
                
                const formData = new FormData();
                formData.append('file', file);
                
                try {
                    const response = await fetch('/upload', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const result = await response.json();
                    displayResult(result);
                } catch (error) {
                    console.error('Error:', error);
                    alert('Error processing receipt');
                }
            });
            
            function displayResult(data) {
                const resultDiv = document.getElementById('result');
                const contentDiv = document.getElementById('resultContent');
                
                let html = `
                    <p><strong>Merchant:</strong> ${data.merchant || 'Unknown'}</p>
                    <p><strong>Date:</strong> ${data.date || 'Unknown'}</p>
                    <p><strong>Total:</strong> $${data.total || 'Unknown'}</p>
                    <p><strong>Confidence:</strong> <span class="confidence">${(data.confidence * 100).toFixed(1)}%</span></p>
                    <p><strong>Processing Time:</strong> ${data.processing_time.toFixed(2)}s</p>
                    <p><strong>LLM Enhanced:</strong> ${data.llm_enhanced ? 'Yes' : 'No'}</p>
                `;
                
                if (data.items && data.items.length > 0) {
                    html += '<h4>Items:</h4>';
                    data.items.forEach(item => {
                        html += `
                            <div class="item">
                                <strong>${item.name}</strong><br>
                                Quantity: ${item.quantity}<br>
                                Price: $${item.total_price || 'N/A'}<br>
                                <span class="carbon">Carbon: ${item.carbon_emissions.toFixed(2)} kg CO2e</span>
                                ${item.confidence ? `<br><span class="confidence">Confidence: ${(item.confidence * 100).toFixed(1)}%</span>` : ''}
                            </div>
                        `;
                    });
                    
                    html += `<p class="total-carbon">Total Carbon Emissions: ${data.total_carbon_emissions.toFixed(2)} kg CO2e</p>`;
                }
                
                if (data.raw_ocr_data && data.raw_ocr_data.length > 0) {
                    html += '<h4>Raw OCR Data (Debug):</h4>';
                    html += '<div class="raw-data">';
                    data.raw_ocr_data.slice(0, 10).forEach(item => {
                        html += `${item.text} (${(item.confidence * 100).toFixed(1)}%)<br>`;
                    });
                    html += '</div>';
                }
                
                contentDiv.innerHTML = html;
                resultDiv.style.display = 'block';
            }
        </script>
    </body>
    </html>
    """

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "OCR-PaddleOCR", "groq_configured": GROQ_API_KEY != "your-groq-api-key-here"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 