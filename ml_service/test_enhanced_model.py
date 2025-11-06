"""
Test script to compare standard vs enhanced model
"""
import pandas as pd
from .enhanced_model import train_enhanced_model
from .logistic_model import train_and_evaluate_model

def compare_models():
    """Run comparison between standard and enhanced models"""
    
    data_path = 'ml_service/data/training_data.csv'
    
    print("="*80)
    print("🔬 MODEL COMPARISON: Standard vs Enhanced")
    print("="*80)
    
    # Train standard model
    print("\n1️⃣  Training STANDARD model...")
    print("-" * 80)
    standard_model, standard_metrics = train_and_evaluate_model(data_path)
    
    # Train enhanced model with tuning
    print("\n\n2️⃣  Training ENHANCED model with hyperparameter tuning...")
    print("-" * 80)
    enhanced_model, enhanced_metrics = train_enhanced_model(data_path, perform_tuning=True)
    
    # Compare results
    print("\n\n📊 COMPARISON RESULTS")
    print("="*80)
    
    metrics_to_compare = ['accuracy', 'precision', 'recall', 'f1_score', 'roc_auc', 'specificity']
    
    print(f"{'Metric':<15} {'Standard':<12} {'Enhanced':<12} {'Improvement':<15}")
    print("-" * 80)
    
    for metric in metrics_to_compare:
        standard_val = standard_metrics.get(metric, 0)
        enhanced_val = enhanced_metrics.get(metric, 0)
        improvement = ((enhanced_val - standard_val) / standard_val) * 100 if standard_val > 0 else 0
        
        print(f"{metric:<15} {standard_val:<12.4f} {enhanced_val:<12.4f} {improvement:>+7.2f}%")
    
    # Feature selection info
    print("\n\n🎯 FEATURE SELECTION")
    print("="*80)
    selection_report = enhanced_model.get_feature_selection_report()
    print(f"Selected features: {selection_report['selected_count']}")
    print(f"Dropped features: {selection_report['dropped_count']}")
    print(f"Penalty type: {selection_report['penalty']}")
    
    print("\n✅ Comparison complete!")
    print("="*80)
    
    return {
        'standard': standard_metrics,
        'enhanced': enhanced_metrics,
        'selection': selection_report
    }


if __name__ == "__main__":
    results = compare_models()
