#!/usr/bin/env python3
"""
Test script for PaddleOCR installation and functionality with real receipt image
"""

import sys
import os
import cv2  # type: ignore
import numpy as np
from PIL import Image
import asyncio

def test_imports():
    """Test if all required packages can be imported"""
    print("Testing imports...")
    
    try:
        import cv2
        print("OpenCV imported successfully")
    except ImportError as import_error:
        print(f"OpenCV import failed: {import_error}")
        return False
    
    try:
        import numpy as np
        print("NumPy imported successfully")
    except ImportError as import_error:
        print(f"NumPy import failed: {import_error}")
        return False
    
    try:
        from PIL import Image
        print("PIL imported successfully")
    except ImportError as import_error:
        print(f"PIL import failed: {import_error}")
        return False
    
    try:
        from paddleocr import PaddleOCR
        print("PaddleOCR imported successfully")
    except ImportError as import_error:
        print(f"PaddleOCR import failed: {import_error}")
        print("Please install PaddleOCR: pip install paddleocr")
        return False
    
    try:
        from skimage import filters
        print("scikit-image imported successfully")
    except ImportError as import_error:
        print(f"scikit-image import failed: {import_error}")
        return False
    
    try:
        from scipy import ndimage
        print("SciPy imported successfully")
    except ImportError as import_error:
        print(f"SciPy import failed: {import_error}")
        return False
    
    return True

def test_paddleocr_initialization():
    """Test PaddleOCR initialization"""
    print("\nTesting PaddleOCR initialization...")
    
    try:
        from paddleocr import PaddleOCR
        
        # Initialize with minimal settings for testing
        reader = PaddleOCR(
            use_textline_orientation=True,
            lang='en',
            use_gpu=False,
            show_log=False  # Reduce logging output
        )
        print("PaddleOCR initialized successfully")
        return reader
    except (ImportError, RuntimeError) as init_error:
        print(f"PaddleOCR initialization failed: {init_error}")
        try:
            # Fallback to even more minimal settings
            reader = PaddleOCR(
                lang='en',
                use_gpu=False,
                show_log=False
            )
            print("PaddleOCR initialized with fallback settings")
            return reader
        except (ImportError, RuntimeError) as fallback_error:
            print(f"PaddleOCR fallback initialization also failed: {fallback_error}")
            return None

def test_real_ocr_with_receipt(reader):
    """Test OCR functionality with the actual receipt.png file"""
    print("\nTesting OCR with receipt.png...")
    
    try:
        # Check if receipt.png exists
        if not os.path.exists('receipt.png'):
            print("receipt.png not found in current directory")
            return False
        
        # Load the receipt image
        image = cv2.imread('receipt.png')
        if image is None:
            print("Failed to load receipt.png")
            return False
        
        print(f"Loaded receipt.png: {image.shape}")
        
        # Perform OCR
        try:
            results = reader.predict(image)
        except AttributeError:
            # Fallback to old API if predict doesn't exist
            results = reader.ocr(image)
        
        if results is None or len(results) == 0:
            print("No OCR results returned")
            return False
        
        # Extract and display results
        print("OCR completed successfully!")
        print(f"Found {len(results[0])} text regions")
        
        # Show first 10 results
        print("\nFirst 10 detected text items:")
        for i, line in enumerate(results[0][:10]):
            if line and len(line) >= 2:
                text = line[1][0]  # Extracted text
                confidence = line[1][1]  # Confidence score
                print(f"  {i+1}. '{text}' (confidence: {confidence:.3f})")
        
        return True
        
    except (OSError, IOError) as file_error:
        print(f"File error in OCR test: {file_error}")
        return False
    except (ImportError, RuntimeError) as ocr_error:
        print(f"OCR processing error: {ocr_error}")
        return False

def test_preprocessing_pipeline():
    """Test the preprocessing pipeline from main.py"""
    print("\nTesting preprocessing pipeline...")
    
    try:
        # Import the preprocessing function from main
        from main import advanced_preprocess_image
        import base64
        
        # Load receipt.png and convert to base64
        with open('receipt.png', 'rb') as f:
            image_bytes = f.read()
        
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        
        # Test preprocessing
        processed_image = advanced_preprocess_image(image_base64)
        
        print(f"Preprocessing successful: {processed_image.shape}")
        print(f"  Image type: {processed_image.dtype}")
        print(f"  Value range: {processed_image.min()} - {processed_image.max()}")
        
        return True
        
    except (OSError, IOError) as file_error:
        print(f"File error in preprocessing test: {file_error}")
        return False
    except (ValueError, TypeError) as processing_error:
        print(f"Processing error in preprocessing test: {processing_error}")
        return False

async def test_full_pipeline():
    """Test the complete OCR pipeline from main.py"""
    print("\nTesting complete OCR pipeline...")
    
    try:
        # Import the main processing function
        from main import process_receipt, OCRRequest
        
        # Load receipt.png and convert to base64
        with open('receipt.png', 'rb') as f:
            image_bytes = f.read()
        
        import base64
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        
        # Create OCR request
        request = OCRRequest(
            image=image_base64,
            image_type="image/png"
        )
        
        # Process the receipt - now properly awaited
        result = await process_receipt(request)
        
        print("Full pipeline completed successfully!")
        print(f"  Confidence: {result.confidence:.3f}")
        print(f"  Processing time: {result.processing_time:.2f}s")
        print(f"  Items found: {len(result.items) if result.items else 0}")
        print(f"  Merchant: {result.merchant}")
        print(f"  Total: ${result.total}")
        print(f"  Total carbon: {result.total_carbon_emissions:.2f} kg CO2e")
        
        if result.items:
            print("\n  Items:")
            for item in result.items[:5]:  # Show first 5 items
                print(f"    - {item.name}: ${item.total_price} ({item.carbon_emissions:.2f} kg CO2e)")
        
        return True
        
    except (OSError, IOError) as file_error:
        print(f"File error in full pipeline test: {file_error}")
        import traceback
        traceback.print_exc()
        return False
    except (ValueError, TypeError) as processing_error:
        print(f"Processing error in full pipeline test: {processing_error}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Main test function"""
    print("PaddleOCR Installation and Functionality Test")
    print("=" * 50)
    
    # Test imports
    if not test_imports():
        print("\n❌ Import tests failed. Please install missing packages.")
        sys.exit(1)
    
    # Test PaddleOCR initialization
    reader = test_paddleocr_initialization()
    if reader is None:
        print("\n❌ PaddleOCR initialization failed.")
        sys.exit(1)
    
    # Test real OCR with receipt.png
    if not test_real_ocr_with_receipt(reader):
        print("\n❌ Real OCR test failed.")
        sys.exit(1)
    
    # Test preprocessing pipeline
    if not test_preprocessing_pipeline():
        print("\n❌ Preprocessing test failed.")
        sys.exit(1)
    
    # Test full pipeline - now async
    if not await test_full_pipeline():
        print("\n❌ Full pipeline test failed.")
        sys.exit(1)
    
    print("\n✅ All tests passed! PaddleOCR is ready to use.")
    print("\nYou can now run the main OCR service with:")
    print("python main.py")

if __name__ == "__main__":
    asyncio.run(main()) 