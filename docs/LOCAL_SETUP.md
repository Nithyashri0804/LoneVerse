# Local Development Setup Guide (VS Code)

This guide will help you set up and run the LoanVerse ML Risk Assessment application locally on your machine using VS Code.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.11+** ([Download](https://www.python.org/downloads/))
- **Node.js 18+** and npm ([Download](https://nodejs.org/))
- **PostgreSQL** (Optional - only if using database features) ([Download](https://www.postgresql.org/download/))
- **VS Code** ([Download](https://code.visualstudio.com/))
- **Git** ([Download](https://git-scm.com/))

## Step 1: Clone and Navigate to Project

```bash
# If cloning from a repository
git clone <your-repo-url>
cd LoanVerse

# Or if you already have the project
cd path/to/LoanVerse
```

## Step 2: Python Environment Setup

### Option A: Using Virtual Environment (Recommended)

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1

# On Windows (Command Prompt):
venv\Scripts\activate.bat

# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Option B: Using System Python

```bash
# Install dependencies directly (not recommended for development)
pip install -r requirements.txt
```

## Step 3: Environment Variables Setup

1. Copy the example environment file:
```bash
# Windows PowerShell
Copy-Item .env.example .env

# macOS/Linux
cp .env.example .env
```

2. Edit `.env` file with your settings:
```env
FLASK_ENV=development
FLASK_DEBUG=True
SESSION_SECRET=generate-a-random-secret-key-here
DATABASE_URL=postgresql://username:password@localhost:5432/loanverse_dev
```

**Note:** For local development without database, the app will work without DATABASE_URL set.

## Step 4: Train the ML Model

The ML model needs to be trained before you can run predictions. Follow these steps:

### 4.1 Generate Training Data

```bash
# From project root
python -m ml_service.data_generator
```

This creates `ml_service/data/training_data.csv` with 10,000 synthetic loan records.

### 4.2 Train the Logistic Regression Model

```bash
# From project root
python -m ml_service.logistic_model
```

Expected output:
```
================================================================================
🎯 TRAINING LOGISTIC REGRESSION MODEL
================================================================================
📂 Loading training data...
✅ Loaded 10000 records
🔧 Preparing features and target...
📊 Training logistic regression model...
✅ Model trained successfully
📈 Evaluating model on test set...

Training Metrics:
accuracy: 0.6665
precision: 0.2161
recall: 0.6598
f1_score: 0.3256
roc_auc: 0.7136
```

This creates:
- `ml_service/models/logistic_model.pkl` - The trained model
- `ml_service/models/scaler.pkl` - Feature scaler
- `ml_service/models/training_report.json` - Detailed metrics
- `ml_service/models/*.png` - Visualization charts

### 4.3 Run Model Comparison (Optional)

```bash
# From project root
python -m ml_service.run_comparison
```

This compares the ML model against the heuristic method and generates comparison charts.

## Step 5: Run the Flask Application

### Option A: Using Python Directly (Development)

```bash
# From project root
python main.py
```

The app will start on http://localhost:5000

### Option B: Using Gunicorn (Production-like)

```bash
# From project root
gunicorn --bind 0.0.0.0:5000 --reuse-port --reload main:app
```

## Step 6: Test the Application

### 6.1 Health Check

Open your browser or use curl:
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "model_loaded": true,
  "service": "ML Risk Assessment Service",
  "status": "healthy"
}
```

### 6.2 Test Prediction

```bash
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "tx_count": 500,
    "total_volume": 100000,
    "stablecoin_ratio": 0.6,
    "total_loans": 10,
    "repaid_loans": 9,
    "defaulted_loans": 0,
    "account_age_days": 365,
    "loan_amount": 10000,
    "collateral_amount": 15000,
    "loan_to_collateral_ratio": 0.67,
    "duration_days": 30,
    "interest_rate": 500,
    "avg_frequency": 5,
    "avg_time_between": 4.8,
    "avg_holding_period": 30,
    "volatility_index": 0.3,
    "diversity_score": 0.7,
    "protocol_count": 5,
    "yield_farming_activity": 0.5,
    "smart_contract_calls": 200,
    "defi_experience": 180
  }'
```

## Step 7: (Optional) Setup React Frontend

If you want to run the frontend as well:

```bash
# Install Node.js dependencies
npm install

# Start the development server
npm run dev
```

The frontend will typically run on http://localhost:3000 or http://localhost:5173 (Vite).

## VS Code Setup

### Recommended Extensions

Install these VS Code extensions for the best development experience:

1. **Python** (ms-python.python)
2. **Pylance** (ms-python.vscode-pylance)
3. **Python Debugger** (ms-python.debugpy)
4. **ESLint** (dbaeumer.vscode-eslint)
5. **Prettier** (esbenp.prettier-vscode)

### Python Interpreter Selection

1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Type "Python: Select Interpreter"
3. Choose the interpreter from your `venv` folder

### Launch Configuration

Create `.vscode/launch.json` for debugging:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: Flask",
      "type": "debugpy",
      "request": "launch",
      "module": "flask",
      "env": {
        "FLASK_APP": "main.py",
        "FLASK_ENV": "development",
        "FLASK_DEBUG": "1"
      },
      "args": [
        "run",
        "--host=0.0.0.0",
        "--port=5000"
      ],
      "jinja": true,
      "justMyCode": false
    },
    {
      "name": "Python: Train Model",
      "type": "debugpy",
      "request": "launch",
      "module": "ml_service.logistic_model",
      "console": "integratedTerminal",
      "justMyCode": false
    }
  ]
}
```

## Troubleshooting

### Issue: "ModuleNotFoundError: No module named 'ml_api'"

**Cause:** Python can't find the ml_service module.

**Fix:** Make sure you're running from the project root directory, not from within the `ml_service` folder.

```bash
# CORRECT (from project root)
python main.py

# WRONG (from ml_service folder)
cd ml_service
python ../main.py
```

### Issue: "Model files not found"

**Cause:** The ML model hasn't been trained yet.

**Fix:** Train the model first:
```bash
python -m ml_service.data_generator
python -m ml_service.logistic_model
```

### Issue: "ModuleNotFoundError: No module named 'sklearn'"

**Cause:** scikit-learn not installed.

**Fix:**
```bash
pip install scikit-learn
```

### Issue: Path problems on Windows

**Cause:** Windows uses backslashes in paths.

**Fix:** Use the module syntax instead:
```bash
python -m ml_service.run_comparison
```

### Issue: "Port 5000 already in use"

**Cause:** Another application is using port 5000.

**Fix:**
```bash
# Option 1: Kill the process using port 5000
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:5000 | xargs kill -9

# Option 2: Change the port in main.py
# Edit line 9: app.run(host='0.0.0.0', port=5001, debug=True)
```

### Issue: Database connection errors

**Cause:** PostgreSQL not running or wrong credentials.

**Fix:**
```bash
# The app will work without database for ML predictions
# Comment out DATABASE_URL in .env if not using database features
```

### Issue: "Permission denied" on macOS/Linux

**Cause:** Insufficient permissions to create virtual environment or install packages.

**Fix:**
```bash
# Don't use sudo with pip
# Instead, use virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## API Endpoints Reference

Once running, you can access these endpoints:

### Health & Info
- `GET /health` - Service health check
- `GET /model/info` - Model information and features
- `GET /model/metrics` - Training metrics

### Predictions
- `POST /predict` - Single loan risk prediction
- `POST /predict/batch` - Batch predictions

### Model Comparison
- `GET /comparison` - Comparison report (logistic vs heuristic)

### Data Collection
- `POST /data/record` - Record loan request
- `POST /data/update` - Update loan outcome
- `GET /data/statistics` - Data collection stats

### Retraining
- `POST /retrain` - Retrain model with new data

### Database
- `GET /pool/stats` - Database connection pool stats

## File Structure

```
LoanVerse/
├── ml_service/              # ML service folder
│   ├── data/               # Training data
│   ├── models/             # Trained models
│   ├── ml_api.py           # Flask API
│   ├── logistic_model.py   # Model training
│   ├── data_generator.py   # Data generation
│   └── run_comparison.py   # Model comparison
├── main.py                 # Application entry point
├── requirements.txt        # Python dependencies
├── .env                    # Environment variables (create from .env.example)
├── .env.example            # Environment template
└── docs/
    └── LOCAL_SETUP.md      # This file
```

## Next Steps

1. ✅ Install Python and dependencies
2. ✅ Set up environment variables
3. ✅ Train the ML model
4. ✅ Run the Flask application
5. ✅ Test with API calls
6. 🎯 Start developing!

## Quick Start Commands Summary

```bash
# 1. Setup virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1  # Windows PowerShell
source venv/bin/activate      # macOS/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Setup environment
Copy-Item .env.example .env   # Windows
cp .env.example .env          # macOS/Linux

# 4. Train model
python -m ml_service.data_generator
python -m ml_service.logistic_model

# 5. Run application
python main.py

# 6. Test
curl http://localhost:5000/health
```

## Support

For more detailed information:
- ML Service: See `ml_service/README.md`
- Quick Start: See `ml_service/QUICK_START.md`
- Presentation Guide: See `PRESENTATION_GUIDE.md`

Happy coding! 🚀
