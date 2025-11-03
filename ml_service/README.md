# Machine Learning Risk Assessment Service

## Overview

This Python-based ML service implements **Logistic Regression** for loan default risk prediction. It integrates with the LoanVerse backend to provide AI-powered credit risk assessment.

## 🎯 Key Features

### 1. **Logistic Regression Model**
- Binary classification for loan default prediction
- Trained on 10,000 synthetic loan samples
- **ROC-AUC Score: 0.7134** (71.34% predictive accuracy)
- Balanced class weights to handle data imbalance

### 2. **Comprehensive Evaluation Metrics**
- ✅ **Accuracy**: 66.65%
- ✅ **Precision**: 21.61%
- ✅ **Recall**: 65.98%
- ✅ **F1 Score**: 32.56%
- ✅ **ROC-AUC**: 71.36%
- ✅ **Log Loss**: 0.6206
- ✅ **Confusion Matrix** with visualization

### 3. **Model Comparison**
Compares Logistic Regression vs Heuristic Method:

| Metric | Logistic | Heuristic | Improvement |
|--------|----------|-----------|-------------|
| Accuracy | 66.65% | 16.85% | +295.55% ↑ |
| Precision | 21.61% | 12.68% | +70.46% ↑ |
| F1 Score | 32.56% | 22.47% | +44.89% ↑ |
| ROC-AUC | 71.36% | 68.17% | +4.68% ↑ |
| Log Loss | 0.6206 | 1.4055 | +55.84% ↓ |

**Conclusion**: Logistic Regression significantly outperforms the heuristic method!

### 4. **Real-Time Data Collection**
- Records loan requests as they happen
- Updates loan outcomes (repaid/defaulted)
- Enables continuous model improvement
- Automatic merging of real and synthetic data for retraining

### 5. **Feature Importance**
Top 10 most important features (by coefficient):

1. **repaid_loans** (-0.6889) - Strong negative correlation with default
2. **interest_rate** (+0.3951) - Higher rates indicate higher risk
3. **account_age_days** (-0.3897) - Older accounts are less risky
4. **total_loans** (+0.3722) - More loans = higher risk
5. **stablecoin_ratio** (-0.3260) - Stability reduces risk
6. **defaulted_loans** (+0.2257) - Previous defaults increase risk
7. **collateral_amount** (+0.2008) - More collateral needed = higher risk
8. **loan_amount** (-0.1895) - Larger loans have better profiles
9. **tx_count** (-0.1560) - More transactions = more experience
10. **loan_to_collateral_ratio** (+0.1036) - Higher ratio = higher risk

## 📁 Project Structure

```
ml_service/
├── data/
│   ├── training_data.csv           # Synthetic training data (10K samples)
│   ├── real_loan_data.csv          # Real loan data collection
│   └── combined_training_data.csv  # Merged dataset for retraining
├── models/
│   ├── logistic_model.pkl          # Trained logistic regression model
│   ├── scaler.pkl                  # Feature scaler
│   ├── logistic_model_metadata.json # Model metadata
│   ├── training_report.json        # Detailed training metrics
│   ├── comparison_report.json      # Model comparison results
│   ├── roc_curve.png              # ROC curve visualization
│   ├── confusion_matrix.png       # Confusion matrix plot
│   └── feature_importance.png     # Feature importance chart
├── data_generator.py               # Synthetic data generation
├── logistic_model.py              # Model training & evaluation
├── data_collector.py              # Real-time data collection
├── model_comparison.py            # Comparison framework
├── ml_api.py                      # Flask REST API
└── README.md                      # This file
```

## 🚀 Getting Started

### Prerequisites

```bash
# Python 3.11+ with required packages
pip install scikit-learn pandas numpy flask flask-cors joblib matplotlib seaborn
```

### 1. Generate Training Data

```bash
python ml_service/data_generator.py
```

This generates 10,000 synthetic loan samples based on realistic feature distributions.

### 2. Train the Model

```bash
python ml_service/logistic_model.py
```

This will:
- Train the logistic regression model
- Generate evaluation metrics
- Create visualization plots
- Save the trained model

### 3. Run Model Comparison

```bash
python ml_service/model_comparison.py
```

Compares logistic regression against the heuristic method and generates a report.

### 4. Start the ML API Service

```bash
python ml_service/ml_api.py
```

The API will start on port 3002.

## 📡 API Endpoints

### Prediction Endpoints

#### POST `/predict`
Predict default risk for a single loan.

**Request:**
```json
{
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
  ...
}
```

**Response:**
```json
{
  "success": true,
  "prediction": {
    "default_prediction": 0,
    "default_probability": 0.15,
    "risk_score": 150,
    "risk_category": "Low"
  }
}
```

#### POST `/predict/batch`
Predict risks for multiple loans.

### Model Information

#### GET `/model/info`
Get model metadata and feature importance.

#### GET `/model/metrics`
Get detailed training metrics and cross-validation results.

#### GET `/comparison`
Get comparison report between logistic regression and heuristic.

### Data Collection

#### POST `/data/record`
Record a new loan request.

**Request:**
```json
{
  "loan_id": "0x123...",
  "borrower_address": "0xabc...",
  "tx_count": 500,
  "total_volume": 100000,
  ...
}
```

#### POST `/data/update`
Update loan outcome when repaid or defaulted.

**Request:**
```json
{
  "loan_id": "0x123...",
  "outcome": {
    "default": 0,
    "actual_repayment_time": 0.85,
    "loan_status": "repaid"
  }
}
```

#### GET `/data/statistics`
Get statistics about collected data.

**Response:**
```json
{
  "total_loans": 150,
  "active_loans": 100,
  "completed_loans": 50,
  "default_rate": 0.12,
  "repaid_loans": 44,
  "defaulted_loans": 6
}
```

### Model Retraining

#### POST `/retrain`
Retrain model with new collected data.

This merges real loan data with synthetic data and retrains the model.

### Health Check

#### GET `/health`
Check service status.

## 🔗 Integration with Node.js Backend

The Node.js backend integrates with the ML service through `/api/ml/*` endpoints:

```javascript
// Example: Get risk prediction
const response = await fetch('http://localhost:3001/api/ml/predict', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(loanFeatures)
});

const { prediction } = await response.json();
console.log(`Default probability: ${prediction.default_probability}`);
console.log(`Risk category: ${prediction.risk_category}`);
```

## 📊 Feature Descriptions

### Transaction Analysis (30% weight)
- `tx_count`: Total transaction count
- `total_volume`: Total transaction volume (USD)
- `avg_frequency`: Average transactions per day
- `avg_time_between`: Average hours between transactions

### Portfolio Stability (25% weight)
- `stablecoin_ratio`: Percentage of portfolio in stablecoins
- `avg_holding_period`: Average holding period (days)
- `volatility_index`: Portfolio volatility (0-1)
- `diversity_score`: Portfolio diversity (0-1)

### Lending History (25% weight)
- `total_loans`: Total number of loans taken
- `repaid_loans`: Number of loans repaid
- `defaulted_loans`: Number of loans defaulted
- `avg_repayment_time`: Average repayment time as % of duration

### DeFi Behavior (20% weight)
- `protocol_count`: Number of DeFi protocols used
- `yield_farming_activity`: Yield farming participation (0-1)
- `smart_contract_calls`: Number of smart contract interactions
- `defi_experience`: Days active in DeFi

### Loan Request Features
- `loan_amount`: Requested loan amount
- `collateral_amount`: Collateral provided
- `loan_to_collateral_ratio`: LTV ratio
- `duration_days`: Loan duration in days
- `interest_rate`: Interest rate in basis points

### Account Features
- `account_age_days`: Account age in days

## 🔄 Continuous Improvement

### Data Collection Workflow

1. **Loan Request**: When a loan is requested, record all features
2. **Loan Outcome**: When loan is repaid/defaulted, update the outcome
3. **Accumulate Data**: Collect real-world loan outcomes over time
4. **Retrain Model**: Periodically retrain with real data for better accuracy

### Retraining Process

```bash
# Check data collection stats
curl http://localhost:3002/data/statistics

# When you have enough real data (e.g., 100+ completed loans)
curl -X POST http://localhost:3002/retrain
```

## 📈 Performance Metrics Explained

- **Accuracy**: Overall correctness (66.65% of predictions are correct)
- **Precision**: Of predicted defaults, 21.61% actually default (high precision avoids false alarms)
- **Recall**: Of actual defaults, 65.98% are caught (good at identifying risk)
- **F1 Score**: Harmonic mean of precision and recall (32.56%)
- **ROC-AUC**: Area under ROC curve (71.36% - good discrimination ability)
- **Log Loss**: Probabilistic accuracy (0.62 - lower is better)

## 🎨 Visualizations

The training process generates:
1. **ROC Curve** (`roc_curve.png`) - Model discrimination ability
2. **Confusion Matrix** (`confusion_matrix.png`) - Prediction breakdown
3. **Feature Importance** (`feature_importance.png`) - Top predictive features
4. **Model Comparison** (`model_comparison.png`) - Logistic vs Heuristic

## 🛠️ Development

### Testing the ML Service

```bash
# Test health endpoint
curl http://localhost:3002/health

# Test prediction
curl -X POST http://localhost:3002/predict \
  -H "Content-Type: application/json" \
  -d '{"tx_count": 500, "total_loans": 10, "repaid_loans": 9, ...}'

# Get model info
curl http://localhost:3002/model/info

# Get comparison report
curl http://localhost:3002/comparison
```

## 📝 Notes

- The model is trained on synthetic data initially
- As real loan data is collected, the model can be retrained for improved accuracy
- The logistic regression model is interpretable - feature coefficients show impact
- All predictions include probability scores for risk-based decision making

## 🚀 Next Steps

1. **Collect Real Data**: Integrate with smart contracts to automatically record loans
2. **Periodic Retraining**: Set up automated retraining when sufficient new data is collected
3. **A/B Testing**: Compare predictions from both models in production
4. **Feature Engineering**: Add more sophisticated features as data grows
5. **Hyperparameter Tuning**: Optimize model parameters for better performance

## 📚 References

- Scikit-learn Logistic Regression: https://scikit-learn.org/stable/modules/linear_model.html#logistic-regression
- Model Evaluation Metrics: https://scikit-learn.org/stable/modules/model_evaluation.html
