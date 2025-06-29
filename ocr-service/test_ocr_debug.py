#!/usr/bin/env python3
"""
Simple test script to debug OCR service issues
"""

import cv2
import numpy as np
import pytesseract
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_basic_ocr():
    """Test basic OCR functionality"""
    print("=== Testing Basic OCR ===")
    
    try:
        # Load the image
        print("Loading image...")
        img = cv2.imread('receipt.png')
        if img is None:
            print("ERROR: Could not load image")
            return
        
        print(f"Image shape: {img.shape}")
        
        # Test basic OCR
        print("Running basic OCR...")
        start_time = time.time()
        
        # Try simple OCR first
        text = pytesseract.image_to_string(img, config='--psm 6 --oem 1')
        
        end_time = time.time()
        print(f"OCR completed in {end_time - start_time:.2f} seconds")
        print(f"Text length: {len(text)}")
        print(f"First 200 chars: {text[:200]}")
        
        return text
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        return None

def test_preprocessing():
    """Test preprocessing steps"""
    print("\n=== Testing Preprocessing ===")
    
    try:
        # Load the image
        img = cv2.imread('receipt.png')
        if img is None:
            print("ERROR: Could not load image")
            return
        
        # Test grayscale conversion
        print("Converting to grayscale...")
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        print(f"Grayscale shape: {gray.shape}")
        
        # Test adaptive thresholding
        print("Applying adaptive thresholding...")
        start_time = time.time()
        adaptive = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
        end_time = time.time()
        print(f"Adaptive thresholding completed in {end_time - start_time:.2f} seconds")
        
        # Test OCR on preprocessed image
        print("Running OCR on preprocessed image...")
        start_time = time.time()
        text = pytesseract.image_to_string(adaptive, config='--psm 6 --oem 1')
        end_time = time.time()
        print(f"OCR on preprocessed image completed in {end_time - start_time:.2f} seconds")
        print(f"Text length: {len(text)}")
        print(f"First 200 chars: {text[:200]}")
        
        return text
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        return None

def test_tesseract_installation():
    """Test Tesseract installation"""
    print("\n=== Testing Tesseract Installation ===")
    
    try:
        # Check Tesseract version
        version = pytesseract.get_tesseract_version()
        print(f"Tesseract version: {version}")
        
        # Check available languages
        langs = pytesseract.get_languages()
        print(f"Available languages: {langs}")
        
        return True
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("Starting OCR debug tests...")
    
    # Test Tesseract installation
    if not test_tesseract_installation():
        print("Tesseract installation test failed!")
        exit(1)
    
    # Test basic OCR
    basic_result = test_basic_ocr()
    
    # Test preprocessing
    preprocessed_result = test_preprocessing()
    
    print("\n=== Summary ===")
    print(f"Basic OCR result: {'SUCCESS' if basic_result else 'FAILED'}")
    print(f"Preprocessed OCR result: {'SUCCESS' if preprocessed_result else 'FAILED'}")
    
    if basic_result:
        print(f"Basic OCR text length: {len(basic_result)}")
    if preprocessed_result:
        print(f"Preprocessed OCR text length: {len(preprocessed_result)}") 