"""
Synthetic Data Generator for Loan Risk Assessment
Generates realistic training data based on the current credit scoring features
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import json

class LoanDataGenerator:
    def __init__(self, seed=42):
        np.random.seed(seed)
        
    def generate_training_data(self, n_samples=10000):
        """
        Generate synthetic loan data with realistic distributions
        Features based on the current credit scoring system:
        - Transaction Analysis (30%): txCount, totalVolume, avgFrequency, avgTimeBetween
        - Portfolio Stability (25%): stablecoinRatio, avgHoldingPeriod, volatilityIndex, diversityScore
        - Lending History (25%): totalLoans, repaidLoans, defaultedLoans, avgRepaymentTime
        - DeFi Behavior (20%): protocolCount, yieldFarmingActivity, smartContractCalls, defiExperience
        """
        
        data = []
        
        for _ in range(n_samples):
            # Generate base risk profile (will influence all features)
            base_risk = np.random.beta(2, 5)  # Skewed toward lower risk
            
            # Transaction Analysis Features (30%)
            tx_count = int(np.random.lognormal(5, 2) * (1 - base_risk * 0.3))
            total_volume = np.random.lognormal(12, 2) * (1 - base_risk * 0.2)
            avg_frequency = np.random.gamma(2, 2) * (1 - base_risk * 0.3)
            avg_time_between = np.random.exponential(48) * (1 + base_risk * 0.5)
            
            # Portfolio Stability Features (25%)
            stablecoin_ratio = np.clip(np.random.beta(3, 2) * (1 - base_risk * 0.4), 0, 1)
            avg_holding_period = int(np.random.gamma(4, 30) * (1 - base_risk * 0.3))
            volatility_index = np.clip(np.random.beta(2, 3) * (1 + base_risk * 0.5), 0, 1)
            diversity_score = np.clip(np.random.beta(3, 2) * (1 - base_risk * 0.2), 0, 1)
            
            # Lending History Features (25%)
            total_loans = int(np.random.poisson(10) * (1 + base_risk * 0.2))
            
            if total_loans > 0:
                repayment_rate = np.clip(np.random.beta(8, 2) * (1 - base_risk * 0.6), 0, 1)
                repaid_loans = int(total_loans * repayment_rate)
                default_rate = np.clip(base_risk * 0.5 + np.random.beta(1, 9), 0, 1 - repayment_rate)
                defaulted_loans = int(total_loans * default_rate)
                avg_repayment_time = np.clip(np.random.beta(3, 2) * (1 + base_risk * 0.3), 0, 1)
            else:
                repaid_loans = 0
                defaulted_loans = 0
                avg_repayment_time = 0.5
            
            # DeFi Behavior Features (20%)
            protocol_count = int(np.random.poisson(5) * (1 - base_risk * 0.3))
            yield_farming_activity = np.clip(np.random.beta(2, 3) * (1 - base_risk * 0.2), 0, 1)
            smart_contract_calls = int(np.random.lognormal(4, 1.5) * (1 - base_risk * 0.3))
            defi_experience = int(np.random.gamma(3, 60) * (1 - base_risk * 0.2))
            
            # Loan Request Features
            loan_amount = np.random.lognormal(10, 1.5)
            collateral_amount = loan_amount * np.random.uniform(1.2, 2.5) * (1 + base_risk * 0.3)
            loan_to_collateral_ratio = loan_amount / collateral_amount
            duration_days = int(np.random.gamma(3, 30) * (1 + base_risk * 0.3))
            interest_rate = 300 + base_risk * 2000 + np.random.normal(0, 200)  # basis points
            
            # Account Features
            account_age_days = int(np.random.gamma(4, 90) * (1 - base_risk * 0.2))
            
            # Calculate target: loan default probability
            # Higher base_risk = higher chance of default
            default_probability = self._calculate_default_probability(
                base_risk, repayment_rate if total_loans > 0 else 0.5,
                loan_to_collateral_ratio, stablecoin_ratio, account_age_days
            )
            
            # Binary target: 1 = default, 0 = repaid
            default = 1 if np.random.random() < default_probability else 0
            
            data.append({
                # Transaction Analysis
                'tx_count': tx_count,
                'total_volume': total_volume,
                'avg_frequency': avg_frequency,
                'avg_time_between': avg_time_between,
                
                # Portfolio Stability
                'stablecoin_ratio': stablecoin_ratio,
                'avg_holding_period': avg_holding_period,
                'volatility_index': volatility_index,
                'diversity_score': diversity_score,
                
                # Lending History
                'total_loans': total_loans,
                'repaid_loans': repaid_loans,
                'defaulted_loans': defaulted_loans,
                'avg_repayment_time': avg_repayment_time,
                
                # DeFi Behavior
                'protocol_count': protocol_count,
                'yield_farming_activity': yield_farming_activity,
                'smart_contract_calls': smart_contract_calls,
                'defi_experience': defi_experience,
                
                # Loan Request
                'loan_amount': loan_amount,
                'collateral_amount': collateral_amount,
                'loan_to_collateral_ratio': loan_to_collateral_ratio,
                'duration_days': duration_days,
                'interest_rate': interest_rate,
                
                # Account Features
                'account_age_days': account_age_days,
                
                # Target
                'default': default,
                'default_probability': default_probability
            })
        
        df = pd.DataFrame(data)
        return df
    
    def _calculate_default_probability(self, base_risk, repayment_rate, 
                                      loan_to_collateral, stablecoin_ratio, 
                                      account_age):
        """Calculate realistic default probability based on features"""
        
        prob = base_risk * 0.4  # Start with base risk
        
        # Repayment history impact (strong signal)
        if repayment_rate > 0:
            prob += (1 - repayment_rate) * 0.3
        
        # Collateral ratio impact
        if loan_to_collateral > 0.8:
            prob += 0.2
        elif loan_to_collateral > 0.7:
            prob += 0.1
        
        # Portfolio stability impact
        prob -= stablecoin_ratio * 0.15
        
        # Account age impact
        if account_age < 30:
            prob += 0.15
        elif account_age < 90:
            prob += 0.08
        elif account_age > 365:
            prob -= 0.1
        
        return np.clip(prob, 0.01, 0.95)
    
    def save_dataset(self, df, filepath='ml_service/data/training_data.csv'):
        """Save dataset to CSV"""
        df.to_csv(filepath, index=False)
        print(f"✅ Dataset saved to {filepath}")
        print(f"📊 Shape: {df.shape}")
        print(f"📈 Default rate: {df['default'].mean():.2%}")
        return filepath
    
    def get_feature_info(self):
        """Return information about features"""
        return {
            "transaction_features": [
                "tx_count", "total_volume", "avg_frequency", "avg_time_between"
            ],
            "portfolio_features": [
                "stablecoin_ratio", "avg_holding_period", "volatility_index", "diversity_score"
            ],
            "lending_history_features": [
                "total_loans", "repaid_loans", "defaulted_loans", "avg_repayment_time"
            ],
            "defi_behavior_features": [
                "protocol_count", "yield_farming_activity", "smart_contract_calls", "defi_experience"
            ],
            "loan_request_features": [
                "loan_amount", "collateral_amount", "loan_to_collateral_ratio", 
                "duration_days", "interest_rate"
            ],
            "account_features": [
                "account_age_days"
            ],
            "target": "default"
        }


if __name__ == "__main__":
    # Generate and save training data
    generator = LoanDataGenerator(seed=42)
    df = generator.generate_training_data(n_samples=10000)
    generator.save_dataset(df)
    
    # Print statistics
    print("\n📊 Dataset Statistics:")
    print(df.describe())
    print(f"\n🎯 Target Distribution:")
    print(df['default'].value_counts(normalize=True))
