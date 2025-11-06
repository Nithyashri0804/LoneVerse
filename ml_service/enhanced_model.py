"""
Enhanced Logistic Regression Model with Feature Engineering and Hyperparameter Tuning
Based on feature importance insights
"""

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import make_scorer, f1_score, roc_auc_score
import joblib
import json
from datetime import datetime
from .logistic_model import LoanRiskLogisticModel


class EnhancedLoanRiskModel(LoanRiskLogisticModel):
    """Enhanced model with feature engineering and optimized hyperparameters"""
    
    def __init__(self, model_path='ml_service/models/enhanced_model.pkl',
                 scaler_path='ml_service/models/enhanced_scaler.pkl'):
        super().__init__(model_path, scaler_path)
        self.feature_engineer = FeatureEngineer()
        
    def prepare_features(self, df, target_col='default', apply_engineering=True):
        """Prepare features with optional engineering"""
        if apply_engineering:
            df = self.feature_engineer.create_features(df)
        
        # Exclude target and probability columns
        exclude_cols = [target_col, 'default_probability']
        feature_cols = [col for col in df.columns if col not in exclude_cols]
        
        X = df[feature_cols]
        y = df[target_col] if target_col in df.columns else None
        
        self.feature_names = feature_cols
        return X, y
    
    def train_with_tuning(self, X_train, y_train, cv=5):
        """
        Train with hyperparameter tuning using GridSearchCV
        Focus on regularization strength (C) and penalty type
        """
        print("🔍 Starting hyperparameter tuning...")
        
        # Parameter grid based on feature importance insights
        param_grid = {
            'C': [0.001, 0.01, 0.1, 0.5, 1.0, 2.0, 5.0, 10.0],  # Regularization strength
            'penalty': ['l1', 'l2'],  # L1 for feature selection, L2 for all features
            'solver': ['liblinear', 'saga'],  # Solvers that support both L1 and L2
            'class_weight': ['balanced'],
            'max_iter': [2000]
        }
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        
        # Create base model
        base_model = LogisticRegression(random_state=42)
        
        # GridSearchCV with F1 and ROC-AUC scoring
        scoring = {
            'f1': make_scorer(f1_score),
            'roc_auc': make_scorer(roc_auc_score)
        }
        
        grid_search = GridSearchCV(
            base_model,
            param_grid,
            cv=cv,
            scoring=scoring,
            refit='f1',  # Optimize for F1 score
            n_jobs=-1,
            verbose=1
        )
        
        print(f"🎯 Testing {len(param_grid['C']) * len(param_grid['penalty'])} parameter combinations...")
        grid_search.fit(X_train_scaled, y_train)
        
        # Store best model
        self.model = grid_search.best_estimator_
        
        print("\n✅ Best parameters found:")
        for param, value in grid_search.best_params_.items():
            print(f"  {param}: {value}")
        print(f"\n  Best F1 Score (CV): {grid_search.best_score_:.4f}")
        
        # Store tuning results
        self.tuning_results = {
            'best_params': grid_search.best_params_,
            'best_score': float(grid_search.best_score_),
            'cv_results': {
                'mean_f1': grid_search.cv_results_['mean_test_f1'].tolist(),
                'mean_roc_auc': grid_search.cv_results_['mean_test_roc_auc'].tolist(),
                'params': [str(p) for p in grid_search.cv_results_['params']]
            }
        }
        
        return self.model
    
    def get_feature_selection_report(self):
        """Report which features were selected (non-zero coefficients for L1)"""
        if self.model is None:
            return {}
        
        coefficients = self.model.coef_[0]
        selected_features = []
        dropped_features = []
        
        for feature, coef in zip(self.feature_names, coefficients):
            if abs(coef) > 1e-6:  # Consider non-zero
                selected_features.append({
                    'feature': feature,
                    'coefficient': float(coef)
                })
            else:
                dropped_features.append(feature)
        
        return {
            'selected_count': len(selected_features),
            'dropped_count': len(dropped_features),
            'selected_features': sorted(selected_features, 
                                       key=lambda x: abs(x['coefficient']), 
                                       reverse=True),
            'dropped_features': dropped_features,
            'penalty': self.model.penalty if hasattr(self.model, 'penalty') else 'unknown'
        }
    
    def save_model(self):
        """Save enhanced model with additional metadata"""
        super().save_model()
        
        # Save feature engineering info
        if hasattr(self, 'tuning_results'):
            tuning_path = self.model_path.replace('.pkl', '_tuning.json')
            with open(tuning_path, 'w') as f:
                json.dump(self.tuning_results, f, indent=2)
            print(f"✅ Tuning results saved to {tuning_path}")
        
        # Save feature selection report
        selection_report = self.get_feature_selection_report()
        selection_path = self.model_path.replace('.pkl', '_feature_selection.json')
        with open(selection_path, 'w') as f:
            json.dump(selection_report, f, indent=2)
        print(f"✅ Feature selection report saved to {selection_path}")


class FeatureEngineer:
    """Feature engineering based on domain knowledge and feature importance"""
    
    def create_features(self, df):
        """Create engineered features"""
        df = df.copy()
        
        # Ratio features (from top predictors)
        if 'repaid_loans' in df.columns and 'total_loans' in df.columns:
            df['repayment_rate'] = df['repaid_loans'] / (df['total_loans'] + 1)  # Avoid division by zero
        
        if 'defaulted_loans' in df.columns and 'total_loans' in df.columns:
            df['default_rate'] = df['defaulted_loans'] / (df['total_loans'] + 1)
        
        if 'collateral_amount' in df.columns and 'loan_amount' in df.columns:
            df['collateral_to_loan_ratio'] = df['collateral_amount'] / (df['loan_amount'] + 1)
        
        # Financial health score
        if 'stablecoin_ratio' in df.columns and 'avg_holding_period' in df.columns:
            df['stability_score'] = df['stablecoin_ratio'] * np.log1p(df['avg_holding_period'])
        
        # Experience score
        if 'account_age_days' in df.columns and 'total_loans' in df.columns:
            df['experience_score'] = np.log1p(df['account_age_days']) * np.log1p(df['total_loans'])
        
        # Risk concentration
        if 'loan_amount' in df.columns and 'total_volume' in df.columns:
            df['loan_concentration'] = df['loan_amount'] / (df['total_volume'] + 1)
        
        # Interaction: interest rate x loan to collateral (high risk combination)
        if 'interest_rate' in df.columns and 'loan_to_collateral_ratio' in df.columns:
            df['risk_premium_signal'] = df['interest_rate'] * df['loan_to_collateral_ratio']
        
        return df


def train_enhanced_model(data_path='ml_service/data/training_data.csv', 
                        perform_tuning=True):
    """Train enhanced model with hyperparameter tuning"""
    print("🚀 Starting enhanced model training pipeline...")
    
    # Load data
    print(f"📂 Loading data from {data_path}")
    df = pd.read_csv(data_path)
    print(f"✅ Loaded {len(df)} samples")
    
    # Initialize enhanced model
    model = EnhancedLoanRiskModel()
    
    # Prepare features with engineering
    print("🔧 Applying feature engineering...")
    X, y = model.prepare_features(df, apply_engineering=True)
    print(f"📊 Features after engineering: {X.shape[1]}, Samples: {X.shape[0]}")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"✅ Train: {len(X_train)}, Test: {len(X_test)}")
    
    # Train with or without tuning
    if perform_tuning:
        model.train_with_tuning(X_train, y_train, cv=5)
    else:
        # Use optimized defaults based on previous tuning
        model.train(X_train, y_train, 
                   C=0.1,  # Stronger regularization
                   penalty='l1', 
                   solver='liblinear')
    
    # Evaluate
    print("\n📈 Evaluating enhanced model...")
    metrics, y_pred, y_pred_proba = model.evaluate(X_test, y_test)
    
    # Store metrics
    model.training_metrics = metrics
    
    # Print results
    print("\n" + "="*60)
    print("📊 ENHANCED MODEL EVALUATION METRICS")
    print("="*60)
    print(f"Accuracy:    {metrics['accuracy']:.4f}")
    print(f"Precision:   {metrics['precision']:.4f}")
    print(f"Recall:      {metrics['recall']:.4f}")
    print(f"F1 Score:    {metrics['f1_score']:.4f}")
    print(f"ROC-AUC:     {metrics['roc_auc']:.4f}")
    print(f"Specificity: {metrics['specificity']:.4f}")
    print("="*60)
    
    # Feature selection report
    print("\n🎯 Feature Selection Report:")
    selection = model.get_feature_selection_report()
    print(f"  Selected features: {selection['selected_count']}")
    print(f"  Dropped features: {selection['dropped_count']}")
    print(f"  Penalty type: {selection['penalty']}")
    
    print("\n⭐ Top 10 Selected Features:")
    for i, item in enumerate(selection['selected_features'][:10], 1):
        print(f"  {i}. {item['feature']:35s} {item['coefficient']:+.4f}")
    
    if selection['dropped_features']:
        print(f"\n🗑️  Dropped features ({len(selection['dropped_features'])}):")
        print(f"  {', '.join(selection['dropped_features'][:10])}")
    
    # Generate plots
    print("\n📊 Generating visualization plots...")
    model.plot_roc_curve(y_test, y_pred_proba, 
                        save_path='ml_service/models/enhanced_roc_curve.png')
    model.plot_confusion_matrix(y_test, y_pred, 
                               save_path='ml_service/models/enhanced_confusion_matrix.png')
    model.plot_feature_importance(top_n=20, 
                                 save_path='ml_service/models/enhanced_feature_importance.png')
    
    # Save model
    print("\n💾 Saving enhanced model...")
    model.save_model()
    
    print("\n✨ Enhanced model training completed successfully!")
    return model, metrics


if __name__ == "__main__":
    # Train enhanced model with hyperparameter tuning
    model, metrics = train_enhanced_model(perform_tuning=True)
