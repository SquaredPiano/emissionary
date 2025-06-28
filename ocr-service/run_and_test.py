#!/usr/bin/env python3
"""
Run and Test Script for Emissionary OCR Service
This script starts the service and runs comprehensive tests.
"""

import subprocess
import time
import requests
import sys
import os
from pathlib import Path

def check_dependencies():
    """Check if all required dependencies are installed"""
    print("🔍 Checking dependencies...")
    
    required_packages = [
        'fastapi', 'uvicorn', 'paddleocr', 'opencv-python', 
        'pillow', 'numpy', 'pydantic', 'requests', 'scikit-image', 'scipy'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
            print(f"✅ {package}")
        except ImportError:
            missing_packages.append(package)
            print(f"❌ {package} - MISSING")
    
    if missing_packages:
        print(f"\n❌ Missing packages: {', '.join(missing_packages)}")
        print("💡 Install them with: pip install -r requirements.txt")
        return False
    
    print("✅ All dependencies are installed!")
    return True

def start_service():
    """Start the OCR service"""
    print("\n🚀 Starting OCR Service...")
    
    try:
        # Start the service in the background
        process = subprocess.Popen(
            [sys.executable, "main.py"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Wait a bit for the service to start
        print("⏳ Waiting for service to start...")
        time.sleep(5)
        
        # Check if the service is running
        try:
            response = requests.get("http://localhost:8000/health", timeout=5)
            if response.status_code == 200:
                print("✅ Service started successfully!")
                return process
            else:
                print("❌ Service failed to start properly")
                process.terminate()
                return None
        except requests.exceptions.ConnectionError:
            print("❌ Service is not responding")
            process.terminate()
            return None
            
    except Exception as e:
        print(f"❌ Failed to start service: {str(e)}")
        return None

def run_tests():
    """Run the test suite"""
    print("\n🧪 Running Test Suite...")
    
    try:
        result = subprocess.run(
            [sys.executable, "test_ocr.py"],
            capture_output=True,
            text=True,
            timeout=60
        )
        
        print(result.stdout)
        if result.stderr:
            print("Errors:", result.stderr)
        
        return result.returncode == 0
        
    except subprocess.TimeoutExpired:
        print("❌ Tests timed out")
        return False
    except Exception as e:
        print(f"❌ Test execution failed: {str(e)}")
        return False

def check_groq_configuration():
    """Check if Groq API is configured"""
    print("\n🤖 Checking Groq Configuration...")
    
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            health_data = response.json()
            groq_configured = health_data.get('groq_configured', False)
            
            if groq_configured:
                print("✅ Groq API is configured!")
                print("💡 LLM-enhanced carbon calculations will be available")
            else:
                print("⚠️  Groq API is not configured")
                print("💡 Set GROQ_API_KEY environment variable for enhanced features")
                print("💡 Basic carbon calculations will still work")
            
            return groq_configured
        else:
            print("❌ Could not check Groq configuration")
            return False
            
    except Exception as e:
        print(f"❌ Error checking Groq configuration: {str(e)}")
        return False

def main():
    """Main execution function"""
    print("🌱 Emissionary OCR Service - Run & Test")
    print("=" * 50)
    
    # Check dependencies
    if not check_dependencies():
        print("\n❌ Please install missing dependencies first")
        return
    
    # Start service
    service_process = start_service()
    if not service_process:
        print("\n❌ Failed to start service")
        return
    
    try:
        # Check Groq configuration
        groq_configured = check_groq_configuration()
        
        # Run tests
        tests_passed = run_tests()
        
        # Summary
        print("\n" + "=" * 50)
        print("📋 Final Summary:")
        print(f"🔧 Service Status: {'✅ RUNNING' if service_process else '❌ FAILED'}")
        print(f"🤖 Groq API: {'✅ CONFIGURED' if groq_configured else '⚠️  NOT CONFIGURED'}")
        print(f"🧪 Tests: {'✅ PASSED' if tests_passed else '❌ FAILED'}")
        
        if service_process and tests_passed:
            print("\n🎉 Everything is working!")
            print("\n🌐 Access Points:")
            print("   • Web Interface: http://localhost:8000")
            print("   • API Documentation: http://localhost:8000/docs")
            print("   • Health Check: http://localhost:8000/health")
            print("\n💡 Press Ctrl+C to stop the service")
            
            # Keep the service running
            try:
                service_process.wait()
            except KeyboardInterrupt:
                print("\n🛑 Stopping service...")
                service_process.terminate()
                print("✅ Service stopped")
        else:
            print("\n⚠️  Some components are not working properly")
            
    finally:
        # Clean up
        if service_process:
            service_process.terminate()

if __name__ == "__main__":
    main() 