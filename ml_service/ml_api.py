"""
Flask API for Machine Learning Service
Provides endpoints for risk prediction and model management
With optimized database connection pooling
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import os
import sys

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from logistic_model import LoanRiskLogisticModel
from data_collector import LoanDataCollector
from model_comparison import ModelComparison
from db_pool import configure_database_pool, get_pool_stats
import json

app = Flask(__name__)
CORS(app)

# Configure database connection pooling
app = configure_database_pool(app)
db = SQLAlchemy(app) if app.config.get('SQLALCHEMY_DATABASE_URI') else None

# Initialize model and data collector
ml_model = LoanRiskLogisticModel()
data_collector = LoanDataCollector()
model_loaded = False

# Try to load existing model
try:
    if ml_model.load_model():
        model_loaded = True
        print("✅ ML model loaded successfully")
    else:
        print("⚠️ No trained model found. Please train the model first.")
except Exception as e:
    print(f"⚠️ Error loading model: {e}")


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model_loaded,
        'service': 'ML Risk Assessment Service'
    })


@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict default risk for a loan request
    Expected input: loan features as JSON
    """
    if not model_loaded:
        return jsonify({
            'error': 'Model not loaded',
            'message': 'Please train the model first'
        }), 503
    
    try:
        features = request.json
        
        if not features:
            return jsonify({'error': 'No features provided'}), 400
        
        # Make prediction
        result = ml_model.predict_single(features)
        
        return jsonify({
            'success': True,
            'prediction': result,
            'model': 'logistic_regression'
        })
        
    except Exception as e:
        return jsonify({
            'error': 'Prediction failed',
            'message': str(e)
        }), 500


@app.route('/predict/batch', methods=['POST'])
def predict_batch():
    """
    Predict default risk for multiple loan requests
    Expected input: array of loan features
    """
    if not model_loaded:
        return jsonify({
            'error': 'Model not loaded',
            'message': 'Please train the model first'
        }), 503
    
    try:
        data = request.json
        features_list = data.get('loans', [])
        
        if not features_list:
            return jsonify({'error': 'No loan data provided'}), 400
        
        predictions = []
        for features in features_list:
            try:
                result = ml_model.predict_single(features)
                predictions.append(result)
            except Exception as e:
                predictions.append({
                    'error': str(e),
                    'features': features
                })
        
        return jsonify({
            'success': True,
            'predictions': predictions,
            'count': len(predictions)
        })
        
    except Exception as e:
        return jsonify({
            'error': 'Batch prediction failed',
            'message': str(e)
        }), 500


@app.route('/model/info', methods=['GET'])
def model_info():
    """Get information about the loaded model"""
    if not model_loaded:
        return jsonify({
            'error': 'Model not loaded'
        }), 503
    
    try:
        info = {
            'model_type': 'Logistic Regression',
            'features': ml_model.feature_names,
            'feature_count': len(ml_model.feature_names),
            'training_metrics': ml_model.training_metrics,
            'feature_importance': ml_model.get_feature_importance()[:10]  # Top 10
        }
        
        return jsonify(info)
        
    except Exception as e:
        return jsonify({
            'error': 'Failed to get model info',
            'message': str(e)
        }), 500


@app.route('/model/metrics', methods=['GET'])
def get_metrics():
    """Get model performance metrics"""
    if not model_loaded:
        return jsonify({
            'error': 'Model not loaded'
        }), 503
    
    try:
        # Load training report if available
        report_path = 'ml_service/models/training_report.json'
        if os.path.exists(report_path):
            with open(report_path, 'r') as f:
                report = json.load(f)
            return jsonify(report)
        else:
            return jsonify({
                'training_metrics': ml_model.training_metrics
            })
        
    except Exception as e:
        return jsonify({
            'error': 'Failed to get metrics',
            'message': str(e)
        }), 500


@app.route('/comparison', methods=['GET'])
def get_comparison():
    """Get comparison between logistic regression and heuristic"""
    try:
        comparison_path = 'ml_service/models/comparison_report.json'
        if os.path.exists(comparison_path):
            with open(comparison_path, 'r') as f:
                comparison = json.load(f)
            return jsonify(comparison)
        else:
            return jsonify({
                'error': 'Comparison report not found',
                'message': 'Run model comparison first'
            }), 404
        
    except Exception as e:
        return jsonify({
            'error': 'Failed to get comparison',
            'message': str(e)
        }), 500


@app.route('/data/record', methods=['POST'])
def record_loan():
    """Record a new loan request for data collection"""
    try:
        loan_data = request.json
        
        if not loan_data:
            return jsonify({'error': 'No loan data provided'}), 400
        
        success = data_collector.record_loan_request(loan_data)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Loan data recorded successfully'
            })
        else:
            return jsonify({
                'error': 'Failed to record loan data'
            }), 500
        
    except Exception as e:
        return jsonify({
            'error': 'Failed to record loan',
            'message': str(e)
        }), 500


@app.route('/data/update', methods=['POST'])
def update_loan_outcome():
    """Update loan outcome (repaid/defaulted)"""
    try:
        data = request.json
        loan_id = data.get('loan_id')
        outcome = data.get('outcome', {})
        
        if not loan_id or not outcome:
            return jsonify({
                'error': 'loan_id and outcome are required'
            }), 400
        
        success = data_collector.update_loan_outcome(loan_id, outcome)
        
        if success:
            return jsonify({
                'success': True,
                'message': f'Loan outcome updated for {loan_id}'
            })
        else:
            return jsonify({
                'error': 'Failed to update loan outcome'
            }), 500
        
    except Exception as e:
        return jsonify({
            'error': 'Failed to update loan outcome',
            'message': str(e)
        }), 500


@app.route('/data/statistics', methods=['GET'])
def get_data_statistics():
    """Get statistics about collected data"""
    try:
        stats = data_collector.get_statistics()
        return jsonify(stats)
        
    except Exception as e:
        return jsonify({
            'error': 'Failed to get statistics',
            'message': str(e)
        }), 500


@app.route('/retrain', methods=['POST'])
def retrain_model():
    """
    Retrain model with new data
    Merges real collected data with synthetic data
    """
    try:
        # Merge datasets
        print("📊 Merging datasets...")
        combined_data_path = data_collector.merge_with_synthetic_data()
        
        # Import training function
        from logistic_model import train_and_evaluate_model
        
        # Retrain model
        print("🎯 Retraining model...")
        model, metrics = train_and_evaluate_model(data_path=combined_data_path)
        
        # Reload the model
        global ml_model, model_loaded
        ml_model = model
        model_loaded = True
        
        return jsonify({
            'success': True,
            'message': 'Model retrained successfully',
            'metrics': metrics
        })
        
    except Exception as e:
        return jsonify({
            'error': 'Retraining failed',
            'message': str(e)
        }), 500


@app.route('/retrain/enhanced', methods=['POST'])
def retrain_enhanced_model():
    """
    Retrain with enhanced model featuring:
    - Feature engineering (ratios, interactions)
    - L1/L2 regularization with hyperparameter tuning
    - Automatic feature selection
    """
    try:
        # Get options from request
        options = request.json or {}
        perform_tuning = options.get('perform_tuning', True)
        data_path = options.get('data_path', 'ml_service/data/training_data.csv')
        
        print("🚀 Starting enhanced model training...")
        print(f"  Hyperparameter tuning: {perform_tuning}")
        
        # Import enhanced training function
        from enhanced_model import train_enhanced_model
        
        # Train enhanced model
        model, metrics = train_enhanced_model(
            data_path=data_path,
            perform_tuning=perform_tuning
        )
        
        # Get feature selection info
        selection_report = model.get_feature_selection_report()
        
        return jsonify({
            'success': True,
            'message': 'Enhanced model trained successfully',
            'metrics': {
                'accuracy': float(metrics['accuracy']),
                'precision': float(metrics['precision']),
                'recall': float(metrics['recall']),
                'f1_score': float(metrics['f1_score']),
                'roc_auc': float(metrics['roc_auc']),
                'specificity': float(metrics['specificity'])
            },
            'feature_selection': {
                'selected_count': selection_report['selected_count'],
                'dropped_count': selection_report['dropped_count'],
                'penalty_type': selection_report['penalty'],
                'top_features': selection_report['selected_features'][:10]
            },
            'hyperparameters': model.tuning_results if hasattr(model, 'tuning_results') else None
        })
        
    except Exception as e:
        import traceback
        return jsonify({
            'error': 'Enhanced model training failed',
            'message': str(e),
            'traceback': traceback.format_exc()
        }), 500


@app.route('/model/comparison', methods=['GET'])
def compare_models():
    """
    Compare standard and enhanced model performance
    """
    try:
        # Load standard model metrics
        standard_path = 'ml_service/models/logistic_model_metadata.json'
        enhanced_path = 'ml_service/models/enhanced_model_metadata.json'
        
        comparison = {
            'standard_model': {},
            'enhanced_model': {},
            'improvement': {}
        }
        
        if os.path.exists(standard_path):
            with open(standard_path, 'r') as f:
                standard_meta = json.load(f)
                comparison['standard_model'] = standard_meta.get('metrics', {})
        
        if os.path.exists(enhanced_path):
            with open(enhanced_path, 'r') as f:
                enhanced_meta = json.load(f)
                comparison['enhanced_model'] = enhanced_meta.get('metrics', {})
        
        # Calculate improvements
        if comparison['standard_model'] and comparison['enhanced_model']:
            for metric in ['accuracy', 'precision', 'recall', 'f1_score', 'roc_auc']:
                if metric in comparison['standard_model'] and metric in comparison['enhanced_model']:
                    standard_val = comparison['standard_model'][metric]
                    enhanced_val = comparison['enhanced_model'][metric]
                    improvement = ((enhanced_val - standard_val) / standard_val) * 100
                    comparison['improvement'][metric] = {
                        'absolute': enhanced_val - standard_val,
                        'percentage': improvement
                    }
        
        return jsonify(comparison)
        
    except Exception as e:
        return jsonify({
            'error': 'Failed to compare models',
            'message': str(e)
        }), 500


@app.route('/pool/stats', methods=['GET'])
def pool_stats():
    """
    Get database connection pool statistics
    """
    try:
        if not db:
            return jsonify({
                'pool_configured': False,
                'message': 'Database not configured'
            })
        
        stats = get_pool_stats(db)
        return jsonify(stats)
        
    except Exception as e:
        return jsonify({
            'error': 'Failed to get pool stats',
            'message': str(e)
        }), 500


@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    print("🚀 Starting ML Risk Assessment API...")
    print("📍 Available endpoints:")
    print("  GET  /health              - Health check")
    print("  POST /predict             - Predict single loan risk")
    print("  POST /predict/batch       - Predict multiple loan risks")
    print("  GET  /model/info          - Get model information")
    print("  GET  /model/metrics       - Get model metrics")
    print("  GET  /comparison          - Get model comparison results")
    print("  POST /data/record         - Record new loan data")
    print("  POST /data/update         - Update loan outcome")
    print("  GET  /data/statistics     - Get data collection stats")
    print("  POST /retrain             - Retrain model with new data")
    print("  GET  /pool/stats          - Get database pool statistics")
    print("")
    
    # Run on port 3002
    app.run(host='0.0.0.0', port=3002, debug=True)
