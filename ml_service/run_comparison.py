#!/usr/bin/env python3
"""
Run Model Comparison Script
Compares Logistic Regression vs Heuristic Risk Assessment
Generates report, visualizations, and presentation materials
"""

import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent))

from model_comparison import run_full_comparison
from data_generator import generate_synthetic_loan_data
from logistic_model import LoanRiskLogisticModel
import pandas as pd


def main():
    print("\n" + "="*80)
    print("🚀 LOANVERSE MODEL COMPARISON ANALYSIS")
    print("="*80 + "\n")
    
    # Step 1: Check if training data exists
    data_path = 'ml_service/data/training_data.csv'
    model_path = 'ml_service/models/logistic_model.pkl'
    
    if not os.path.exists(data_path):
        print("📊 Training data not found. Generating synthetic data...")
        try:
            from data_generator import generate_synthetic_loan_data
            df = generate_synthetic_loan_data(num_samples=10000)
            df.to_csv(data_path, index=False)
            print(f"✅ Generated {len(df)} synthetic loan records")
        except Exception as e:
            print(f"❌ Error generating data: {e}")
            return
    else:
        df = pd.read_csv(data_path)
        print(f"✅ Loaded existing training data: {len(df)} records")
    
    # Step 2: Check if model exists, train if not
    if not os.path.exists(model_path):
        print("\n🤖 Trained model not found. Training new model...")
        try:
            from sklearn.model_selection import train_test_split
            
            model = LoanRiskLogisticModel(model_path=model_path)
            X, y = model.prepare_features(df)
            
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )
            
            # Train model
            model.train(X_train, y_train)
            
            # Evaluate
            metrics = model.evaluate(X_test, y_test)
            print("\n📊 Training Metrics:")
            print(f"  Accuracy: {metrics['accuracy']:.4f}")
            print(f"  Precision: {metrics['precision']:.4f}")
            print(f"  Recall: {metrics['recall']:.4f}")
            print(f"  F1-Score: {metrics['f1_score']:.4f}")
            print(f"  ROC-AUC: {metrics['roc_auc']:.4f}")
            
            # Save model
            model.save_model()
            print("✅ Model trained and saved successfully")
            
        except Exception as e:
            print(f"❌ Error training model: {e}")
            import traceback
            traceback.print_exc()
            return
    else:
        print("✅ Trained model found")
    
    # Step 3: Run comparison
    print("\n" + "="*80)
    print("📊 RUNNING MODEL COMPARISON")
    print("="*80 + "\n")
    
    try:
        results = run_full_comparison(
            test_data_path=data_path,
            model_path=model_path
        )
        
        if results:
            print("\n" + "="*80)
            print("✨ COMPARISON COMPLETED SUCCESSFULLY!")
            print("="*80)
            print("\n📁 Generated Files:")
            print("  ├─ ml_service/models/comparison_report.json")
            print("  └─ ml_service/models/model_comparison.png")
            print("\n💡 Use these files for your presentation!")
            print("\n🎯 Recommendation:")
            
            log_improvement = results['improvements']['accuracy']
            if log_improvement > 5:
                print("  ✅ Use Logistic Regression as PRIMARY model")
                print("  ✅ Use Heuristic as FALLBACK")
                print(f"  📈 Expected accuracy improvement: +{log_improvement:.1f}%")
            else:
                print("  ℹ️ Models perform similarly")
                print("  ℹ️ Consider using Heuristic for simplicity")
            
            print("\n" + "="*80 + "\n")
            
    except Exception as e:
        print(f"❌ Error running comparison: {e}")
        import traceback
        traceback.print_exc()
        return


if __name__ == "__main__":
    main()
