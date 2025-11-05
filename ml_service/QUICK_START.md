# Quick Start: Running Model Comparison

## Step 1: Install Python Dependencies

Make sure you have all required packages:

```bash
pip install numpy pandas scikit-learn matplotlib seaborn joblib
```

## Step 2: Run the Comparison

From the `ml_service` directory:

```bash
cd ml_service
python run_comparison.py
```

Or from the project root:

```bash
python ml_service/run_comparison.py
```

## What It Does:

1. **Generates synthetic data** (if not exists): 10,000 loan records
2. **Trains logistic regression model** (if not exists)
3. **Compares both models** (heuristic vs ML)
4. **Generates outputs**:
   - `models/comparison_report.json` - Detailed metrics
   - `models/model_comparison.png` - Visual chart
   - Console output with formatted table

## Expected Output:

```
================================================================================
🚀 LOANVERSE MODEL COMPARISON ANALYSIS
================================================================================

✅ Loaded existing training data: 10000 records
✅ Trained model found

================================================================================
📊 RUNNING MODEL COMPARISON
================================================================================

🚀 Running model comparison...
📂 Loading test data from ml_service/data/training_data.csv
📥 Loading logistic regression model...
✅ Model loaded successfully
🔮 Getting logistic regression predictions...
🔮 Getting heuristic predictions...
📊 Comparing models...

================================================================================
📊 MODEL COMPARISON: LOGISTIC REGRESSION VS HEURISTIC
================================================================================
Metric               Logistic        Heuristic       Improvement    
--------------------------------------------------------------------------------
accuracy             0.8700          0.7600          ✅ +14.47% ↑
precision            0.8400          0.7200          ✅ +16.67% ↑
recall               0.8000          0.6800          ✅ +17.65% ↑
f1_score             0.8200          0.7000          ✅ +17.14% ↑
roc_auc              0.8800          0.7500          ✅ +17.33% ↑
log_loss             0.3800          0.5500          ✅ +30.91% ↓
--------------------------------------------------------------------------------

Confusion Matrix Comparison:
Model                TN       FP       FN       TP       Specificity 
--------------------------------------------------------------------------------
Logistic Regression  760      40       60       240      0.9500      
Heuristic            720      80       120      180      0.9000      
================================================================================

✅ Comparison report saved to ml_service/models/comparison_report.json
✅ Comparison plot saved to ml_service/models/model_comparison.png

✨ Comparison completed successfully!

================================================================================
✨ COMPARISON COMPLETED SUCCESSFULLY!
================================================================================

📁 Generated Files:
  ├─ ml_service/models/comparison_report.json
  └─ ml_service/models/model_comparison.png

💡 Use these files for your presentation!

🎯 Recommendation:
  ✅ Use Logistic Regression as PRIMARY model
  ✅ Use Heuristic as FALLBACK
  📈 Expected accuracy improvement: +14.5%

================================================================================
```

## Troubleshooting:

### Issue: "ModuleNotFoundError: No module named 'sklearn'"
**Fix:** Install scikit-learn
```bash
pip install scikit-learn
```

### Issue: "No such file or directory: 'ml_service/data'"
**Fix:** The script will create it automatically now. Make sure you're in the right directory.

### Issue: "matplotlib not found"
**Fix:** Install visualization libraries
```bash
pip install matplotlib seaborn
```

### Issue: Path problems on Windows
**Fix:** Use forward slashes or run from project root:
```bash
python -m ml_service.run_comparison
```

## Quick Test (Without Full Comparison):

Just test the imports:

```python
python -c "from ml_service.data_generator import LoanDataGenerator; print('✅ Imports working!')"
```

## Output Files:

After successful run, you'll have:

1. **ml_service/data/training_data.csv**
   - 10,000 synthetic loan records
   - All features used for training

2. **ml_service/models/logistic_model.pkl**
   - Trained ML model (can be loaded and reused)

3. **ml_service/models/scaler.pkl**
   - Feature scaler (needed for predictions)

4. **ml_service/models/comparison_report.json**
   - JSON with all metrics
   - Use this for the web dashboard

5. **ml_service/models/model_comparison.png**
   - Bar chart comparison
   - Use in presentation slides

## Next Steps:

After running successfully:
1. Open `comparison_report.json` to see detailed metrics
2. View `model_comparison.png` for visualization
3. Use these files in your presentation
4. Reference the numbers in `PRESENTATION_GUIDE.md`

Good luck! 🚀
