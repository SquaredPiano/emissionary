import cv2
import numpy as np
import pytesseract
from fastapi import FastAPI, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import base64
import io
from text_parser import parser
import os
from PIL import Image, ImageEnhance, ImageFilter
import logging
import requests
import json

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

class OptimizedOCRProcessor:
    """Optimized OCR processor using the best configuration from fine-tuning"""
    
    def __init__(self):
        # Use the best configuration from fine-tuning: resize + PSM 6 OEM 1
        self.best_config = '--psm 6 --oem 1'
    
    def preprocess_optimized(self, img_array):
        """Apply the optimized preprocessing that worked best"""
        # Resize to 1200px width (this was the key improvement)
        h, w = img_array.shape[:2]
        if w > 1200:
            scale = 1200 / w
            new_width = int(w * scale)
            new_height = int(h * scale)
            img_array = cv2.resize(img_array, (new_width, new_height))
            logger.info(f"Resized image from {w}x{h} to {new_width}x{new_height}")
        
        # Convert to grayscale for better OCR
        gray = cv2.cvtColor(img_array, cv2.COLOR_BGR2GRAY)
        
        # Save debug image
        cv2.imwrite("debug_optimized.png", gray)
        
        return gray
    
    def extract_text_optimized(self, img_array):
        """Extract text using the optimized configuration"""
        logger.info("Starting optimized OCR processing")
        
        # Apply optimized preprocessing
        processed_img = self.preprocess_optimized(img_array)
        
        try:
            logger.info(f"Using optimized config: {self.best_config}")
            text = pytesseract.image_to_string(processed_img, config=self.best_config)
            
            # Clean up the text
            text = text.strip()
            
            logger.info(f"Optimized OCR result: {len(text)} characters")
            
            # Log first 200 characters for debugging
            preview = text[:200].replace('\n', '\\n')
            logger.info(f"Text preview: {preview}")
            
            return text
            
        except Exception as e:
            logger.error(f"Optimized OCR failed: {e}")
            return ""
    
    def perform_optimized_ocr(self, img_array):
        """Main OCR function with optimized processing"""
        try:
            # Ensure img_array is properly decoded as an image
            if len(img_array.shape) == 1:
                logger.info(f"Decoding 1D array of shape {img_array.shape}")
                img_array = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
                if img_array is None:
                    raise ValueError("Failed to decode image from bytes")
            
            logger.info(f"Image shape: {img_array.shape}")
            
            # Extract text using optimized method
            text = self.extract_text_optimized(img_array)
            
            logger.info(f"OCR completed. Text length: {len(text)}")
            
            return text
            
        except Exception as e:
            logger.error(f"OCR processing failed: {e}")
            return ""

def perform_ocr(img):
    """Main OCR function - using optimized processor"""
    processor = OptimizedOCRProcessor()
    return processor.perform_optimized_ocr(img)

@app.get("/")
async def root():
    return {"message": "Welcome to the Hybrid OCR API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Hybrid OCR Service"}

@app.post("/ocr")
async def ocr_receipt_json(request: dict):
    try:
        # Extract base64 image from request
        image_data = request.get("image", "")
        if not image_data:
            return JSONResponse(content={"error": "No image data provided"}, status_code=400)
        
        # Remove data URL prefix if present
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        # Decode base64 image
        image_bytes = base64.b64decode(image_data)
        img_array = np.frombuffer(image_bytes, np.uint8)
        
        logger.info(f"Processing image of shape: {img_array.shape}")
        
        # Perform hybrid OCR
        ocr_text = perform_ocr(img_array)
        
        # Parse the OCR text into structured JSON
        parsed_result = parser.parse_receipt_text(ocr_text)
        
        # Add the raw OCR text and metadata for debugging
        parsed_result["text"] = ocr_text
        parsed_result["success"] = True
        parsed_result["confidence"] = 0.8
        parsed_result["processing_time"] = 0
        parsed_result["text_length"] = len(ocr_text)
        
        logger.info(f"Parsing completed. Items found: {len(parsed_result.get('items', []))}")
        
        return JSONResponse(content=parsed_result, status_code=200)
        
    except Exception as e:
        logger.error(f"Exception in /ocr: {e}")
        return JSONResponse(content={"error": str(e)}, status_code=400)

@app.post("/ocr/")
async def ocr_receipt(file: UploadFile):
    if file.content_type and file.content_type.startswith("image"):
        image_bytes = await file.read()
        img_array = np.frombuffer(image_bytes, np.uint8)
        
        try:
            logger.info(f"Processing uploaded file: {file.filename}")
            
            ocr_text = perform_ocr(img_array)
            
            # Parse the OCR text into structured JSON
            parsed_result = parser.parse_receipt_text(ocr_text)
            
            # Add the raw OCR text and metadata for debugging
            parsed_result["text"] = ocr_text
            parsed_result["success"] = True
            parsed_result["confidence"] = 0.8
            parsed_result["processing_time"] = 0
            parsed_result["text_length"] = len(ocr_text)
            
            logger.info(f"Parsing completed. Items found: {len(parsed_result.get('items', []))}")
            
            return JSONResponse(content=parsed_result, status_code=200)
            
        except Exception as e:
            logger.error(f"Exception in /ocr/ (file): {e}")
            return JSONResponse(content={"error": str(e)}, status_code=400)
    else:
        logger.error("Uploaded file is not an image")
        return JSONResponse(content={"error": "Uploaded file is not an image"}, status_code=400)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000) 