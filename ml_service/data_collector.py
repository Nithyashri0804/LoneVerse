"""
Real-time Data Collection Framework
Stores actual loan data for continuous model improvement
"""

import json
import pandas as pd
from datetime import datetime
import os


class LoanDataCollector:
    def __init__(self, data_dir='ml_service/data'):
        self.data_dir = data_dir
        self.real_data_path = os.path.join(data_dir, 'real_loan_data.csv')
        self.ensure_data_file_exists()
    
    def ensure_data_file_exists(self):
        """Create data file if it doesn't exist"""
        if not os.path.exists(self.real_data_path):
            # Create empty DataFrame with all required columns
            columns = [
                # Transaction Analysis
                'tx_count', 'total_volume', 'avg_frequency', 'avg_time_between',
                # Portfolio Stability
                'stablecoin_ratio', 'avg_holding_period', 'volatility_index', 'diversity_score',
                # Lending History
                'total_loans', 'repaid_loans', 'defaulted_loans', 'avg_repayment_time',
                # DeFi Behavior
                'protocol_count', 'yield_farming_activity', 'smart_contract_calls', 'defi_experience',
                # Loan Request
                'loan_amount', 'collateral_amount', 'loan_to_collateral_ratio', 
                'duration_days', 'interest_rate',
                # Account Features
                'account_age_days',
                # Loan metadata
                'loan_id', 'borrower_address', 'lender_address', 'timestamp',
                # Outcome (filled when loan completes)
                'default', 'actual_repayment_time', 'loan_status'
            ]
            df = pd.DataFrame(columns=columns)
            df.to_csv(self.real_data_path, index=False)
            print(f"✅ Created real data file: {self.real_data_path}")
    
    def record_loan_request(self, loan_data):
        """
        Record a new loan request
        loan_data should contain all feature values plus metadata
        """
        try:
            # Load existing data
            df = pd.read_csv(self.real_data_path)
            
            # Add timestamp if not present
            if 'timestamp' not in loan_data:
                loan_data['timestamp'] = datetime.now().isoformat()
            
            # Initially, default and outcome are unknown
            if 'default' not in loan_data:
                loan_data['default'] = None
            if 'loan_status' not in loan_data:
                loan_data['loan_status'] = 'active'
            
            # Append new data
            new_df = pd.DataFrame([loan_data])
            df = pd.concat([df, new_df], ignore_index=True)
            
            # Save
            df.to_csv(self.real_data_path, index=False)
            
            print(f"✅ Recorded loan request: {loan_data.get('loan_id', 'unknown')}")
            return True
            
        except Exception as e:
            print(f"❌ Error recording loan data: {e}")
            return False
    
    def update_loan_outcome(self, loan_id, outcome_data):
        """
        Update loan outcome when it's repaid or defaulted
        outcome_data: {'default': 0/1, 'actual_repayment_time': ..., 'loan_status': 'repaid/defaulted'}
        """
        try:
            df = pd.read_csv(self.real_data_path)
            
            # Find loan by ID
            mask = df['loan_id'] == loan_id
            
            if not mask.any():
                print(f"⚠️ Loan ID {loan_id} not found")
                return False
            
            # Update outcome
            for key, value in outcome_data.items():
                df.loc[mask, key] = value
            
            # Save
            df.to_csv(self.real_data_path, index=False)
            
            print(f"✅ Updated outcome for loan: {loan_id}")
            return True
            
        except Exception as e:
            print(f"❌ Error updating loan outcome: {e}")
            return False
    
    def get_completed_loans(self):
        """Get all loans with known outcomes for retraining"""
        try:
            df = pd.read_csv(self.real_data_path)
            
            # Filter loans with known outcomes
            completed = df[df['default'].notna()].copy()
            
            print(f"📊 Found {len(completed)} completed loans")
            return completed
            
        except Exception as e:
            print(f"❌ Error getting completed loans: {e}")
            return pd.DataFrame()
    
    def get_statistics(self):
        """Get statistics about collected data"""
        try:
            df = pd.read_csv(self.real_data_path)
            
            total_loans = len(df)
            completed_loans = df['default'].notna().sum()
            active_loans = total_loans - completed_loans
            
            if completed_loans > 0:
                default_rate = df[df['default'].notna()]['default'].mean()
            else:
                default_rate = 0
            
            stats = {
                'total_loans': int(total_loans),
                'active_loans': int(active_loans),
                'completed_loans': int(completed_loans),
                'default_rate': float(default_rate),
                'repaid_loans': int(df[df['default'] == 0].shape[0]) if completed_loans > 0 else 0,
                'defaulted_loans': int(df[df['default'] == 1].shape[0]) if completed_loans > 0 else 0,
                'data_collection_started': df['timestamp'].min() if 'timestamp' in df.columns and len(df) > 0 else None,
                'last_update': df['timestamp'].max() if 'timestamp' in df.columns and len(df) > 0 else None
            }
            
            return stats
            
        except Exception as e:
            print(f"❌ Error getting statistics: {e}")
            return {}
    
    def merge_with_synthetic_data(self, synthetic_data_path='ml_service/data/training_data.csv',
                                  output_path='ml_service/data/combined_training_data.csv'):
        """
        Merge real collected data with synthetic data for model retraining
        This allows incremental learning as real data accumulates
        """
        try:
            # Load synthetic data
            synthetic_df = pd.read_csv(synthetic_data_path)
            
            # Load real data with outcomes
            real_df = self.get_completed_loans()
            
            if len(real_df) == 0:
                print("⚠️ No real data available yet, using synthetic data only")
                return synthetic_data_path
            
            # Select only the feature columns that exist in both datasets
            common_columns = list(set(synthetic_df.columns) & set(real_df.columns))
            
            # Combine datasets
            combined_df = pd.concat([
                synthetic_df[common_columns],
                real_df[common_columns]
            ], ignore_index=True)
            
            # Save combined dataset
            combined_df.to_csv(output_path, index=False)
            
            print(f"✅ Created combined dataset:")
            print(f"   Synthetic samples: {len(synthetic_df)}")
            print(f"   Real samples: {len(real_df)}")
            print(f"   Total: {len(combined_df)}")
            print(f"   Saved to: {output_path}")
            
            return output_path
            
        except Exception as e:
            print(f"❌ Error merging datasets: {e}")
            return synthetic_data_path
    
    def export_for_analysis(self, export_path='ml_service/data/real_data_export.json'):
        """Export real data in JSON format for analysis"""
        try:
            df = pd.read_csv(self.real_data_path)
            
            export_data = {
                'export_date': datetime.now().isoformat(),
                'statistics': self.get_statistics(),
                'loans': df.to_dict('records')
            }
            
            with open(export_path, 'w') as f:
                json.dump(export_data, f, indent=2)
            
            print(f"✅ Exported data to: {export_path}")
            return export_path
            
        except Exception as e:
            print(f"❌ Error exporting data: {e}")
            return None


if __name__ == "__main__":
    # Test data collector
    collector = LoanDataCollector()
    
    # Print statistics
    stats = collector.get_statistics()
    print("\n📊 Data Collection Statistics:")
    for key, value in stats.items():
        print(f"  {key}: {value}")
