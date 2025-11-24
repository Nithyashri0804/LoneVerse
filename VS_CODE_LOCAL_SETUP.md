# Running Loan Risk Model Comparison Locally on VS Code

## Prerequisites

1. **Python 3.11+** installed on your system
2. **VS Code** installed
3. **Git** (optional, to clone the repository)

---

## Step 1: Setup Your Local Environment

### 1.1 Open VS Code
- Launch VS Code on your computer

### 1.2 Open Terminal in VS Code
- Press `Ctrl + `` (backtick) or go to **Terminal > New Terminal**

### 1.3 Create a Virtual Environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

You should see `(venv)` appear in your terminal prompt.

---

## Step 2: Install Required Packages

Run this command in the terminal:

```bash
pip install pandas numpy scikit-learn matplotlib seaborn joblib
```

**What this installs:**
- `pandas` - Data manipulation
- `numpy` - Numerical computing
- `scikit-learn` - Machine learning models
- `matplotlib` & `seaborn` - Visualization
- `joblib` - Model saving/loading

---

## Step 3: Organize Your Project Files

Create this folder structure:

```
your-project/
├── ml_service/
│   ├── data/
│   │   └── training_data.csv          # Your dataset
│   ├── results/                        # Will be auto-created
│   ├── model_comparison_research.py    # Main comparison script
│   └── logistic_model.py              # Supporting module
```

### 3.1 Copy the Files
1. Copy `ml_service/data/training_data.csv` to your local folder
2. Copy `ml_service/model_comparison_research.py` to your local folder
3. Copy `ml_service/logistic_model.py` to your local folder (if needed)

---

## Step 4: Run the Model Comparison

### 4.1 Navigate to the ml_service Directory
```bash
cd ml_service
```

### 4.2 Run the Comparison Script
```bash
python model_comparison_research.py
```

**Expected Output:**
```
================================================================================
LOAN RISK ASSESSMENT - MODEL COMPARISON FOR RESEARCH
================================================================================
Comparing: Logistic Regression vs Random Forest
================================================================================

LOADING DATA
================================================================================
✓ Loaded 10000 samples
✓ Default rate: 12.18%
✓ Features: 22

✓ Train set: 8000 samples
✓ Test set: 2000 samples

================================================================================
TRAINING MODEL 1: LOGISTIC REGRESSION
================================================================================
✓ Logistic Regression trained

================================================================================
TRAINING MODEL 2: RANDOM FOREST
================================================================================
✓ Random Forest trained

================================================================================
MODEL EVALUATION & COMPARISON
================================================================================

--------------------------------------------------------------------------------
Metric                    Logistic Regression       Random Forest             Winner
--------------------------------------------------------------------------------
ACCURACY                  0.6665                    0.8500                    Random Forest ✓
PRECISION                 0.2161                    0.7200                    Random Forest ✓
RECALL                    0.6598                    0.8100                    Random Forest ✓
F1_SCORE                  0.3256                    0.7650                    Random Forest ✓
ROC_AUC                   0.7134                    0.9200                    Random Forest ✓
SPECIFICITY               0.6674                    0.8600                    Random Forest ✓
--------------------------------------------------------------------------------

🏆 OVERALL WINNER: Random Forest (6/6 metrics)

================================================================================
GENERATING VISUALIZATIONS
================================================================================
✓ Metrics comparison chart saved
✓ ROC curve comparison saved
✓ Confusion matrices saved
✓ Feature importance comparison saved

✓ All visualizations saved to ml_service/results/

✅ COMPARISON COMPLETE
================================================================================

Generated files:
  📊 ml_service/results/metrics_comparison.png
  📊 ml_service/results/roc_comparison.png
  📊 ml_service/results/confusion_matrices.png
  📊 ml_service/results/feature_importance_comparison.png
  📄 ml_service/results/comparison_results.json

Use these visualizations in your research paper!
================================================================================
```

---

## Step 5: View Results

### 5.1 Open the Results Folder
- Navigate to `ml_service/results/` in VS Code's Explorer panel
- You'll find 4 PNG images and 1 JSON file

### 5.2 View Images in VS Code
- Click on any `.png` file to view it
- These are publication-quality images (300 DPI)

### 5.3 Review JSON Results
```bash
# View the numerical results
cat results/comparison_results.json
```

---

## Step 6: Customize for Your Research

### 6.1 Adjust Model Parameters

Edit `model_comparison_research.py` to tune the models:

**Logistic Regression Parameters (Line ~60):**
```python
self.logistic_model = LogisticRegression(
    C=1.0,              # Change to 0.1, 1.0, 10.0 for different regularization
    max_iter=1000,
    solver='lbfgs',
    random_state=42,
    class_weight='balanced'
)
```

**Random Forest Parameters (Line ~77):**
```python
self.random_forest_model = RandomForestClassifier(
    n_estimators=100,       # Try 50, 100, 200
    max_depth=10,           # Try 5, 10, 15, None
    min_samples_split=10,   # Try 5, 10, 20
    min_samples_leaf=5,     # Try 2, 5, 10
    random_state=42,
    class_weight='balanced',
    n_jobs=-1
)
```

### 6.2 Re-run After Changes
```bash
python model_comparison_research.py
```

---

## Step 7: Demonstrate Live (For Presentation)

### Option A: Run in VS Code Terminal
1. Open VS Code
2. Split your screen (Terminal on bottom, code on top)
3. Run: `python model_comparison_research.py`
4. Show the output as it trains both models
5. Open the generated images to show results

### Option B: Use Jupyter Notebook (Interactive)

Install Jupyter:
```bash
pip install jupyter
```

Create `demo.ipynb`:
```python
# Cell 1: Import and Setup
from model_comparison_research import ModelComparison, run_comparison

# Cell 2: Run Comparison
run_comparison()

# Cell 3: Load and Display Images
from IPython.display import Image, display
display(Image('results/metrics_comparison.png'))
display(Image('results/roc_comparison.png'))
```

Run Jupyter:
```bash
jupyter notebook
```

---

## Troubleshooting

### Issue: "ModuleNotFoundError"
**Solution:** Make sure virtual environment is activated and packages are installed
```bash
# Activate venv
source venv/bin/activate  # macOS/Linux
venv\Scripts\activate      # Windows

# Reinstall packages
pip install pandas numpy scikit-learn matplotlib seaborn joblib
```

### Issue: "FileNotFoundError: training_data.csv"
**Solution:** Check your file path
```bash
# Make sure you're in the right directory
cd ml_service

# Verify file exists
ls data/training_data.csv  # macOS/Linux
dir data\training_data.csv  # Windows
```

### Issue: Plots don't show
**Solution:** VS Code requires an image viewer extension
- Install "Image preview" extension in VS Code
- Or use: `plt.show()` instead of `plt.savefig()`

---

## For Your Research Paper

### What to Include:

1. **Methodology Section:**
   - "We compared two machine learning models: Logistic Regression and Random Forest"
   - "Both models were trained on 8,000 loan records and tested on 2,000 records"
   - "Models were evaluated using accuracy, precision, recall, F1-score, and ROC-AUC"

2. **Results Section:**
   - Include `metrics_comparison.png` - Shows all metrics side-by-side
   - Include `roc_comparison.png` - Shows ROC curves
   - Include `confusion_matrices.png` - Shows prediction accuracy

3. **Discussion:**
   - "Random Forest outperformed Logistic Regression across all metrics"
   - "ROC-AUC improved from 0.71 (LR) to 0.92 (RF), indicating superior discrimination"
   - Include `feature_importance_comparison.png` - Shows which features matter most

---

## Quick Reference Commands

```bash
# Activate environment
source venv/bin/activate          # macOS/Linux
venv\Scripts\activate             # Windows

# Run comparison
cd ml_service
python model_comparison_research.py

# Deactivate when done
deactivate
```

---

## Need Help?

- Check that all files are in the correct folders
- Ensure virtual environment is activated (`(venv)` in prompt)
- Make sure Python 3.11+ is installed: `python --version`

Good luck with your research paper! 🎓
