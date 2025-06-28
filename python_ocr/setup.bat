@echo off
echo Setting up Python OCR Service for Emissionary Dashboard...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

REM Create virtual environment
echo Creating virtual environment...
python -m venv venv

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing Python dependencies...
pip install -r requirements.txt

REM Copy environment file
if not exist .env (
    echo Creating .env file...
    copy .env.example .env
    echo.
    echo IMPORTANT: Please edit .env file and add your OPENAI_API_KEY
    echo.
)

echo.
echo Setup complete!
echo.
echo To run the OCR service:
echo 1. Activate virtual environment: venv\Scripts\activate
echo 2. Run the service: python app.py
echo.
echo The service will be available at http://localhost:5000
pause 