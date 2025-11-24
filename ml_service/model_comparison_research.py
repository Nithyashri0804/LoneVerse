"""
Model Comparison for Research Paper
Compares Logistic Regression vs Random Forest for Loan Risk Assessment
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, roc_curve, confusion_matrix, classification_report
)
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
import json
from datetime import datetime

class ModelComparison:
    def __init__(self):
        self.logistic_model = None
        self.random_forest_model = None
        self.scaler = StandardScaler()
        self.feature_names = []
        self.results = {}
        
    def load_and_prepare_data(self, data_path='data/training_data.csv'):
        """Load and prepare data for modeling"""
        print("="*80)
        print("LOADING DATA")
        print("="*80)
        
        df = pd.read_csv(data_path)
        print(f"✓ Loaded {len(df)} samples")
        print(f"✓ Default rate: {df['default'].mean():.2%}")
        
        # Prepare features
        exclude_cols = ['default', 'default_probability']
        feature_cols = [col for col in df.columns if col not in exclude_cols]
        
        X = df[feature_cols]
        y = df['default']
        self.feature_names = feature_cols
        
        print(f"✓ Features: {len(feature_cols)}")
        
        return X, y
    
    def train_logistic_regression(self, X_train, y_train):
        """Train Logistic Regression Model"""
        print("\n" + "="*80)
        print("TRAINING MODEL 1: LOGISTIC REGRESSION")
        print("="*80)
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        
        # Train model
        self.logistic_model = LogisticRegression(
            C=1.0,
            max_iter=1000,
            solver='lbfgs',
            random_state=42,
            class_weight='balanced'
        )
        
        self.logistic_model.fit(X_train_scaled, y_train)
        print("✓ Logistic Regression trained")
        
        return self.logistic_model
    
    def train_random_forest(self, X_train, y_train):
        """Train Random Forest Model"""
        print("\n" + "="*80)
        print("TRAINING MODEL 2: RANDOM FOREST")
        print("="*80)
        
        # Random Forest doesn't need scaling, but we'll use the same data
        self.random_forest_model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=10,
            min_samples_leaf=5,
            random_state=42,
            class_weight='balanced',
            n_jobs=-1
        )
        
        self.random_forest_model.fit(X_train, y_train)
        print("✓ Random Forest trained")
        
        return self.random_forest_model
    
    def evaluate_model(self, model, X_test, y_test, model_name, use_scaling=False):
        """Evaluate a model and return metrics"""
        if use_scaling:
            X_test_processed = self.scaler.transform(X_test)
        else:
            X_test_processed = X_test
        
        # Predictions
        y_pred = model.predict(X_test_processed)
        y_pred_proba = model.predict_proba(X_test_processed)[:, 1]
        
        # Calculate metrics
        metrics = {
            'model': model_name,
            'accuracy': accuracy_score(y_test, y_pred),
            'precision': precision_score(y_test, y_pred, zero_division=0),
            'recall': recall_score(y_test, y_pred, zero_division=0),
            'f1_score': f1_score(y_test, y_pred, zero_division=0),
            'roc_auc': roc_auc_score(y_test, y_pred_proba),
        }
        
        # Confusion matrix
        tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel()
        metrics['true_negatives'] = int(tn)
        metrics['false_positives'] = int(fp)
        metrics['false_negatives'] = int(fn)
        metrics['true_positives'] = int(tp)
        metrics['specificity'] = tn / (tn + fp) if (tn + fp) > 0 else 0
        
        return metrics, y_pred, y_pred_proba
    
    def compare_models(self, X_test, y_test):
        """Compare both models"""
        print("\n" + "="*80)
        print("MODEL EVALUATION & COMPARISON")
        print("="*80)
        
        # Evaluate Logistic Regression
        lr_metrics, lr_pred, lr_proba = self.evaluate_model(
            self.logistic_model, X_test, y_test, 
            "Logistic Regression", use_scaling=True
        )
        
        # Evaluate Random Forest
        rf_metrics, rf_pred, rf_proba = self.evaluate_model(
            self.random_forest_model, X_test, y_test,
            "Random Forest", use_scaling=False
        )
        
        self.results = {
            'logistic_regression': lr_metrics,
            'random_forest': rf_metrics,
            'predictions': {
                'lr_pred': lr_pred,
                'lr_proba': lr_proba,
                'rf_pred': rf_pred,
                'rf_proba': rf_proba,
                'y_test': y_test
            }
        }
        
        # Print comparison table
        print("\n" + "-"*80)
        print(f"{'Metric':<25} {'Logistic Regression':<25} {'Random Forest':<25} {'Winner'}")
        print("-"*80)
        
        metrics_to_compare = ['accuracy', 'precision', 'recall', 'f1_score', 'roc_auc', 'specificity']
        
        for metric in metrics_to_compare:
            lr_val = lr_metrics[metric]
            rf_val = rf_metrics[metric]
            winner = "Random Forest ✓" if rf_val > lr_val else "Logistic Reg ✓" if lr_val > rf_val else "Tie"
            print(f"{metric.upper():<25} {lr_val:<25.4f} {rf_val:<25.4f} {winner}")
        
        print("-"*80)
        
        # Determine overall winner
        lr_wins = sum([lr_metrics[m] > rf_metrics[m] for m in metrics_to_compare])
        rf_wins = sum([rf_metrics[m] > lr_metrics[m] for m in metrics_to_compare])
        
        print(f"\n🏆 OVERALL WINNER: ", end="")
        if rf_wins > lr_wins:
            print(f"Random Forest ({rf_wins}/{len(metrics_to_compare)} metrics)")
        elif lr_wins > rf_wins:
            print(f"Logistic Regression ({lr_wins}/{len(metrics_to_compare)} metrics)")
        else:
            print("Tie")
        
        return self.results
    
    def plot_comparison(self, save_dir='ml_service/results'):
        """Generate comparison visualizations"""
        print("\n" + "="*80)
        print("GENERATING VISUALIZATIONS")
        print("="*80)
        
        import os
        os.makedirs(save_dir, exist_ok=True)
        
        # 1. Metrics Comparison Bar Chart
        self._plot_metrics_comparison(save_dir)
        
        # 2. ROC Curves Comparison
        self._plot_roc_comparison(save_dir)
        
        # 3. Confusion Matrices
        self._plot_confusion_matrices(save_dir)
        
        # 4. Feature Importance Comparison
        self._plot_feature_importance(save_dir)
        
        print(f"\n✓ All visualizations saved to {save_dir}/")
    
    def _plot_metrics_comparison(self, save_dir):
        """Plot metrics comparison bar chart"""
        metrics = ['accuracy', 'precision', 'recall', 'f1_score', 'roc_auc', 'specificity']
        lr_values = [self.results['logistic_regression'][m] for m in metrics]
        rf_values = [self.results['random_forest'][m] for m in metrics]
        
        x = np.arange(len(metrics))
        width = 0.35
        
        fig, ax = plt.subplots(figsize=(12, 6))
        ax.bar(x - width/2, lr_values, width, label='Logistic Regression', color='#3498db')
        ax.bar(x + width/2, rf_values, width, label='Random Forest', color='#2ecc71')
        
        ax.set_xlabel('Metrics', fontsize=12, fontweight='bold')
        ax.set_ylabel('Score', fontsize=12, fontweight='bold')
        ax.set_title('Model Performance Comparison', fontsize=14, fontweight='bold')
        ax.set_xticks(x)
        ax.set_xticklabels([m.upper() for m in metrics], rotation=45, ha='right')
        ax.legend()
        ax.grid(axis='y', alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(f'{save_dir}/metrics_comparison.png', dpi=300, bbox_inches='tight')
        plt.close()
        print("✓ Metrics comparison chart saved")
    
    def _plot_roc_comparison(self, save_dir):
        """Plot ROC curves for both models"""
        preds = self.results['predictions']
        y_test = preds['y_test']
        
        # Calculate ROC curves
        lr_fpr, lr_tpr, _ = roc_curve(y_test, preds['lr_proba'])
        rf_fpr, rf_tpr, _ = roc_curve(y_test, preds['rf_proba'])
        
        lr_auc = self.results['logistic_regression']['roc_auc']
        rf_auc = self.results['random_forest']['roc_auc']
        
        plt.figure(figsize=(10, 8))
        plt.plot(lr_fpr, lr_tpr, label=f'Logistic Regression (AUC = {lr_auc:.4f})', 
                linewidth=2, color='#3498db')
        plt.plot(rf_fpr, rf_tpr, label=f'Random Forest (AUC = {rf_auc:.4f})', 
                linewidth=2, color='#2ecc71')
        plt.plot([0, 1], [0, 1], 'k--', label='Random Classifier', linewidth=1)
        
        plt.xlabel('False Positive Rate', fontsize=12, fontweight='bold')
        plt.ylabel('True Positive Rate', fontsize=12, fontweight='bold')
        plt.title('ROC Curve Comparison', fontsize=14, fontweight='bold')
        plt.legend(loc='lower right', fontsize=11)
        plt.grid(alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(f'{save_dir}/roc_comparison.png', dpi=300, bbox_inches='tight')
        plt.close()
        print("✓ ROC curve comparison saved")
    
    def _plot_confusion_matrices(self, save_dir):
        """Plot confusion matrices side by side"""
        preds = self.results['predictions']
        y_test = preds['y_test']
        
        lr_cm = confusion_matrix(y_test, preds['lr_pred'])
        rf_cm = confusion_matrix(y_test, preds['rf_pred'])
        
        fig, axes = plt.subplots(1, 2, figsize=(14, 5))
        
        # Logistic Regression
        sns.heatmap(lr_cm, annot=True, fmt='d', cmap='Blues', ax=axes[0], 
                   cbar_kws={'label': 'Count'})
        axes[0].set_title('Logistic Regression\nConfusion Matrix', fontsize=12, fontweight='bold')
        axes[0].set_ylabel('Actual', fontsize=11)
        axes[0].set_xlabel('Predicted', fontsize=11)
        
        # Random Forest
        sns.heatmap(rf_cm, annot=True, fmt='d', cmap='Greens', ax=axes[1],
                   cbar_kws={'label': 'Count'})
        axes[1].set_title('Random Forest\nConfusion Matrix', fontsize=12, fontweight='bold')
        axes[1].set_ylabel('Actual', fontsize=11)
        axes[1].set_xlabel('Predicted', fontsize=11)
        
        plt.tight_layout()
        plt.savefig(f'{save_dir}/confusion_matrices.png', dpi=300, bbox_inches='tight')
        plt.close()
        print("✓ Confusion matrices saved")
    
    def _plot_feature_importance(self, save_dir):
        """Plot feature importance for both models"""
        # Logistic Regression coefficients
        lr_importance = pd.DataFrame({
            'feature': self.feature_names,
            'importance': np.abs(self.logistic_model.coef_[0])
        }).sort_values('importance', ascending=False).head(10)
        
        # Random Forest feature importance
        rf_importance = pd.DataFrame({
            'feature': self.feature_names,
            'importance': self.random_forest_model.feature_importances_
        }).sort_values('importance', ascending=False).head(10)
        
        fig, axes = plt.subplots(1, 2, figsize=(16, 6))
        
        # Logistic Regression
        axes[0].barh(lr_importance['feature'], lr_importance['importance'], color='#3498db')
        axes[0].set_xlabel('Absolute Coefficient', fontsize=11, fontweight='bold')
        axes[0].set_title('Logistic Regression\nTop 10 Features', fontsize=12, fontweight='bold')
        axes[0].invert_yaxis()
        
        # Random Forest
        axes[1].barh(rf_importance['feature'], rf_importance['importance'], color='#2ecc71')
        axes[1].set_xlabel('Feature Importance', fontsize=11, fontweight='bold')
        axes[1].set_title('Random Forest\nTop 10 Features', fontsize=12, fontweight='bold')
        axes[1].invert_yaxis()
        
        plt.tight_layout()
        plt.savefig(f'{save_dir}/feature_importance_comparison.png', dpi=300, bbox_inches='tight')
        plt.close()
        print("✓ Feature importance comparison saved")
    
    def save_results(self, save_dir='ml_service/results'):
        """Save comparison results to JSON"""
        import os
        os.makedirs(save_dir, exist_ok=True)
        
        # Prepare results for JSON (remove numpy arrays)
        results_json = {
            'timestamp': datetime.now().isoformat(),
            'logistic_regression': self.results['logistic_regression'],
            'random_forest': self.results['random_forest'],
        }
        
        with open(f'{save_dir}/comparison_results.json', 'w') as f:
            json.dump(results_json, f, indent=2)
        
        print(f"✓ Results saved to {save_dir}/comparison_results.json")


def run_comparison():
    """Main function to run the comparison"""
    print("\n" + "="*80)
    print("LOAN RISK ASSESSMENT - MODEL COMPARISON FOR RESEARCH")
    print("="*80)
    print("Comparing: Logistic Regression vs Random Forest")
    print("="*80)
    
    # Initialize comparison
    comparison = ModelComparison()
    
    # Load data
    X, y = comparison.load_and_prepare_data()
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"\n✓ Train set: {len(X_train)} samples")
    print(f"✓ Test set: {len(X_test)} samples")
    
    # Train both models
    comparison.train_logistic_regression(X_train, y_train)
    comparison.train_random_forest(X_train, y_train)
    
    # Compare models
    results = comparison.compare_models(X_test, y_test)
    
    # Generate visualizations
    comparison.plot_comparison()
    
    # Save results
    comparison.save_results()
    
    print("\n" + "="*80)
    print("✅ COMPARISON COMPLETE")
    print("="*80)
    print("\nGenerated files:")
    print("  📊 ml_service/results/metrics_comparison.png")
    print("  📊 ml_service/results/roc_comparison.png")
    print("  📊 ml_service/results/confusion_matrices.png")
    print("  📊 ml_service/results/feature_importance_comparison.png")
    print("  📄 ml_service/results/comparison_results.json")
    print("\nUse these visualizations in your research paper!")
    print("="*80)


if __name__ == '__main__':
    run_comparison()
