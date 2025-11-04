"""
Database Connection Pool Configuration for Flask ML API
Provides optimized database connection pooling with SQLAlchemy
"""

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.pool import QueuePool
import os

def configure_database_pool(app):
    """
    Configure optimized database connection pooling
    
    Parameters:
    - pool_size: Number of connections to maintain in the pool (default: 10)
    - max_overflow: Max connections beyond pool_size (default: 20)
    - pool_timeout: Seconds to wait for connection (default: 30)
    - pool_recycle: Recycle connections after N seconds (default: 3600 = 1 hour)
    - pool_pre_ping: Test connections before use (default: True)
    """
    
    database_url = os.environ.get('DATABASE_URL')
    
    if database_url:
        app.config['SQLALCHEMY_DATABASE_URI'] = database_url
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
            'poolclass': QueuePool,
            'pool_size': int(os.environ.get('DB_POOL_SIZE', 10)),
            'max_overflow': int(os.environ.get('DB_MAX_OVERFLOW', 20)),
            'pool_timeout': int(os.environ.get('DB_POOL_TIMEOUT', 30)),
            'pool_recycle': int(os.environ.get('DB_POOL_RECYCLE', 3600)),
            'pool_pre_ping': True,
            'echo': False,
            'connect_args': {
                'connect_timeout': 10,
                'keepalives': 1,
                'keepalives_idle': 30,
                'keepalives_interval': 10,
                'keepalives_count': 5,
            }
        }
        
        print(f"✅ Database pool configured: size={app.config['SQLALCHEMY_ENGINE_OPTIONS']['pool_size']}, "
              f"max_overflow={app.config['SQLALCHEMY_ENGINE_OPTIONS']['max_overflow']}")
    else:
        print("⚠️ DATABASE_URL not set - database pooling disabled")
        app.config['SQLALCHEMY_DATABASE_URI'] = None
    
    return app

def get_pool_stats(db):
    """
    Get current database connection pool statistics
    
    Returns dict with pool metrics
    """
    if not db or not db.engine:
        return {
            'status': 'no_database',
            'pool_configured': False
        }
    
    pool = db.engine.pool
    
    return {
        'status': 'active',
        'pool_configured': True,
        'size': pool.size(),
        'checked_in': pool.checkedin(),
        'checked_out': pool.checkedout(),
        'overflow': pool.overflow(),
        'total_connections': pool.checkedin() + pool.checkedout()
    }
