#!/usr/bin/env python3
"""
Comprehensive validation script for the fixed OCR service
Tests all major components and error handling improvements
"""

import asyncio
import base64
import os
import sys
from typing import Dict, Any

def test_imports_and_initialization():
    """Test all imports and initialization"""
    print("🔍 Testing imports and initialization...")
    
    try:
        import cv2
        print("✅ OpenCV imported successfully")
    except ImportError as error:
        print(f"❌ OpenCV import failed: {error}")
        return False
    
    try:
        import numpy as np
        print("✅ NumPy imported successfully")
    except ImportError as error:
        print(f"❌ NumPy import failed: {error}")
        return False
    
    try:
        from PIL import Image
        print("✅ PIL imported successfully")
    except ImportError as error:
        print(f"❌ PIL import failed: {error}")
        return False
    
    try:
        from paddleocr import PaddleOCR
        print("✅ PaddleOCR imported successfully")
    except ImportError as error:
        print(f"❌ PaddleOCR import failed: {error}")
        return False
    
    try:
        from main import app, process_receipt, OCRRequest, advanced_preprocess_image
        print("✅ Main service components imported successfully")
    except ImportError as error:
        print(f"❌ Main service import failed: {error}")
        return False
    
    return True

def test_error_handling():
    """Test the improved error handling"""
    print("\n🔍 Testing error handling improvements...")
    
    try:
        from main import advanced_preprocess_image
        
        # Test with invalid base64
        try:
            advanced_preprocess_image("invalid_base64")
            print("❌ Should have raised ValueError for invalid base64")
            return False
        except ValueError:
            print("✅ Properly caught ValueError for invalid base64")
        
        # Test with empty string
        try:
            advanced_preprocess_image("")
            print("❌ Should have raised ValueError for empty string")
            return False
        except ValueError:
            print("✅ Properly caught ValueError for empty string")
        
        return True
        
    except Exception as error:
        print(f"❌ Error handling test failed: {error}")
        return False

def test_constants_and_configuration():
    """Test that constants are properly defined"""
    print("\n🔍 Testing constants and configuration...")
    
    try:
        from main import (
            MIN_IMAGE_HEIGHT, CLAHE_CLIP_LIMIT, CLAHE_TILE_GRID_SIZE,
            BILATERAL_FILTER_D, BILATERAL_FILTER_SIGMA_COLOR, BILATERAL_FILTER_SIGMA_SPACE,
            CANNY_LOW_THRESHOLD, CANNY_HIGH_THRESHOLD, HOUGH_LINES_THRESHOLD,
            ROTATION_ANGLE_THRESHOLD
        )
        
        print("✅ All constants properly defined")
        print(f"  - MIN_IMAGE_HEIGHT: {MIN_IMAGE_HEIGHT}")
        print(f"  - CLAHE_CLIP_LIMIT: {CLAHE_CLIP_LIMIT}")
        print(f"  - BILATERAL_FILTER_D: {BILATERAL_FILTER_D}")
        print(f"  - CANNY_LOW_THRESHOLD: {CANNY_LOW_THRESHOLD}")
        
        return True
        
    except ImportError as error:
        print(f"❌ Constants import failed: {error}")
        return False

async def test_full_pipeline():
    """Test the complete OCR pipeline with error handling"""
    print("\n🔍 Testing complete OCR pipeline...")
    
    try:
        from main import process_receipt, OCRRequest
        
        # Check if receipt.png exists
        if not os.path.exists('receipt.png'):
            print("❌ receipt.png not found")
            return False
        
        # Load receipt.png and convert to base64
        with open('receipt.png', 'rb') as f:
            image_bytes = f.read()
        
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        
        # Create OCR request
        request = OCRRequest(
            image=image_base64,
            image_type="image/png"
        )
        
        # Process the receipt
        result = await process_receipt(request)
        
        print("✅ Full pipeline completed successfully!")
        print(f"  - Success: {result.success}")
        print(f"  - Confidence: {result.confidence:.3f}")
        print(f"  - Processing time: {result.processing_time:.2f}s")
        print(f"  - Items found: {len(result.items) if result.items else 0}")
        print(f"  - Merchant: {result.merchant}")
        print(f"  - Total: ${result.total}")
        print(f"  - Total carbon: {result.total_carbon_emissions:.2f} kg CO2e")
        print(f"  - LLM Enhanced: {result.llm_enhanced}")
        
        return True
        
    except Exception as error:
        print(f"❌ Full pipeline test failed: {error}")
        import traceback
        traceback.print_exc()
        return False

def test_exception_handling_patterns():
    """Test that we're using specific exception types instead of generic Exception"""
    print("\n🔍 Testing exception handling patterns...")
    
    try:
        with open('main.py', 'r') as f:
            content = f.read()
        
        # Check for generic Exception catches
        generic_exceptions = content.count('except Exception as')
        if generic_exceptions > 0:
            print(f"❌ Found {generic_exceptions} generic Exception catches")
            return False
        
        # Check for specific exception types
        specific_exceptions = content.count('except (') + content.count('except ImportError') + content.count('except ValueError')
        print(f"✅ Using specific exception types: {specific_exceptions} specific catches found")
        
        return True
        
    except Exception as error:
        print(f"❌ Exception pattern test failed: {error}")
        return False

async def main():
    """Main validation function"""
    print("🚀 OCR Service Validation Suite")
    print("=" * 50)
    
    tests = [
        ("Imports and Initialization", test_imports_and_initialization),
        ("Error Handling", test_error_handling),
        ("Constants and Configuration", test_constants_and_configuration),
        ("Exception Handling Patterns", test_exception_handling_patterns),
        ("Full Pipeline", test_full_pipeline),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        try:
            if asyncio.iscoroutinefunction(test_func):
                result = await test_func()
            else:
                result = test_func()
            
            if result:
                passed += 1
                print(f"✅ {test_name}: PASSED")
            else:
                print(f"❌ {test_name}: FAILED")
                
        except Exception as error:
            print(f"❌ {test_name}: ERROR - {error}")
    
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! The OCR service is ready for production.")
        return True
    else:
        print("⚠️  Some tests failed. Please review the issues above.")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1) 