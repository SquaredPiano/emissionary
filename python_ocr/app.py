from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
from PIL import Image
import pytesseract
import re
import base64
import io
import openai
import os
from typing import List, Dict

app = Flask(__name__)
CORS(app)  # Enable CORS for Next.js integration

# Configure OpenAI (you can also use local models)
openai.api_key = os.getenv('OPENAI_API_KEY')

def preprocess_image(image):
    """Preprocess image for better OCR results"""
    # Convert to grayscale
    gray = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2GRAY)
    
    # Apply threshold to make it binary
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Denoise
    denoised = cv2.medianBlur(thresh, 3)
    
    return Image.fromarray(denoised)

def extract_text_from_image(image_data):
    """Extract text from image using Tesseract OCR"""
    try:
        # Decode base64 image
        if image_data.startswith('data:image'):
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        
        # Preprocess image
        processed_image = preprocess_image(image)
        
        # Extract text using Tesseract
        custom_config = r'--oem 3 --psm 6'
        text = pytesseract.image_to_string(processed_image, config=custom_config)
        
        return text
    except Exception as e:
        print(f"OCR Error: {e}")
        return None

def parse_receipt_with_ai(raw_text: str) -> Dict:
    """Use AI to parse receipt text and extract structured data"""
    prompt = f"""
    Parse this receipt text and extract structured information. Return a JSON with:
    - store_name: Name of the store
    - items: Array of objects with item_name, quantity, and unit_price
    - total_amount: Total receipt amount
    - date: Receipt date if found
    
    Focus on identifying food items with their quantities (e.g., "2 lb apples", "1 gallon milk").
    
    Receipt text:
    {raw_text}
    
    Return only valid JSON:
    """
    
    try:
        response = openai.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert at parsing receipt data. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1
        )
        
        import json
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"AI Parsing Error: {e}")
        return {"error": "Failed to parse receipt with AI"}

@app.route('/api/ocr/process', methods=['POST'])
def process_receipt():
    """Main endpoint to process receipt image"""
    try:
        data = request.json
        image_data = data.get('image')
        
        if not image_data:
            return jsonify({"error": "No image data provided"}), 400
        
        # Step 1: Extract raw text using OCR
        raw_text = extract_text_from_image(image_data)
        if not raw_text:
            return jsonify({"error": "Failed to extract text from image"}), 500
        
        # Step 2: Parse text with AI to get structured data
        parsed_data = parse_receipt_with_ai(raw_text)
        
        # Step 3: Return structured response
        return jsonify({
            "success": True,
            "raw_text": raw_text,
            "parsed_data": parsed_data,
            "processing_info": {
                "ocr_engine": "Tesseract",
                "ai_parser": "OpenAI GPT-4"
            }
        })
        
    except Exception as e:
        print(f"Processing Error: {e}")
        return jsonify({"error": f"Processing failed: {str(e)}"}), 500

@app.route('/api/ocr/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "OCR Processing"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True) 