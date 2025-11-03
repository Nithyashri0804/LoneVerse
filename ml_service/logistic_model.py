"""
Logistic Regression Model for Loan Risk Assessment
Includes training, evaluation, and comparison with heuristic method
"""

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, roc_curve, confusion_matrix, log_loss,
    classification_report
)
import joblib
import json
from datetime import datetime
import matplotlib.pyplot as plt
import seaborn as sns


class LoanRiskLogisticModel:
    def __init__(self, model_path='ml_service/models/logistic_model.pkl',
                 scaler_path='ml_service/models/scaler.pkl'):
        self.model = None
        self.scaler = StandardScaler()
        self.model_path = model_path
        self.scaler_path = scaler_path
        self.feature_names = []
        self.training_metrics = {}
        
    def prepare_features(self, df, target_col='default'):
        """Prepare features for training"""
        # Exclude target and probability columns
        exclude_cols = [target_col, 'default_probability']
        feature_cols = [col for col in df.columns if col not in exclude_cols]
        
        X = df[feature_cols]
        y = df[target_col] if target_col in df.columns else None
        
        self.feature_names = feature_cols
        return X, y
    
    def train(self, X_train, y_train, **kwargs):
        """
        Train logistic regression model
        kwargs can include: C (regularization), max_iter, solver, etc.
        """
        # Default parameters optimized for loan risk
        params = {
            'C': kwargs.get('C', 1.0),
            'max_iter': kwargs.get('max_iter', 1000),
            'solver': kwargs.get('solver', 'lbfgs'),
            'random_state': kwargs.get('random_state', 42),
            'class_weight': kwargs.get('class_weight', 'balanced')  # Handle imbalanced data
        }
        
        print(f"🎯 Training Logistic Regression with params: {params}")
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        
        # Train model
        self.model = LogisticRegression(**params)
        self.model.fit(X_train_scaled, y_train)
        
        print("✅ Model training completed")
        return self.model
    
    def evaluate(self, X_test, y_test):
        """
        Evaluate model and return comprehensive metrics
        """
        X_test_scaled = self.scaler.transform(X_test)
        
        # Predictions
        y_pred = self.model.predict(X_test_scaled)
        y_pred_proba = self.model.predict_proba(X_test_scaled)[:, 1]
        
        # Calculate all metrics
        metrics = {
            'accuracy': accuracy_score(y_test, y_pred),
            'precision': precision_score(y_test, y_pred, zero_division=0),
            'recall': recall_score(y_test, y_pred, zero_division=0),
            'f1_score': f1_score(y_test, y_pred, zero_division=0),
            'roc_auc': roc_auc_score(y_test, y_pred_proba),
            'log_loss': log_loss(y_test, y_pred_proba),
            'confusion_matrix': confusion_matrix(y_test, y_pred).tolist(),
            'classification_report': classification_report(y_test, y_pred, output_dict=True)
        }
        
        # Calculate additional metrics
        tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel()
        metrics['true_negatives'] = int(tn)
        metrics['false_positives'] = int(fp)
        metrics['false_negatives'] = int(fn)
        metrics['true_positives'] = int(tp)
        metrics['specificity'] = tn / (tn + fp) if (tn + fp) > 0 else 0
        
        return metrics, y_pred, y_pred_proba
    
    def cross_validate(self, X, y, cv=5):
        """Perform cross-validation"""
        X_scaled = self.scaler.fit_transform(X)
        
        # Cross-validation scores
        cv_scores = {
            'accuracy': cross_val_score(self.model, X_scaled, y, cv=cv, scoring='accuracy'),
            'precision': cross_val_score(self.model, X_scaled, y, cv=cv, scoring='precision'),
            'recall': cross_val_score(self.model, X_scaled, y, cv=cv, scoring='recall'),
            'f1': cross_val_score(self.model, X_scaled, y, cv=cv, scoring='f1'),
            'roc_auc': cross_val_score(self.model, X_scaled, y, cv=cv, scoring='roc_auc')
        }
        
        cv_results = {
            metric: {
                'mean': float(scores.mean()),
                'std': float(scores.std()),
                'scores': scores.tolist()
            }
            for metric, scores in cv_scores.items()
        }
        
        return cv_results
    
    def get_feature_importance(self):
        """Get feature importance from coefficients"""
        if self.model is None:
            return {}
        
        coefficients = self.model.coef_[0]
        importance = pd.DataFrame({
            'feature': self.feature_names,
            'coefficient': coefficients,
            'abs_coefficient': np.abs(coefficients)
        }).sort_values('abs_coefficient', ascending=False)
        
        return importance.to_dict('records')
    
    def predict(self, X):
        """Make predictions on new data"""
        if self.model is None:
            raise ValueError("Model not trained. Call train() first.")
        
        X_scaled = self.scaler.transform(X)
        predictions = self.model.predict(X_scaled)
        probabilities = self.model.predict_proba(X_scaled)[:, 1]
        
        return predictions, probabilities
    
    def predict_single(self, features_dict):
        """Predict for a single loan application"""
        # Convert dict to DataFrame
        df = pd.DataFrame([features_dict])
        
        # Ensure all features are present
        for feature in self.feature_names:
            if feature not in df.columns:
                df[feature] = 0
        
        # Reorder columns to match training
        df = df[self.feature_names]
        
        prediction, probability = self.predict(df)
        
        return {
            'default_prediction': int(prediction[0]),
            'default_probability': float(probability[0]),
            'risk_score': int(probability[0] * 1000),  # 0-1000 scale
            'risk_category': self._get_risk_category(probability[0])
        }
    
    def _get_risk_category(self, probability):
        """Convert probability to risk category"""
        if probability <= 0.2:
            return 'Low'
        elif probability <= 0.5:
            return 'Medium'
        elif probability <= 0.7:
            return 'High'
        else:
            return 'Very High'
    
    def save_model(self):
        """Save trained model and scaler"""
        if self.model is None:
            raise ValueError("No model to save. Train the model first.")
        
        joblib.dump(self.model, self.model_path)
        joblib.dump(self.scaler, self.scaler_path)
        
        # Save metadata
        metadata = {
            'feature_names': self.feature_names,
            'training_date': datetime.now().isoformat(),
            'model_type': 'LogisticRegression',
            'metrics': self.training_metrics
        }
        
        metadata_path = self.model_path.replace('.pkl', '_metadata.json')
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"✅ Model saved to {self.model_path}")
        print(f"✅ Scaler saved to {self.scaler_path}")
        print(f"✅ Metadata saved to {metadata_path}")
    
    def load_model(self):
        """Load trained model and scaler"""
        try:
            self.model = joblib.load(self.model_path)
            self.scaler = joblib.load(self.scaler_path)
            
            # Load metadata
            metadata_path = self.model_path.replace('.pkl', '_metadata.json')
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
                self.feature_names = metadata['feature_names']
                self.training_metrics = metadata.get('metrics', {})
            
            print(f"✅ Model loaded from {self.model_path}")
            return True
        except FileNotFoundError:
            print(f"⚠️ Model files not found. Train a new model first.")
            return False
    
    def plot_roc_curve(self, y_test, y_pred_proba, save_path='ml_service/models/roc_curve.png'):
        """Plot ROC curve"""
        fpr, tpr, thresholds = roc_curve(y_test, y_pred_proba)
        roc_auc = roc_auc_score(y_test, y_pred_proba)
        
        plt.figure(figsize=(10, 6))
        plt.plot(fpr, tpr, color='darkorange', lw=2, label=f'ROC curve (AUC = {roc_auc:.3f})')
        plt.plot([0, 1], [0, 1], color='navy', lw=2, linestyle='--', label='Random Classifier')
        plt.xlim([0.0, 1.0])
        plt.ylim([0.0, 1.05])
        plt.xlabel('False Positive Rate')
        plt.ylabel('True Positive Rate')
        plt.title('Receiver Operating Characteristic (ROC) Curve')
        plt.legend(loc="lower right")
        plt.grid(True, alpha=0.3)
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        plt.close()
        
        print(f"✅ ROC curve saved to {save_path}")
        return save_path
    
    def plot_confusion_matrix(self, y_test, y_pred, save_path='ml_service/models/confusion_matrix.png'):
        """Plot confusion matrix"""
        cm = confusion_matrix(y_test, y_pred)
        
        plt.figure(figsize=(8, 6))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
                   xticklabels=['Repaid', 'Default'],
                   yticklabels=['Repaid', 'Default'])
        plt.title('Confusion Matrix')
        plt.ylabel('Actual')
        plt.xlabel('Predicted')
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        plt.close()
        
        print(f"✅ Confusion matrix saved to {save_path}")
        return save_path
    
    def plot_feature_importance(self, top_n=15, save_path='ml_service/models/feature_importance.png'):
        """Plot feature importance"""
        importance = self.get_feature_importance()[:top_n]
        
        features = [item['feature'] for item in importance]
        coefficients = [item['coefficient'] for item in importance]
        
        plt.figure(figsize=(10, 8))
        colors = ['red' if c < 0 else 'green' for c in coefficients]
        plt.barh(features, coefficients, color=colors, alpha=0.7)
        plt.xlabel('Coefficient Value')
        plt.title(f'Top {top_n} Feature Importance (Logistic Regression Coefficients)')
        plt.axvline(x=0, color='black', linestyle='-', linewidth=0.5)
        plt.grid(True, alpha=0.3, axis='x')
        plt.tight_layout()
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        plt.close()
        
        print(f"✅ Feature importance plot saved to {save_path}")
        return save_path


def train_and_evaluate_model(data_path='ml_service/data/training_data.csv'):
    """Complete training and evaluation pipeline"""
    print("🚀 Starting model training pipeline...")
    
    # Load data
    print(f"📂 Loading data from {data_path}")
    df = pd.read_csv(data_path)
    print(f"✅ Loaded {len(df)} samples")
    
    # Initialize model
    model = LoanRiskLogisticModel()
    
    # Prepare features
    X, y = model.prepare_features(df)
    print(f"📊 Features: {X.shape[1]}, Samples: {X.shape[0]}")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"✅ Train: {len(X_train)}, Test: {len(X_test)}")
    
    # Train model
    model.train(X_train, y_train)
    
    # Evaluate on test set
    print("\n📈 Evaluating on test set...")
    metrics, y_pred, y_pred_proba = model.evaluate(X_test, y_test)
    
    # Store metrics
    model.training_metrics = metrics
    
    # Print metrics
    print("\n" + "="*60)
    print("📊 MODEL EVALUATION METRICS")
    print("="*60)
    print(f"Accuracy:   {metrics['accuracy']:.4f}")
    print(f"Precision:  {metrics['precision']:.4f}")
    print(f"Recall:     {metrics['recall']:.4f}")
    print(f"F1 Score:   {metrics['f1_score']:.4f}")
    print(f"ROC-AUC:    {metrics['roc_auc']:.4f}")
    print(f"Log Loss:   {metrics['log_loss']:.4f}")
    print(f"Specificity: {metrics['specificity']:.4f}")
    print("\nConfusion Matrix:")
    print(f"  TN: {metrics['true_negatives']:4d}  FP: {metrics['false_positives']:4d}")
    print(f"  FN: {metrics['false_negatives']:4d}  TP: {metrics['true_positives']:4d}")
    print("="*60)
    
    # Cross-validation
    print("\n🔄 Performing 5-fold cross-validation...")
    cv_results = model.cross_validate(X, y, cv=5)
    print("\nCross-Validation Results:")
    for metric, results in cv_results.items():
        print(f"  {metric.upper()}: {results['mean']:.4f} (+/- {results['std']:.4f})")
    
    # Feature importance
    print("\n⭐ Top 10 Most Important Features:")
    importance = model.get_feature_importance()[:10]
    for i, item in enumerate(importance, 1):
        print(f"  {i}. {item['feature']:30s} {item['coefficient']:+.4f}")
    
    # Generate plots
    print("\n📊 Generating visualization plots...")
    model.plot_roc_curve(y_test, y_pred_proba)
    model.plot_confusion_matrix(y_test, y_pred)
    model.plot_feature_importance()
    
    # Save model
    print("\n💾 Saving model...")
    model.save_model()
    
    # Save detailed metrics report
    report = {
        'training_date': datetime.now().isoformat(),
        'dataset_info': {
            'total_samples': len(df),
            'training_samples': len(X_train),
            'test_samples': len(X_test),
            'default_rate': float(y.mean())
        },
        'test_metrics': metrics,
        'cross_validation': cv_results,
        'feature_importance': importance[:20]
    }
    
    report_path = 'ml_service/models/training_report.json'
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    print(f"✅ Training report saved to {report_path}")
    
    print("\n✨ Training pipeline completed successfully!")
    return model, metrics


if __name__ == "__main__":
    # Train and evaluate the model
    model, metrics = train_and_evaluate_model()
