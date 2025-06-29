"""
Clean OCR Service for Emissionary
Takes receipt images, extracts food items with OCR, and calculates carbon emissions
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
import pytesseract
import logging
import time
import os
import requests
import csv
from rapidfuzz import process, fuzz

# Import our emissions database
from emissions_db import calculate_emissions, get_database_stats

# Global variable to store the last OCR result for MVP
LAST_OCR_RESULT = {}

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
MIN_IMAGE_HEIGHT = 1000
CLAHE_CLIP_LIMIT = 2.0
CLAHE_TILE_GRID_SIZE = (8, 8)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_BASE_URL = "https://api.groq.com/openai/v1/chat/completions"
USE_GROQ_CLASSIFIER = True  # Set to True to always use Groq for classification

app = FastAPI(title="Emissionary OCR Service", version="4.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class OCRRequest(BaseModel):
    image: str  # Base64 encoded image
    image_type: str = Field(default="image/jpeg")

class ReceiptItem(BaseModel):
    name: str
    quantity: float = Field(default=1.0, ge=0)
    unit_price: Optional[float] = Field(default=None, ge=0)
    total_price: Optional[float] = Field(default=None, ge=0)
    category: Optional[str] = None
    subcategory: Optional[str] = None
    carbon_emissions: Optional[float] = Field(default=None, ge=0)  # kg CO2e
    confidence: Optional[float] = Field(default=None, ge=0, le=1)
    estimated_weight_kg: Optional[float] = Field(default=None, ge=0)
    source: Optional[str] = None

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
    error_message: Optional[str] = None
    database_stats: Optional[Dict[str, Any]] = None

# Load food dictionary at startup
FOOD_DICTIONARY_PATH = os.path.join(os.path.dirname(__file__), 'food_dictionary.csv')
FOOD_DICTIONARY = []
FOOD_NAME_SET = set()

# Load food dictionary into memory
with open(FOOD_DICTIONARY_PATH, newline='', encoding='utf-8') as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        FOOD_DICTIONARY.append(row)
        FOOD_NAME_SET.add(row['name'].lower())

# Fuzzy match function

def fuzzy_match_food(name, threshold=80):
    """Fuzzy match a product name to the food dictionary. Returns (best_match_row, score) or (None, 0)."""
    choices = [row['name'] for row in FOOD_DICTIONARY]
    match, score, idx = process.extractOne(name, choices, scorer=fuzz.token_sort_ratio)
    if score >= threshold:
        return FOOD_DICTIONARY[idx], score / 100.0
    return None, 0.0

# Log unknowns for feedback loop
UNKNOWN_LOG_PATH = os.path.join(os.path.dirname(__file__), 'unknown_items.log')
def log_unknown_item(item_name, original_line):
    with open(UNKNOWN_LOG_PATH, 'a', encoding='utf-8') as f:
        f.write(f"{datetime.now().isoformat()} | {item_name} | {original_line}\n")

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
        
    except Exception as error:
        logger.error(f"Error in image preprocessing: {error}")
        raise ValueError(f"Failed to preprocess image: {str(error)}")

def extract_text_with_tesseract(image: np.ndarray) -> tuple:
    """Extract text using Tesseract OCR with multiple configurations"""
    try:
        # Try multiple Tesseract configs for better results
        configs = [
            '--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,$% ',
            '--oem 3 --psm 4 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,$% ',
            '--oem 3 --psm 11 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,$% ',
            '--oem 3 --psm 3 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,$% '
        ]
        
        best_text = ""
        best_confidence = 0.0
        
        for config in configs:
            try:
                # Extract text
                text = pytesseract.image_to_string(image, config=config)
                
                # Get confidence scores
                data = pytesseract.image_to_data(image, config=config, output_type=pytesseract.Output.DICT)
                
                # Calculate average confidence
                confidences = [int(conf) for conf in data['conf'] if int(conf) > 0]
                avg_confidence = sum(confidences) / len(confidences) / 100.0 if confidences else 0.5
                
                # Keep the best result
                if len(text) > len(best_text) or (len(text) == len(best_text) and avg_confidence > best_confidence):
                    best_text = text
                    best_confidence = avg_confidence
                    
            except Exception as e:
                logger.warning(f"Tesseract failed with config {config}: {e}")
                continue
        
        return best_text.strip(), best_confidence
        
    except Exception as error:
        logger.error(f"Error in Tesseract OCR: {error}")
        return "", 0.0

DEBUG_MODE = os.getenv("OCR_DEBUG", "0") == "1"

def classify_lines_with_groq(candidate_lines: list[str]) -> list[dict]:
    """Classify candidate receipt lines using Groq AI. Returns list of dicts with is_food_item, canonical_name, etc."""
    if not GROQ_API_KEY:
        logger.warning("GROQ_API_KEY not set, skipping Groq classification.")
        return [
            {"original": line, "is_food_item": is_likely_food_item(line), "canonical_name": safe_str(line), "category": "unknown", "estimated_weight_kg": None}
            for line in candidate_lines
        ]
    # Improved prompt for strict JSON output
    prompt = (
        "You are a grocery receipt parser. For each line below, output a JSON array of objects with: "
        "original (the original line), is_food_item (true/false), canonical_name (the normalized food name, e.g. 'banana', 'chicken breast', or 'unknown'), "
        "category (the food category, e.g. 'produce', 'meat', 'dairy', or 'unknown'), estimated_weight_kg (estimated weight in kg, or null if unknown).\n"
        "Lines:\n"
    )
    for idx, line in enumerate(candidate_lines, 1):
        prompt += f"{idx}. \"{line}\"\n"
    prompt += ("Respond ONLY with a JSON array, no explanation. Example: "
        "[{'original': 'SPAGHETTI 007680800011 $2.47', 'is_food_item': true, 'canonical_name': 'spaghetti', 'category': 'grains', 'estimated_weight_kg': 0.5}]\n")

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "llama3-8b-8192",
        "messages": [
            {"role": "system", "content": "You are a grocery receipt parser and food item classifier."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.1,
        "max_tokens": 2048
    }
    try:
        logger.info(f"Calling Groq LLM with {len(candidate_lines)} lines.")
        response = requests.post(GROQ_BASE_URL, headers=headers, json=data, timeout=30)
        response.raise_for_status()
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        logger.info(f"Groq LLM raw response: {content}")
        import re, json as pyjson
        # Extract the first valid JSON array from the response
        match = re.search(r'\[.*?\]', content, re.DOTALL)
        if not match:
            logger.warning("Groq response did not contain JSON, falling back to keyword filter.")
            return [
                {"original": line, "is_food_item": is_likely_food_item(line), "canonical_name": safe_str(line), "category": "unknown", "estimated_weight_kg": None}
                for line in candidate_lines
            ]
        try:
            parsed = pyjson.loads(match.group(0).replace("'", '"'))
        except Exception as e:
            logger.error(f"Groq JSON parsing failed: {e}")
            return [
                {"original": line, "is_food_item": is_likely_food_item(line), "canonical_name": safe_str(line), "category": "unknown", "estimated_weight_kg": None}
                for line in candidate_lines
            ]
        
        # Sanitize the parsed response to ensure no null values in string fields
        sanitized_parsed = []
        for item in parsed:
            sanitized_item = {
                "original": safe_str(item.get("original", "")),
                "is_food_item": bool(item.get("is_food_item", False)),
                "canonical_name": safe_str(item.get("canonical_name", "unknown")),
                "category": safe_str(item.get("category", "unknown")),
                "estimated_weight_kg": safe_float(item.get("estimated_weight_kg"))
            }
            sanitized_parsed.append(sanitized_item)
        
        if DEBUG_MODE:
            logger.info(f"Groq LLM classified: {sanitized_parsed}")
        return sanitized_parsed
    except Exception as e:
        logger.error(f"Groq classification failed: {e}")
        return [
            {"original": line, "is_food_item": is_likely_food_item(line), "canonical_name": safe_str(line), "category": "unknown", "estimated_weight_kg": None}
            for line in candidate_lines
        ]

def extract_receipt_info(text: str) -> dict:
    """Extract receipt information from OCR text with food dictionary fuzzy matching and fallback to LLM."""
    try:
        lines = text.split('\n')
        items = []
        merchant = None
        total = None
        date = None
        
        # Enhanced patterns for receipt parsing
        total_patterns = [
            r'total.*?(\d+\.?\d*)',
            r'amount.*?(\d+\.?\d*)',
            r'balance.*?(\d+\.?\d*)',
            r'(\d+\.?\d*)\s*$'  # Last number on line
        ]
        
        date_patterns = [
            r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            r'(\d{4}-\d{2}-\d{2})',
            r'(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{2,4})',
        ]
        
        merchant_keywords = ['walmart', 'target', 'kroger', 'safeway', 'costco', 'whole foods', 'trader joe', 'aldi', 'shoprite', 'stop & shop']
        
        # Extract merchant (look for known store names)
        for line in lines:
            line_lower = line.lower()
            for keyword in merchant_keywords:
                if keyword in line_lower:
                    merchant = line.strip()
                    break
            if merchant:
                break
        
        # If no known merchant found, use first substantial line
        if not merchant:
            for line in lines:
                line = line.strip()
                if line and len(line) > 3 and not re.match(r'^\d+\.?\d*$', line):
                    merchant = line
                    break
        
        # Extract date
        for line in lines:
            for pattern in date_patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    date = match.group(1)
                    break
            if date:
                break
        
        # Extract total (look for total patterns)
        for line in reversed(lines):  # Start from bottom
            line_lower = line.lower()
            for pattern in total_patterns:
                match = re.search(pattern, line_lower)
                if match:
                    try:
                        total = float(match.group(1))
                        break
                    except ValueError:
                        continue
            if total:
                break
        
        # Improved candidate lines extraction for food items
        candidate_lines = []
        skip_keywords = [
            'total', 'tax', 'subtotal', 'change', 'balance', 'visa', 'debit', 'tend', 'cash', 
            'hst', 'gst', 'receipt', 'thank', 'store', 'address', 'phone', 'account', 'ref',
            'terminal', 'network', 'appr', 'code', 'teacher', 'appreciation', 'walmart.com',
            'eftdebit', 'payfrom', 'primary', 'purchase', 'networkid', 'terminal'
        ]
        
        # Enhanced patterns to identify product lines
        product_patterns = [
            # Pattern: [quantity] [product_code] [price]
            r'(\d+)\s+([A-Z0-9]{8,})\s+(\d+\.?\d*)',
            # Pattern: [product_code] [price]
            r'([A-Z0-9]{8,})\s+(\d+\.?\d*)',
            # Pattern: [product_name] [price]
            r'([A-Za-z\s]{3,})\s+(\d+\.?\d*)',
            # Pattern: [product_code] [quantity] [price]
            r'([A-Z0-9]{6,})\s+(\d+)\s+(\d+\.?\d*)',
        ]
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Skip obvious non-product lines
            if any(keyword in line.lower() for keyword in skip_keywords):
                continue
                
            # Skip very short lines or pure numbers
            if len(line) < 3 or re.match(r'^[\d\s\.]+$', line):
                continue
                
            # Try to match product patterns
            for pattern in product_patterns:
                match = re.search(pattern, line)
                if match:
                    groups = match.groups()
                    
                    # Extract price (usually the last number)
                    price_matches = re.findall(r'(\d+\.?\d*)', line)
                    if price_matches:
                        try:
                            price = float(price_matches[-1])
                            # Skip if price is too high (likely not a single item)
                            if price > 100:
                                continue
                                
                            # Extract product name/code
                            if len(groups) >= 2:
                                product_part = groups[1] if len(groups) >= 2 else groups[0]
                                
                                # Clean up product name
                                product_part = re.sub(r'[^\w\s]', ' ', product_part)
                                product_part = ' '.join(product_part.split())
                                
                                if product_part and len(product_part) > 2:
                                    # Try to extract quantity
                                    quantity = 1.0
                                    if len(groups) >= 3 and groups[0].isdigit():
                                        quantity = float(groups[0])
                                    
                                    candidate_lines.append({
                                        'name': product_part,
                                        'price': price,
                                        'quantity': quantity,
                                        'original_line': line
                                    })
                        except ValueError:
                            continue
                    break
        
        # Additional heuristic: look for lines with common product indicators
        product_indicators = [
            'COM', 'PK', 'BDS', 'HAIR', 'WIPES', 'SOCK', 'POP', 'RS', 'BRN', 'PATROL',
            'BABY', 'DR', 'SMITH', 'MSANML', 'PCSET', 'PKBDS', 'PKHAIR', 'PKSOCK'
        ]
        
        for line in lines:
            line = line.strip()
            if not line or len(line) < 5:
                continue
                
            # Skip if already processed or contains skip keywords
            if any(keyword in line.lower() for keyword in skip_keywords):
                continue
                
            # Check if line contains product indicators
            if any(indicator in line.upper() for indicator in product_indicators):
                price_matches = re.findall(r'(\d+\.?\d*)', line)
                if price_matches:
                    try:
                        price = float(price_matches[-1])
                        if price <= 100:  # Reasonable price for a single item
                            # Extract product name (everything before the price)
                            price_pos = line.rfind(price_matches[-1])
                            name_part = line[:price_pos].strip()
                            name_part = re.sub(r'[^\w\s]', ' ', name_part)
                            name_part = ' '.join(name_part.split())
                            
                            if name_part and len(name_part) > 2:
                                # Check if this is already in candidate_lines
                                if not any(c['original_line'] == line for c in candidate_lines):
                                    candidate_lines.append({
                                        'name': name_part,
                                        'price': price,
                                        'quantity': 1.0,
                                        'original_line': line
                                    })
                    except ValueError:
                        continue
        
        # Log candidate lines for debugging
        if DEBUG_MODE:
            logger.info(f"Candidate lines for LLM: {candidate_lines}")
        # --- NEW: Robust product name extraction ---
        def extract_product_name(line):
            tokens = line.split()
            filtered = [
                t for t in tokens
                if not re.match(r'^[0-9]{6,}$', t)  # long numbers
                and not re.match(r'^[A-Z0-9]{6,}$', t)  # long codes
                and not re.match(r'^\$?\d+\.\d{2}$', t)  # prices
                and len(t) > 2
            ]
            for t in filtered:
                if t.isalpha():
                    return t
            # fallback: return the original line
            return line
        for candidate in candidate_lines:
            candidate['name'] = extract_product_name(candidate['original_line'])
        # --- Food dictionary fuzzy matching ---
        items_found = False
        matched_candidates = set()  # Track which candidates were matched by dictionary
        for candidate in candidate_lines:
            match, confidence = fuzzy_match_food(candidate['name'])
            if match:
                items.append({
                    'name': safe_str(match['canonical']),
                    'total_price': candidate['price'],
                    'quantity': candidate['quantity'],
                    'confidence': confidence,
                    'category': safe_str(match['category']),
                    'emissions_kg_per_kg': safe_float(match['emissions_kg_per_kg']),
                    'original_name': safe_str(candidate['name']),
                    'original_line': safe_str(candidate['original_line']),
                    'source': 'dictionary',
                    'estimated_weight_kg': None  # Dictionary items don't have weight info
                })
                matched_candidates.add(candidate['original_line'])
        items_found = len(items) > 0
        
        # --- LLM semantic parse/estimate for ALL unmatched lines ---
        unmatched_candidates = [c for c in candidate_lines if c['original_line'] not in matched_candidates]
        if unmatched_candidates:
            logger.info(f"Calling LLM for {len(unmatched_candidates)} unmatched candidate lines")
            for candidate in unmatched_candidates:
                llm_result = call_llm_for_semantic_parse(candidate['original_line'])
                logger.info(f"LLM result for line '{candidate['original_line']}': {llm_result}")
                if llm_result.get('is_food_item') and llm_result.get('canonical_name') != 'unknown':
                    items.append({
                        'name': safe_str(llm_result.get('canonical_name')),
                        'total_price': candidate['price'],
                        'quantity': candidate['quantity'],
                        'confidence': 0.7,
                        'category': safe_str(llm_result.get('category', 'unknown')),
                        'emissions_kg_per_kg': None,  # LLM gives direct emissions, not per kg
                        'original_name': safe_str(candidate['name']),
                        'original_line': safe_str(candidate['original_line']),
                        'source': 'llm',
                        'estimated_weight_kg': safe_float(llm_result.get('estimated_weight_kg')),
                        'carbon_emissions': safe_float(llm_result.get('estimated_carbon_emissions_kg'))
                    })
                else:
                    log_unknown_item(candidate['name'], candidate['original_line'])
        
        # Fallback: If still no items found, include all lines with a price as unknowns
        if not items:
            for candidate in candidate_lines:
                log_unknown_item(candidate['name'], candidate['original_line'])
                items.append({
                    'name': safe_str(candidate['name']),
                    'total_price': candidate['price'],
                    'quantity': candidate['quantity'],
                    'confidence': 0.3,  # low confidence
                    'category': 'unknown',
                    'emissions_kg_per_kg': None,
                    'original_name': safe_str(candidate['name']),
                    'original_line': safe_str(candidate['original_line']),
                    'source': 'unknown',
                    'estimated_weight_kg': None,
                    'carbon_emissions': None
                })
        return {
            'items': items,
            'merchant': safe_str(merchant),
            'total': total,
            'date': safe_str(date)
        }
    except Exception as error:
        logger.error(f"Error extracting receipt info: {error}")
        return {
            'items': [],
            'merchant': None,
            'total': None,
            'date': None
        }

def estimate_emissions_with_llm(item_name, quantity, price):
    """Prompt the LLM to estimate kg CO2e for an item."""
    if not GROQ_API_KEY:
        logger.warning("GROQ_API_KEY not set, skipping LLM emissions estimation.")
        return None
    prompt = (
        f"Estimate the kg CO2e emissions for the following grocery item, given its name, quantity, and price. "
        f"Respond with a JSON object: {{ 'estimated_kg_co2e': ... }}\n"
        f"Item: '{item_name}', quantity: {quantity}, price: {price}"
    )
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "llama3-8b-8192",
        "messages": [
            {"role": "system", "content": "You are a food carbon emissions expert."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.1,
        "max_tokens": 128
    }
    try:
        response = requests.post(GROQ_BASE_URL, headers=headers, json=data, timeout=20)
        response.raise_for_status()
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        import re, json as pyjson
        match = re.search(r'\{.*?\}', content, re.DOTALL)
        if not match:
            logger.warning(f"LLM emissions response did not contain JSON: {content}")
            return None
        parsed = pyjson.loads(match.group(0).replace("'", '"'))
        return parsed.get('estimated_kg_co2e')
    except Exception as e:
        logger.error(f"LLM emissions estimation failed: {e}")
        return None

def safe_str(val):
    """Safely convert any value to string, handling None/null values"""
    if val is None:
        return ""
    return str(val) if val else ""

def safe_float(val):
    """Safely convert any value to float, handling None/null values"""
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None

def safe_int(val):
    """Safely convert any value to int, handling None/null values"""
    if val is None:
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        return None

def calculate_carbon_emissions(items: List[Dict]) -> tuple[List[Dict], float]:
    """Calculate carbon emissions for each item with safety limits and LLM fallback."""
    enhanced_items = []
    total_emissions = 0.0
    
    for item in items:
        try:
            item_name = safe_str(item.get('name', ''))
            total_price = item.get('total_price', 0.0)
            quantity = item.get('quantity', 1.0)
            emissions_kg_per_kg = item.get('emissions_kg_per_kg')
            # Skip items that are clearly not food
            if not is_likely_food_item(item_name):
                continue
            if emissions_kg_per_kg is not None:
                # Use dataset value
                co2_emissions = emissions_kg_per_kg * quantity
                source = 'dataset'
                confidence = item.get('confidence', 0.8)
            else:
                # Fallback: Use LLM to estimate emissions
                co2_emissions = estimate_emissions_with_llm(item_name, quantity, total_price)
                source = 'ai_estimate'
                confidence = 0.5
            # Apply safety limits to prevent unrealistic emissions
            if co2_emissions is None:
                co2_emissions = 0.0
            if co2_emissions > 50.0:
                co2_emissions = 50.0
                confidence = 0.3
                source = 'Capped estimate'
            # Enhance item with carbon data, ensuring all string fields are non-null
            enhanced_item = item.copy()
            enhanced_item.update({
                'name': safe_str(item.get('name')),
                'category': safe_str(item.get('category')),
                'original_name': safe_str(item.get('original_name')),
                'original_line': safe_str(item.get('original_line')),
                'carbon_emissions': co2_emissions,
                'confidence': confidence,
                'source': source,
                'estimated_weight_kg': safe_float(item.get('estimated_weight_kg'))
            })
            total_emissions += co2_emissions
            enhanced_items.append(enhanced_item)
        except Exception as e:
            logger.error(f"Error calculating emissions for item {item.get('name', 'Unknown')}: {e}")
            # Don't add items that fail emissions calculation
    return enhanced_items, total_emissions

def is_likely_food_item(item_name: str) -> bool:
    """Check if an item name is likely to be a food item"""
    if not item_name or len(item_name) < 2:
        return False
    
    name_lower = item_name.lower()
    
    # Skip obvious non-food items
    non_food_patterns = [
        r'^[A-Z0-9]{8,}',  # Long alphanumeric codes
        r'^\d{8,}',        # Long numbers
        r'^[A-Z]{2,}\d+',  # Store codes
        r'walmart',        # Store names
        r'store',          # Store references
        r'address',        # Address info
        r'phone',          # Phone numbers
        r'account',        # Account info
        r'ref',            # Reference numbers
        r'terminal',       # Terminal info
        r'network',        # Network info
        r'appr',           # Approval codes
        r'code',           # Generic codes
        r'teacher',        # Teacher appreciation
        r'appreciation',   # Appreciation messages
        r'art',            # Art (not food)
        r'st\d+',          # Store transaction codes
        r'com\d+',         # Common codes
        r'drsmith',        # Doctor Smith (not food)
        r'patrol',         # Patrol (not food)
        r'brnmsanml',      # Brand codes
        r'debit',          # Debit transactions
        r'change',         # Change amounts
        r'balance',        # Balance amounts
        r'total',          # Total amounts
        r'tax',            # Tax amounts
        r'subtotal',       # Subtotal amounts
    ]
    
    for pattern in non_food_patterns:
        if re.search(pattern, name_lower):
            return False
    
    # Must contain at least one food-related keyword
    food_keywords = [
        'apple', 'banana', 'orange', 'tomato', 'potato', 'carrot', 'lettuce', 'onion',
        'chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'milk', 'cheese', 'yogurt',
        'bread', 'rice', 'pasta', 'cereal', 'coffee', 'tea', 'juice', 'soda', 'beer',
        'wine', 'chocolate', 'candy', 'chips', 'cookies', 'butter', 'eggs', 'cream',
        'almond', 'peanut', 'walnut', 'olive', 'oil', 'ketchup', 'mayo', 'mustard',
        'soy', 'sauce', 'hot', 'baby', 'diaper', 'wipe', 'dog', 'cat', 'detergent',
        'paper', 'towel', 'frozen', 'canned', 'organic', 'fresh', 'food', 'snack',
        'drink', 'beverage', 'meat', 'dairy', 'fruit', 'vegetable', 'grain', 'nut',
        'seed', 'spice', 'herb', 'condiment', 'sauce', 'dressing', 'spread'
    ]
    
    return any(food_key in name_lower for food_key in food_keywords)

@app.post("/ocr", response_model=OCRResponse)
async def process_receipt(request: OCRRequest):
    """Process receipt image and extract information with carbon footprint calculation"""
    start_time = time.time()
    
    try:
        logger.info("Starting OCR processing")
        
        # Preprocess image
        preprocessed_image = preprocess_image(request.image)
        
        # Extract text using Tesseract
        text, confidence = extract_text_with_tesseract(preprocessed_image)
        
        if not text.strip():
            raise HTTPException(status_code=400, detail="No text extracted from image")
        
        # Extract receipt information
        receipt_data = extract_receipt_info(text)
        items = receipt_data.get('items', [])
        
        # Calculate carbon emissions
        enhanced_items, total_emissions = calculate_carbon_emissions(items)
        
        # Final pass: ensure all string fields are non-null
        for item in enhanced_items:
            for key in ['name', 'category', 'original_name', 'original_line', 'source']:
                item[key] = safe_str(item.get(key))
        
        # Convert to ReceiptItem models
        receipt_items = []
        for item in enhanced_items:
            receipt_item = ReceiptItem(
                name=safe_str(item.get('name', '')),
                quantity=safe_float(item.get('quantity', 1.0)) or 1.0,
                unit_price=safe_float(item.get('unit_price')),
                total_price=safe_float(item.get('total_price')),
                category=safe_str(item.get('category')),
                subcategory=safe_str(item.get('subcategory')),
                carbon_emissions=safe_float(item.get('carbon_emissions')),
                confidence=safe_float(item.get('confidence')),
                estimated_weight_kg=safe_float(item.get('estimated_weight_kg')),
                source=safe_str(item.get('source'))
            )
            receipt_items.append(receipt_item)
        
        processing_time = time.time() - start_time
        logger.info(f"OCR processing completed in {processing_time:.2f}s")
        
        # Get database statistics
        database_stats = get_database_stats()
        
        # Store the result in the global variable
        LAST_OCR_RESULT['result'] = {
            'items': receipt_items,
            'merchant': safe_str(receipt_data.get('merchant')),
            'total': safe_float(receipt_data.get('total')),
            'date': safe_str(receipt_data.get('date')),
            'total_carbon_emissions': safe_float(total_emissions) or 0.0,
            'processing_time': safe_float(processing_time) or 0.0,
            'database_stats': database_stats
        }
        
        return OCRResponse(
            success=True,
            text=safe_str(text),
            confidence=safe_float(confidence) or 0.0,
            items=receipt_items,
            merchant=safe_str(receipt_data.get('merchant')),
            total=safe_float(receipt_data.get('total')),
            date=safe_str(receipt_data.get('date')),
            total_carbon_emissions=safe_float(total_emissions) or 0.0,
            processing_time=safe_float(processing_time) or 0.0,
            database_stats=database_stats
        )
        
    except Exception as e:
        logger.error(f"Error processing receipt: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload", response_model=OCRResponse)
async def upload_endpoint(file: UploadFile = File(...)):
    """Process uploaded receipt file"""
    try:
        # Read file content
        file_content = await file.read()
        
        # Convert to base64
        image_base64 = base64.b64encode(file_content).decode('utf-8')
        
        # Create OCR request
        request = OCRRequest(
            image=image_base64,
            image_type=file.content_type or "image/jpeg"
        )
        
        # Process using the OCR endpoint
        return await process_receipt(request)
        
    except Exception as e:
        logger.error(f"Error processing uploaded file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Clean OCR Service v4.0",
        "timestamp": datetime.now().isoformat(),
        "database_stats": get_database_stats()
    }

@app.get("/ocr/last")
async def get_last_ocr_result():
    """Get the last OCR result for MVP testing"""
    if not LAST_OCR_RESULT:
        return {"success": False, "error": "No OCR result yet. Upload a receipt first."}
    return {"success": True, "data": LAST_OCR_RESULT.get('result', {})}

@app.get("/")
async def root():
    """Root endpoint with service information"""
    stats = get_database_stats()
    return HTMLResponse(f"""
    <html>
        <head>
            <title>Emissionary OCR Service</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 40px; }}
                .container {{ max-width: 800px; margin: 0 auto; }}
                .status {{ padding: 10px; border-radius: 5px; margin: 10px 0; }}
                .success {{ background-color: #d4edda; color: #155724; }}
                .info {{ background-color: #d1ecf1; color: #0c5460; }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🌱 Emissionary OCR Service v4.0</h1>
                <p>Clean, fast receipt processing with carbon footprint calculation</p>
                
                <div class="status success">
                    <strong>Status:</strong> Service is running
                </div>
                
                <div class="status info">
                    <strong>Database:</strong> {stats['total_items']} food items, {stats['categories']} categories
                </div>
                
                <h2>Endpoints:</h2>
                <ul>
                    <li><strong>POST /ocr</strong> - Process base64 encoded image</li>
                    <li><strong>POST /upload</strong> - Upload receipt file</li>
                    <li><strong>GET /health</strong> - Health check</li>
                </ul>
                
                <h2>Features:</h2>
                <ul>
                    <li>Advanced OCR with multiple Tesseract configurations</li>
                    <li>Comprehensive carbon footprint calculation</li>
                    <li>Built-in emissions database with {stats['total_items']} items</li>
                    <li>Smart item categorization and weight estimation</li>
                </ul>
                
                <h2>Database Stats:</h2>
                <ul>
                    <li>Total items: {stats['total_items']}</li>
                    <li>Categories: {stats['categories']}</li>
                    <li>Average CO2: {stats['avg_co2_per_kg']:.2f} kg CO2e/kg</li>
                    <li>Range: {stats['min_co2_per_kg']:.2f} - {stats['max_co2_per_kg']:.2f} kg CO2e/kg</li>
                </ul>
            </div>
        </body>
    </html>
    """)

# --- New: LLM-powered semantic parsing and estimation for unmatched lines ---
def call_llm_for_semantic_parse(line_text: str) -> dict:
    """Call LLM for semantic parsing and direct carbon emissions estimation"""
    if not GROQ_API_KEY:
        logger.warning("GROQ_API_KEY not set, skipping LLM parse/estimate.")
        return {
            "is_food_item": False,
            "canonical_name": "unknown",
            "category": "unknown",
            "estimated_weight_kg": None,
            "estimated_carbon_emissions_kg": None
        }
    
    try:
        # Enhanced prompt for better JSON formatting
        prompt = f"""
Parse this receipt line and estimate carbon emissions. Return ONLY valid JSON without any comments, explanations, or extra text:

Line: "{line_text}"

Return ONLY this exact JSON format (no comments, no explanations):
{{
    "is_food_item": true,
    "canonical_name": "item name",
    "category": "category",
    "estimated_weight_kg": 1.0,
    "estimated_carbon_emissions_kg": 0.5
}}

If not a food item, return ONLY:
{{
    "is_food_item": false,
    "canonical_name": "unknown",
    "category": "unknown", 
    "estimated_weight_kg": null,
    "estimated_carbon_emissions_kg": null
}}

IMPORTANT: Return ONLY the JSON object. No comments, no explanations, no extra text.
"""

        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": "llama-3.1-8b-instant",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.1,
            "max_tokens": 200
        }
        
        response = requests.post(GROQ_BASE_URL, headers=headers, json=data, timeout=30)
        response.raise_for_status()
        
        raw_response = response.json()["choices"][0]["message"]["content"].strip()
        logger.info(f"LLM parse/estimate raw response: {raw_response}")
        
        # More aggressive JSON cleaning
        cleaned_response = raw_response
        
        # Remove any text before the first {
        if '{' in cleaned_response:
            cleaned_response = cleaned_response[cleaned_response.find('{'):]
        
        # Remove any text after the last }
        if '}' in cleaned_response:
            cleaned_response = cleaned_response[:cleaned_response.rfind('}')+1]
        
        # Remove all comments and extra text
        lines = cleaned_response.split('\n')
        cleaned_lines = []
        for line in lines:
            line = line.strip()
            if line:
                # Remove inline comments
                if '//' in line:
                    line = line[:line.find('//')].strip()
                # Remove Note: comments
                if 'Note:' in line:
                    line = line[:line.find('Note:')].strip()
                # Only keep lines that look like JSON
                if line and (line.startswith('{') or line.startswith('}') or ':' in line):
                    cleaned_lines.append(line)
        
        cleaned_response = '\n'.join(cleaned_lines)
        
        # Try to parse the cleaned JSON
        try:
            result = json.loads(cleaned_response)
            logger.info(f"LLM result for line '{line_text}': {result}")
            return result
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing failed after cleaning: {e}")
            logger.error(f"Cleaned response: {cleaned_response}")
            
            # Try to extract just the key-value pairs manually
            try:
                # Look for specific patterns
                is_food_match = re.search(r'"is_food_item":\s*(true|false)', cleaned_response, re.IGNORECASE)
                name_match = re.search(r'"canonical_name":\s*"([^"]+)"', cleaned_response)
                category_match = re.search(r'"category":\s*"([^"]+)"', cleaned_response)
                weight_match = re.search(r'"estimated_weight_kg":\s*([0-9.]+)', cleaned_response)
                emissions_match = re.search(r'"estimated_carbon_emissions_kg":\s*([0-9.]+)', cleaned_response)
                
                result = {
                    "is_food_item": is_food_match.group(1).lower() == 'true' if is_food_match else False,
                    "canonical_name": name_match.group(1) if name_match else "unknown",
                    "category": category_match.group(1) if category_match else "unknown",
                    "estimated_weight_kg": float(weight_match.group(1)) if weight_match else None,
                    "estimated_carbon_emissions_kg": float(emissions_match.group(1)) if emissions_match else None
                }
                logger.info(f"Manual extraction result for line '{line_text}': {result}")
                return result
            except Exception as manual_error:
                logger.error(f"Manual extraction also failed: {manual_error}")
                raise e
        
    except Exception as e:
        logger.error(f"LLM parse/estimate failed: {e}")
        # Return safe fallback
        return {
            "is_food_item": False,
            "canonical_name": "unknown",
            "category": "unknown",
            "estimated_weight_kg": None,
            "estimated_carbon_emissions_kg": None
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 