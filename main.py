import os
import sys

# Add ml_service to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'ml_service'))

from ml_api import app

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)
