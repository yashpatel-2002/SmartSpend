from flask import Flask
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from .config import Config
from .extensions import db, migrate, jwt
from .routes import register_blueprints

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    
    # Fix CORS configuration
    CORS(app, 
         origins=[app.config['FRONTEND_URL']], 
         supports_credentials=True,
         allow_headers=['Content-Type', 'Authorization'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])

    # Register blueprints
    register_blueprints(app)

    # Create tables (optional, use migrations in production)
    with app.app_context():
        db.create_all()

    return app