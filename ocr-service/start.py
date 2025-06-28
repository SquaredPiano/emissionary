#!/usr/bin/env python3
"""
Emissionary OCR Service Startup Script
Handles proper initialization and startup of the FastAPI OCR service
"""

import os
import sys
import logging
import uvicorn
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('ocr_service.log')
    ]
)

logger = logging.getLogger(__name__)

def check_dependencies():
    """Check if all required dependencies are available"""
    required_packages = [
        'fastapi',
        'uvicorn',
        'opencv-python',
        'pillow',
        'numpy',
        'pydantic',
        'python-multipart',
        'requests',
        'scikit-image',
        'scipy',
        'pytesseract',
        'pdf2image',
        'python-dotenv'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            if package == 'opencv-python':
                import cv2
            elif package == 'python-multipart':
                import multipart
            elif package == 'scikit-image':
                import skimage
            elif package == 'pillow':
                import PIL
            elif package == 'pytesseract':
                import pytesseract
            elif package == 'pdf2image':
                import pdf2image
            elif package == 'python-dotenv':
                import dotenv
            else:
                __import__(package.replace('-', '_'))
            logger.info(f"✅ {package} is available")
        except ImportError:
            logger.error(f"❌ {package} is missing")
            missing_packages.append(package)
    
    if missing_packages:
        logger.error(f"Missing packages: {', '.join(missing_packages)}")
        logger.error("Please install missing packages with: pip install -r requirements.txt")
        return False
    
    return True

def check_environment():
    """Check environment configuration"""
    logger.info("Checking environment configuration...")
    
    # Check OCR service configuration
    host = os.getenv("OCR_HOST", "0.0.0.0")
    port = int(os.getenv("OCR_PORT", "8000"))
    
    logger.info(f"OCR Service will run on {host}:{port}")
    
    # Check optional Groq API key
    groq_key = os.getenv("GROQ_API_KEY")
    if groq_key and groq_key != "your-groq-api-key-here":
        logger.info("✅ Groq API key is configured")
    else:
        logger.warning("⚠️  Groq API key not configured - LLM enhancement will be disabled")
    
    return True

def main():
    """Main startup function"""
    logger.info("🚀 Starting Emissionary OCR Service...")
    
    # Check dependencies
    if not check_dependencies():
        logger.error("❌ Dependency check failed. Exiting.")
        sys.exit(1)
    
    # Check environment
    if not check_environment():
        logger.error("❌ Environment check failed. Exiting.")
        sys.exit(1)
    
    # Import the FastAPI app
    try:
        from main import app
        logger.info("✅ FastAPI app imported successfully")
    except ImportError as e:
        logger.error(f"❌ Failed to import FastAPI app: {e}")
        sys.exit(1)
    
    # Get configuration
    host = os.getenv("OCR_HOST", "0.0.0.0")
    port = int(os.getenv("OCR_PORT", "8000"))
    reload = os.getenv("OCR_RELOAD", "false").lower() == "true"
    workers = int(os.getenv("OCR_WORKERS", "1"))
    
    logger.info(f"🎯 Starting server on {host}:{port}")
    logger.info(f"🔄 Reload mode: {reload}")
    logger.info(f"👥 Workers: {workers}")
    
    try:
        # Start the server
        uvicorn.run(
            "main:app",
            host=host,
            port=port,
            reload=reload,
            workers=workers if not reload else 1,
            log_level="info",
            access_log=True
        )
    except KeyboardInterrupt:
        logger.info("🛑 Server stopped by user")
    except Exception as e:
        logger.error(f"❌ Server failed to start: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 