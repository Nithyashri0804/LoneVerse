@echo off
echo ================================================================================
echo LoanVerse ML Risk Assessment - Local Setup
echo ================================================================================
echo.

echo Step 1: Creating virtual environment...
python -m venv venv
if %errorlevel% neq 0 (
    echo ERROR: Failed to create virtual environment
    pause
    exit /b 1
)
echo ✓ Virtual environment created
echo.

echo Step 2: Activating virtual environment...
call venv\Scripts\activate.bat
echo ✓ Virtual environment activated
echo.

echo Step 3: Installing Python dependencies...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo ✓ Dependencies installed
echo.

echo Step 4: Setting up environment file...
if not exist .env (
    copy .env.example .env
    echo ✓ .env file created from .env.example
    echo WARNING: Please edit .env file with your settings
) else (
    echo ✓ .env file already exists
)
echo.

echo Step 5: Generating training data...
python -m ml_service.data_generator
if %errorlevel% neq 0 (
    echo ERROR: Failed to generate training data
    pause
    exit /b 1
)
echo ✓ Training data generated
echo.

echo Step 6: Training ML model...
python -m ml_service.logistic_model
if %errorlevel% neq 0 (
    echo ERROR: Failed to train model
    pause
    exit /b 1
)
echo ✓ Model trained successfully
echo.

echo ================================================================================
echo Setup Complete!
echo ================================================================================
echo.
echo To start the application:
echo   python main.py
echo.
echo To run model comparison:
echo   python -m ml_service.run_comparison
echo.
echo For more details, see: docs\LOCAL_SETUP.md
echo.
pause
