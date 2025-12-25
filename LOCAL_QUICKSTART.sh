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

echo "Step 6: Training standard ML model..."
python -m ml_service.logistic_model
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to train model"
    exit 1
fi
echo "✓ Standard model trained successfully"
echo ""

echo "Step 7: Training enhanced model with feature engineering..."
echo "(This includes hyperparameter tuning and may take 2-3 minutes)"
python -m ml_service.enhanced_model
if [ $? -ne 0 ]; then
    echo "WARNING: Enhanced model training failed, continuing with standard model"
    echo "You can manually train it later with: python -m ml_service.enhanced_model"
else
    echo "✓ Enhanced model trained successfully"
fi
echo ""

echo "Step 8: Running model comparison..."
python -m ml_service.test_enhanced_model
if [ $? -ne 0 ]; then
    echo "WARNING: Model comparison failed"
else
    echo "✓ Model comparison complete"
fi
echo ""

echo "================================================================================"
echo "Setup Complete!"
echo "================================================================================"
echo ""
echo "Both models are ready:"
echo "  • Standard Model: ml_service/models/logistic_model.pkl"
echo "  • Enhanced Model: ml_service/models/enhanced_model.pkl"
echo ""
echo "Generated visualizations:"
echo "  • Feature importance: ml_service/models/enhanced_feature_importance.png"
echo "  • ROC curve: ml_service/models/enhanced_roc_curve.png"
echo "  • Confusion matrix: ml_service/models/enhanced_confusion_matrix.png"
echo ""
echo "To start the application:"
echo "  python main.py"
echo ""
echo "To run model comparison again:"
echo "  python -m ml_service.test_enhanced_model"
echo ""
echo "For more details, see: ml_service/MODEL_IMPROVEMENTS.md"
echo ""
