"""
Model Comparison Framework
Compare Logistic Regression vs Heuristic-based Risk Assessment
"""

import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, log_loss, confusion_matrix
)
import json
from datetime import datetime
import matplotlib.pyplot as plt


class ModelComparison:
    def __init__(self):
        self.results = {}
    
    def heuristic_risk_assessment(self, X, feature_names):
        """
        Replicate the heuristic method from mlService.js
        Returns risk probabilities (0-1 scale)
        """
        predictions = []
        
        for idx, row in X.iterrows():
            features = dict(zip(feature_names, row.values))
            
            # Extract key features
            repaid_loans = features.get('repaid_loans', 0)
            total_loans = features.get('total_loans', 0)
            defaulted_loans = features.get('defaulted_loans', 0)
            
            repayment_rate = repaid_loans / total_loans if total_loans > 0 else 0
            default_rate = defaulted_loans / total_loans if total_loans > 0 else 0
            
            # Simplified credit score calculation (normalized 0-1)
            credit_score = 0.5 + (repayment_rate * 0.3) - (default_rate * 0.3)
            credit_score = max(0, min(1, credit_score))
            
            account_age = features.get('account_age_days', 0)
            loan_to_collateral = features.get('loan_to_collateral_ratio', 0.5)
            
            # Calculate heuristic risk score
            risk_score = 0.5  # Start with medium risk
            
            # Repayment history impact
            if repayment_rate > 0.95:
                risk_score -= 0.20
            elif repayment_rate > 0.85:
                risk_score -= 0.10
            elif repayment_rate < 0.7 and total_loans > 0:
                risk_score += 0.15
            
            # Default rate impact
            if default_rate > 0.2:
                risk_score += 0.25
            elif default_rate > 0.1:
                risk_score += 0.15
            elif default_rate > 0.05:
                risk_score += 0.08
            
            # Credit score impact
            credit_score_impact = (0.5 - credit_score) ** 2 * 0.8
            risk_score += credit_score_impact
            
            # Account age impact
            if account_age < 30:
                risk_score += 0.15
            elif account_age < 90:
                risk_score += 0.10
            elif account_age > 730:  # 2 years
                risk_score -= 0.10
            elif account_age > 365:  # 1 year
                risk_score -= 0.05
            
            # Collateral ratio impact
            if loan_to_collateral > 0.9:
                risk_score += 0.20
            elif loan_to_collateral > 0.8:
                risk_score += 0.15
            elif loan_to_collateral > 0.7:
                risk_score += 0.08
            elif loan_to_collateral < 0.4:
                risk_score -= 0.10
            elif loan_to_collateral < 0.5:
                risk_score -= 0.05
            
            # Duration impact
            duration = features.get('duration_days', 0) / 365  # Normalize to years
            if duration > 1.0:
                risk_score += 0.12
            elif duration > 0.5:
                risk_score += 0.06
            
            # Ensure score is between 0 and 1
            risk_score = max(0, min(1, risk_score))
            predictions.append(risk_score)
        
        return np.array(predictions)
    
    def compare_models(self, y_true, logistic_proba, heuristic_proba, threshold=0.5):
        """
        Compare logistic regression and heuristic models
        """
        # Convert probabilities to binary predictions
        logistic_pred = (logistic_proba >= threshold).astype(int)
        heuristic_pred = (heuristic_proba >= threshold).astype(int)
        
        # Calculate metrics for both models
        logistic_metrics = self._calculate_metrics(y_true, logistic_pred, logistic_proba, "Logistic Regression")
        heuristic_metrics = self._calculate_metrics(y_true, heuristic_pred, heuristic_proba, "Heuristic")
        
        # Calculate improvement
        improvements = {}
        for metric in ['accuracy', 'precision', 'recall', 'f1_score', 'roc_auc']:
            logistic_val = logistic_metrics[metric]
            heuristic_val = heuristic_metrics[metric]
            if heuristic_val > 0:
                improvement = ((logistic_val - heuristic_val) / heuristic_val) * 100
            else:
                improvement = 0
            improvements[metric] = improvement
        
        # For log_loss, lower is better, so reverse the improvement calculation
        logistic_loss = logistic_metrics['log_loss']
        heuristic_loss = heuristic_metrics['log_loss']
        if heuristic_loss > 0:
            improvements['log_loss'] = ((heuristic_loss - logistic_loss) / heuristic_loss) * 100
        else:
            improvements['log_loss'] = 0
        
        self.results = {
            'logistic_regression': logistic_metrics,
            'heuristic': heuristic_metrics,
            'improvements': improvements,
            'comparison_date': datetime.now().isoformat()
        }
        
        return self.results
    
    def _calculate_metrics(self, y_true, y_pred, y_proba, model_name):
        """Calculate all metrics for a model"""
        metrics = {
            'model_name': model_name,
            'accuracy': float(accuracy_score(y_true, y_pred)),
            'precision': float(precision_score(y_true, y_pred, zero_division=0)),
            'recall': float(recall_score(y_true, y_pred, zero_division=0)),
            'f1_score': float(f1_score(y_true, y_pred, zero_division=0)),
            'roc_auc': float(roc_auc_score(y_true, y_proba)),
            'log_loss': float(log_loss(y_true, y_proba))
        }
        
        # Confusion matrix
        tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
        metrics['confusion_matrix'] = {
            'true_negatives': int(tn),
            'false_positives': int(fp),
            'false_negatives': int(fn),
            'true_positives': int(tp)
        }
        metrics['specificity'] = float(tn / (tn + fp)) if (tn + fp) > 0 else 0
        
        return metrics
    
    def save_comparison_report(self, filepath='ml_service/models/comparison_report.json'):
        """Save comparison report to file"""
        with open(filepath, 'w') as f:
            json.dump(self.results, f, indent=2)
        print(f"✅ Comparison report saved to {filepath}")
        return filepath
    
    def print_comparison_table(self):
        """Print a formatted comparison table"""
        if not self.results:
            print("⚠️ No comparison results available. Run compare_models() first.")
            return
        
        logistic = self.results['logistic_regression']
        heuristic = self.results['heuristic']
        improvements = self.results['improvements']
        
        print("\n" + "="*80)
        print("📊 MODEL COMPARISON: LOGISTIC REGRESSION VS HEURISTIC")
        print("="*80)
        print(f"{'Metric':<20} {'Logistic':<15} {'Heuristic':<15} {'Improvement':<15}")
        print("-"*80)
        
        metrics = ['accuracy', 'precision', 'recall', 'f1_score', 'roc_auc', 'log_loss']
        for metric in metrics:
            log_val = logistic[metric]
            heur_val = heuristic[metric]
            imp_val = improvements[metric]
            
            # For log_loss, lower is better
            imp_symbol = '↓' if metric == 'log_loss' else '↑'
            imp_color = '✅' if imp_val > 0 else '⚠️'
            
            print(f"{metric:<20} {log_val:<15.4f} {heur_val:<15.4f} {imp_color} {imp_val:+.2f}% {imp_symbol}")
        
        print("-"*80)
        print("\nConfusion Matrix Comparison:")
        print(f"{'Model':<20} {'TN':<8} {'FP':<8} {'FN':<8} {'TP':<8} {'Specificity':<12}")
        print("-"*80)
        
        for model_name, metrics in [('Logistic Regression', logistic), ('Heuristic', heuristic)]:
            cm = metrics['confusion_matrix']
            spec = metrics['specificity']
            print(f"{model_name:<20} {cm['true_negatives']:<8} {cm['false_positives']:<8} "
                  f"{cm['false_negatives']:<8} {cm['true_positives']:<8} {spec:<12.4f}")
        
        print("="*80)
    
    def plot_comparison(self, save_path='ml_service/models/model_comparison.png'):
        """Plot comparison between models"""
        if not self.results:
            print("⚠️ No comparison results available.")
            return
        
        logistic = self.results['logistic_regression']
        heuristic = self.results['heuristic']
        
        # Prepare data for plotting
        metrics = ['accuracy', 'precision', 'recall', 'f1_score', 'roc_auc']
        logistic_values = [logistic[m] for m in metrics]
        heuristic_values = [heuristic[m] for m in metrics]
        
        # Create comparison plot
        x = np.arange(len(metrics))
        width = 0.35
        
        fig, ax = plt.subplots(figsize=(12, 6))
        bars1 = ax.bar(x - width/2, logistic_values, width, label='Logistic Regression', alpha=0.8)
        bars2 = ax.bar(x + width/2, heuristic_values, width, label='Heuristic', alpha=0.8)
        
        ax.set_xlabel('Metrics')
        ax.set_ylabel('Score')
        ax.set_title('Model Comparison: Logistic Regression vs Heuristic')
        ax.set_xticks(x)
        ax.set_xticklabels([m.replace('_', ' ').title() for m in metrics])
        ax.legend()
        ax.grid(True, alpha=0.3, axis='y')
        ax.set_ylim([0, 1.0])
        
        # Add value labels on bars
        for bars in [bars1, bars2]:
            for bar in bars:
                height = bar.get_height()
                ax.text(bar.get_x() + bar.get_width()/2., height,
                       f'{height:.3f}',
                       ha='center', va='bottom', fontsize=8)
        
        plt.tight_layout()
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        plt.close()
        
        print(f"✅ Comparison plot saved to {save_path}")
        return save_path


def run_full_comparison(test_data_path='ml_service/data/training_data.csv',
                       model_path='ml_service/models/logistic_model.pkl'):
    """Run complete comparison between models"""
    from logistic_model import LoanRiskLogisticModel
    
    print("🚀 Running model comparison...")
    
    # Load test data
    print(f"📂 Loading test data from {test_data_path}")
    df = pd.read_csv(test_data_path)
    
    # Use 20% as test set
    from sklearn.model_selection import train_test_split
    _, test_df = train_test_split(df, test_size=0.2, random_state=42, stratify=df['default'])
    
    # Load trained logistic model
    print("📥 Loading logistic regression model...")
    logistic_model = LoanRiskLogisticModel(model_path=model_path)
    if not logistic_model.load_model():
        print("❌ Failed to load model. Please train the model first.")
        return
    
    # Prepare features
    X, y = logistic_model.prepare_features(test_df)
    
    # Get logistic model predictions
    print("🔮 Getting logistic regression predictions...")
    _, logistic_proba = logistic_model.predict(X)
    
    # Get heuristic predictions
    print("🔮 Getting heuristic predictions...")
    comparison = ModelComparison()
    heuristic_proba = comparison.heuristic_risk_assessment(X, logistic_model.feature_names)
    
    # Compare models
    print("📊 Comparing models...")
    results = comparison.compare_models(y.values, logistic_proba, heuristic_proba)
    
    # Print results
    comparison.print_comparison_table()
    
    # Save report
    comparison.save_comparison_report()
    
    # Plot comparison
    comparison.plot_comparison()
    
    print("\n✨ Comparison completed successfully!")
    return results


if __name__ == "__main__":
    # Run full comparison
    run_full_comparison()
