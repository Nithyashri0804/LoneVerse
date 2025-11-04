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
