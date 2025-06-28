#!/usr/bin/env python3
"""
Debug script to test the parsing logic
"""

import requests
import json

def test_parsing():
    """Test the parsing logic with the receipt"""
    
    # Upload the receipt and get the response
    with open('receipt.png', 'rb') as f:
        files = {'file': f}
        response = requests.post('http://localhost:8000/upload', files=files)
    
    data = response.json()
    
    print("Full text:")
    print(data['text'])
    print("\n" + "="*50)
    
    print("Merchant:", data['merchant'])
    print("Total:", data['total'])
    print("Items count:", len(data['items']) if data['items'] else 0)
    
    print("\n" + "="*50)
    print("Raw OCR data (first 20 items with Y positions):")
    for i, item in enumerate(data['raw_ocr_data'][:20]):
        y_pos = (item['bbox'][0][1] + item['bbox'][2][1]) / 2
        print(f"{i+1:2d}. '{item['text']}' (conf: {item['confidence']:.3f}, y: {y_pos:.1f})")
    
    print("\n" + "="*50)
    print("Looking for STORE and TOTAL:")
    for item in data['raw_ocr_data']:
        if 'STORE' in item['text'] or 'TOTAL' in item['text']:
            y_pos = (item['bbox'][0][1] + item['bbox'][2][1]) / 2
            print(f"'{item['text']}' at Y position {y_pos:.1f}")
    
    print("\n" + "="*50)
    print("Testing merchant extraction logic:")
    # Simulate the merchant extraction logic
    for i, item in enumerate(data['raw_ocr_data']):
        text = item['text'].strip()
        if 'STORE' in text.upper():
            print(f"Found STORE: '{text}' at position {i+1}")
            break
        elif i < 10:  # Show first 10 items
            print(f"Position {i+1}: '{text}'")

if __name__ == "__main__":
    test_parsing() 