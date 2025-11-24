import pandas as pd
import numpy as np
from logistic_model import LoanRiskLogisticModel
from sklearn.model_selection import train_test_split
import json

def analyze_feature_importance():
    print("="*80)
    print("FEATURE IMPORTANCE ANALYSIS - IDENTIFYING BEST FEATURES")
    print("="*80)
    
    with open('models/training_report.json', 'r') as f:
        report = json.load(f)
    
    feature_importance = report['feature_importance']
    
    print("\nTOP 10 MOST IMPORTANT FEATURES:")
    print("-"*80)
    print(f"{'Rank':<6} {'Feature':<30} {'Coefficient':<15} {'Impact'}")
    print("-"*80)
    
    for i, feat in enumerate(feature_importance[:10], 1):
        impact = "↑ Increases Risk" if feat['coefficient'] > 0 else "↓ Decreases Risk"
        print(f"{i:<6} {feat['feature']:<30} {feat['coefficient']:>+14.4f} {impact}")
    
    print("\n" + "="*80)
    print("INTERPRETATION:")
    print("="*80)
    
    print("\n🔴 HIGH RISK INDICATORS (Positive coefficients - increase default probability):")
    high_risk = [f for f in feature_importance if f['coefficient'] > 0]
    for feat in high_risk[:5]:
        print(f"  • {feat['feature']}: {feat['coefficient']:+.4f}")
    
    print("\n🟢 LOW RISK INDICATORS (Negative coefficients - decrease default probability):")
    low_risk = [f for f in feature_importance if f['coefficient'] < 0]
    for feat in low_risk[:5]:
        print(f"  • {feat['feature']}: {feat['coefficient']:+.4f}")
    
    return feature_importance


def compare_feature_sets():
    print("\n" + "="*80)
    print("MODEL COMPARISON: DIFFERENT FEATURE SETS")
    print("="*80)
    
    df = pd.read_csv('data/training_data.csv')
    
    with open('models/training_report.json', 'r') as f:
        report = json.load(f)
    
    feature_importance = report['feature_importance']
    all_features = [f['feature'] for f in feature_importance]
    
    results = {}
    
    feature_sets = {
        'All 22 Features': all_features,
        'Top 5 Features': [f['feature'] for f in feature_importance[:5]],
        'Top 10 Features': [f['feature'] for f in feature_importance[:10]],
        'Top 15 Features': [f['feature'] for f in feature_importance[:15]],
        'Lending History Only': ['repaid_loans', 'defaulted_loans', 'total_loans', 'avg_repayment_time'],
        'Financial Stability Only': ['stablecoin_ratio', 'volatility_index', 'diversity_score', 'avg_holding_period'],
        'Loan Terms Only': ['loan_amount', 'collateral_amount', 'loan_to_collateral_ratio', 'duration_days', 'interest_rate'],
    }
    
    print("\nTesting different feature combinations...\n")
    
    for set_name, features in feature_sets.items():
        existing_features = [f for f in features if f in df.columns]
        
        if len(existing_features) == 0:
            continue
            
        X = df[existing_features]
        y = df['default']
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        model = LoanRiskLogisticModel()
        model.feature_names = existing_features
        model.train(X_train, y_train)
        metrics, _, _ = model.evaluate(X_test, y_test)
        
        results[set_name] = {
            'num_features': len(existing_features),
            'accuracy': metrics['accuracy'],
            'precision': metrics['precision'],
            'recall': metrics['recall'],
            'f1_score': metrics['f1_score'],
            'roc_auc': metrics['roc_auc']
        }
        
        print(f"✓ {set_name} ({len(existing_features)} features) tested")
    
    print("\n" + "="*80)
    print("PERFORMANCE COMPARISON")
    print("="*80)
    print(f"{'Feature Set':<25} {'Features':<10} {'Accuracy':<10} {'Precision':<10} {'Recall':<10} {'F1-Score':<10} {'ROC-AUC'}")
    print("-"*80)
    
    for set_name, metrics in sorted(results.items(), key=lambda x: x[1]['roc_auc'], reverse=True):
        print(f"{set_name:<25} {metrics['num_features']:<10} "
              f"{metrics['accuracy']:<10.4f} {metrics['precision']:<10.4f} "
              f"{metrics['recall']:<10.4f} {metrics['f1_score']:<10.4f} "
              f"{metrics['roc_auc']:<10.4f}")
    
    best_set = max(results.items(), key=lambda x: x[1]['roc_auc'])
    
    print("\n" + "="*80)
    print("RECOMMENDATION")
    print("="*80)
    print(f"\n🏆 BEST PERFORMING: {best_set[0]}")
    print(f"   Features: {best_set[1]['num_features']}")
    print(f"   ROC-AUC: {best_set[1]['roc_auc']:.4f}")
    print(f"   Accuracy: {best_set[1]['accuracy']:.4f}")
    
    print("\n📊 KEY INSIGHTS:")
    
    top5_score = results['Top 5 Features']['roc_auc']
    top10_score = results['Top 10 Features']['roc_auc']
    all_score = results['All 22 Features']['roc_auc']
    
    improvement_5_to_10 = ((top10_score - top5_score) / top5_score) * 100
    improvement_10_to_all = ((all_score - top10_score) / top10_score) * 100
    
    print(f"   • Top 5 features capture {(top5_score/all_score)*100:.1f}% of total model performance")
    print(f"   • Top 10 features improve by {improvement_5_to_10:.1f}% over Top 5")
    print(f"   • Using all features improves by {improvement_10_to_all:.1f}% over Top 10")
    
    print("\n💡 PRACTICAL RECOMMENDATION:")
    if top10_score / all_score > 0.95:
        print("   Use TOP 10 FEATURES for optimal balance of accuracy and simplicity")
        print("   This captures 95%+ of model performance with fewer features")
    else:
        print("   Use ALL FEATURES for maximum accuracy")
        print("   The additional features provide meaningful performance gains")
    
    return results


def generate_optimal_feature_list():
    print("\n" + "="*80)
    print("RECOMMENDED FEATURE SET FOR PRODUCTION")
    print("="*80)
    
    with open('models/training_report.json', 'r') as f:
        report = json.load(f)
    
    feature_importance = report['feature_importance']
    top_10 = [f['feature'] for f in feature_importance[:10]]
    
    print("\n✅ OPTIMAL 10 FEATURES (Ranked by importance):\n")
    
    categories = {
        'Lending History': ['repaid_loans', 'defaulted_loans', 'total_loans', 'avg_repayment_time'],
        'Loan Terms': ['interest_rate', 'loan_amount', 'collateral_amount', 'loan_to_collateral_ratio', 'duration_days'],
        'Account & Activity': ['account_age_days', 'tx_count', 'total_volume'],
        'Financial Stability': ['stablecoin_ratio', 'volatility_index', 'diversity_score', 'avg_holding_period'],
        'DeFi Behavior': ['protocol_count', 'yield_farming_activity', 'smart_contract_calls', 'defi_experience']
    }
    
    for i, feat_data in enumerate(feature_importance[:10], 1):
        feat = feat_data['feature']
        coef = feat_data['coefficient']
        impact = "Increases Risk ↑" if coef > 0 else "Decreases Risk ↓"
        
        category = next((cat for cat, features in categories.items() if feat in features), 'Other')
        
        print(f"  {i:2d}. {feat:<30} │ {category:<20} │ {impact}")
    
    print("\n" + "="*80)
    
    coverage = {}
    for cat, features in categories.items():
        count = len([f for f in top_10 if f in features])
        coverage[cat] = count
    
    print("CATEGORY COVERAGE IN TOP 10:")
    print("-"*80)
    for cat, count in coverage.items():
        bar = "█" * count
        print(f"  {cat:<25} {bar} ({count})")
    
    return top_10


if __name__ == '__main__':
    feature_importance = analyze_feature_importance()
    
    results = compare_feature_sets()
    
    optimal_features = generate_optimal_feature_list()
    
    print("\n" + "="*80)
    print("ANALYSIS COMPLETE")
    print("="*80)
