#!/bin/bash

echo "================================================================================"
echo "LoanVerse ML Risk Assessment - Local Setup"
echo "================================================================================"
echo ""

echo "Step 1: Creating virtual environment..."
python3 -m venv venv
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to create virtual environment"
    exit 1
fi
echo "✓ Virtual environment created"
echo ""

echo "Step 2: Activating virtual environment..."
source venv/bin/activate
echo "✓ Virtual environment activated"
echo ""

echo "Step 3: Installing Python dependencies..."
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies"
    exit 1
fi
echo "✓ Dependencies installed"
echo ""

echo "Step 4: Setting up environment file..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✓ .env file created from .env.example"
    echo "WARNING: Please edit .env file with your settings"
else
    echo "✓ .env file already exists"
fi
echo ""

echo "Step 5: Generating training data..."
python -m ml_service.data_generator
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to generate training data"
    exit 1
fi
echo "✓ Training data generated"
echo ""

echo "Step 6: Training ML model..."
python -m ml_service.logistic_model
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to train model"
    exit 1
fi
echo "✓ Model trained successfully"
echo ""

echo "================================================================================"
echo "Setup Complete!"
echo "================================================================================"
echo ""
echo "To start the application:"
echo "  python main.py"
echo ""
echo "To run model comparison:"
echo "  python -m ml_service.run_comparison"
echo ""
echo "For more details, see: docs/LOCAL_SETUP.md"
echo ""
