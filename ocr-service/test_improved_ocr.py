#!/usr/bin/env python3
"""
Test script for improved OCR service
Tests item extraction and carbon footprint calculation
"""

import requests
import json
import base64
from PIL import Image
import io
import sys

def test_ocr_with_sample_data(image_path=None):
    """Test OCR service with sample receipt data or real image"""
    if image_path:
        print(f"🖼️ Using real image: {image_path}")
        with open(image_path, "rb") as f:
            img_base64 = base64.b64encode(f.read()).decode('utf-8')
        image_type = "image/png" if image_path.lower().endswith(".png") else "image/jpeg"
    else:
        print("⚠️ No image path provided, using synthetic image (OCR may be poor)")
        # Sample receipt text (simulating OCR output)
        sample_receipt_text = """
        GROCERY STORE
        Receipt #12345
        Date: 12/15/2024
        
        BEEF STEAK 2.5 LB     $15.99
        CHICKEN BREAST 1 LB   $8.99
        MILK 1 GAL            $4.99
        BANANAS 2 LB          $3.99
        BREAD 1 LOAF          $2.99
        TOMATOES 1 LB         $2.49
        APPLES 1 LB           $1.99
        
        SUBTOTAL              $40.43
        TAX                   $3.23
        TOTAL                 $43.66
        
        Thank you for shopping!
        """
        
        # Create a simple test image with the text
        from PIL import Image, ImageDraw, ImageFont
        
        # Create a white image
        img = Image.new('RGB', (400, 600), color='white')
        draw = ImageDraw.Draw(img)
        
        # Add text to image (simplified)
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 16)
        except:
            font = ImageFont.load_default()
        
        lines = sample_receipt_text.strip().split('\n')
        y_position = 20
        for line in lines:
            draw.text((20, y_position), line, fill='black', font=font)
            y_position += 20
        
        # Convert to base64
        img_buffer = io.BytesIO()
        img.save(img_buffer, format='PNG')
        img_base64 = base64.b64encode(img_buffer.getvalue()).decode('utf-8')
        image_type = "image/png"
    
    # Test OCR service
    url = "http://127.0.0.1:8000/ocr"
    
    payload = {
        "image": img_base64,
        "image_type": image_type
    }
    
    try:
        print("🧪 Testing improved OCR service...")
        response = requests.post(url, json=payload, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ OCR service responded successfully!")
            
            print(f"\n📊 Results:")
            print(f"Success: {result.get('success', False)}")
            print(f"Confidence: {result.get('confidence', 0):.2f}")
            print(f"Processing Time: {result.get('processing_time', 0):.2f}s")
            print(f"LLM Enhanced: {result.get('llm_enhanced', False)}")
            
            items = result.get('items', [])
            print(f"\n🛒 Items Found: {len(items)}")
            
            if items:
                total_carbon = 0
                for i, item in enumerate(items, 1):
                    print(f"\n{i}. {item['name']}")
                    print(f"   Quantity: {item['quantity']}")
                    print(f"   Price: ${item.get('total_price', 'N/A')}")
                    print(f"   Category: {item.get('category', 'Unknown')}")
                    print(f"   Carbon Footprint: {item.get('carbon_emissions', 0):.2f} kg CO2e")
                    total_carbon += item.get('carbon_emissions', 0)
                
                print(f"\n🌱 Total Carbon Footprint: {total_carbon:.2f} kg CO2e")
                print(f"💰 Receipt Total: ${result.get('total', 'N/A')}")
                print(f"🏪 Merchant: {result.get('merchant', 'Unknown')}")
                print(f"📅 Date: {result.get('date', 'Unknown')}")
            else:
                print("❌ No items found in receipt")
                
                # Show raw OCR data for debugging
                raw_data = result.get('raw_ocr_data', [])
                if raw_data:
                    print(f"\n🔍 Raw OCR Data ({len(raw_data)} lines):")
                    for i, line in enumerate(raw_data[:10]):  # Show first 10 lines
                        print(f"   {i+1}. {line.get('text', '')}")
                else:
                    print("\n🔍 No raw OCR data available")
                
                # Show full text
                full_text = result.get('text', '')
                if full_text:
                    print(f"\n📝 Full Extracted Text:")
                    print(f"   {full_text[:500]}...")
                else:
                    print("\n📝 No text extracted")
        else:
            print(f"❌ OCR service error: {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
    except Exception as e:
        print(f"❌ Test failed: {e}")

def test_carbon_footprint_db():
    """Test carbon footprint database"""
    print("\n🧪 Testing Carbon Footprint Database...")
    
    from carbon_footprint_db import get_carbon_footprint, categorize_food_item
    
    test_items = [
        ('beef', 1.0),
        ('chicken', 1.0),
        ('milk', 1.0),
        ('bananas', 2.0),
        ('tomatoes', 1.0),
        ('bread', 1.0),
        ('unknown_item', 1.0)
    ]
    
    for item_name, quantity in test_items:
        carbon = get_carbon_footprint(item_name, quantity)
        category = categorize_food_item(item_name)
        print(f"   {item_name} ({quantity}kg): {carbon:.2f} kg CO2e ({category})")

if __name__ == "__main__":
    image_path = sys.argv[1] if len(sys.argv) > 1 else None
    print("🚀 Emissionary OCR Service Test")
    print("=" * 50)
    
    # Test carbon footprint database
    test_carbon_footprint_db()
    
    # Test OCR service
    test_ocr_with_sample_data(image_path)
    
    print("\n✅ Test completed!") 