#!/usr/bin/env python3
"""
Debug script to test OCR with better text extraction
"""

import cv2
import numpy as np
from PIL import Image
import base64
import io
from paddleocr import PaddleOCR

def test_ocr_directly():
    """Test OCR directly on the receipt image"""
    print("Testing OCR directly on receipt.png...")
    
    # Initialize PaddleOCR
    reader = PaddleOCR(
        use_textline_orientation=True,
        lang='en',
        use_gpu=False,
        show_log=False
    )
    
    # Load the receipt image
    image = cv2.imread('receipt.png')
    if image is None:
        print("Failed to load receipt.png")
        return
    
    print(f"Image shape: {image.shape}")
    
    # Perform OCR
    try:
        results = reader.predict(image)
    except AttributeError:
        results = reader.ocr(image)
    
    if not results or not results[0]:
        print("No OCR results")
        return
    
    print(f"\nFound {len(results[0])} text regions:")
    print("=" * 50)
    
    # Sort by Y position for better reading order
    text_lines = []
    for line in results[0]:
        if line and len(line) >= 2:
            text = line[1][0]
            confidence = line[1][1]
            bbox = line[0]
            y_pos = np.mean([point[1] for point in bbox])
            text_lines.append((y_pos, text, confidence, bbox))
    
    # Sort by Y position
    text_lines.sort(key=lambda x: x[0])
    
    # Print all text with confidence
    for i, (y_pos, text, confidence, bbox) in enumerate(text_lines):
        print(f"{i+1:2d}. '{text}' (conf: {confidence:.3f}, y: {y_pos:.1f})")
    
    # Print full text
    print("\n" + "=" * 50)
    print("FULL TEXT:")
    print("=" * 50)
    full_text = '\n'.join([text for _, text, _, _ in text_lines])
    print(full_text)
    
    # Look for specific patterns
    print("\n" + "=" * 50)
    print("ANALYSIS:")
    print("=" * 50)
    
    # Look for prices
    import re
    price_pattern = r'\$?\d+\.\d{2}'
    prices = re.findall(price_pattern, full_text)
    print(f"Prices found: {prices}")
    
    # Look for store names
    store_keywords = ['walmart', 'target', 'costco', 'kroger', 'safeway', 'store']
    for line in text_lines:
        text_lower = line[1].lower()
        for keyword in store_keywords:
            if keyword in text_lower:
                print(f"Possible store: '{line[1]}'")
    
    # Look for dates
    date_patterns = [
        r'\d{1,2}/\d{1,2}/\d{2,4}',
        r'\d{1,2}-\d{1,2}-\d{2,4}',
        r'\d{4}-\d{2}-\d{2}',
    ]
    for line in text_lines:
        for pattern in date_patterns:
            if re.search(pattern, line[1]):
                print(f"Possible date: '{line[1]}'")

if __name__ == "__main__":
    test_ocr_directly() 