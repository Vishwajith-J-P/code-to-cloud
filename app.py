from flask import Flask, jsonify
from flask_login import LoginManager
from flask_cors import CORS

from config import Config
from services.db import mongo
from models.user import User

def create_app():
    """
    Application factory to create and configure the Flask app.
    """
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Enable Cross-Origin Resource Sharing
    CORS(app, supports_credentials=True)
    
    # Initialize Database connection
    print("Mongo URI:", app.config["MONGO_URI"])
    mongo.init_app(app)
    
    # Initialize Flask-Login
    login_manager = LoginManager()
    login_manager.init_app(app)
    
    # Initialize OAuth
    from services.oauth import init_oauth
    init_oauth(app)
    
    # Customize Flask-Login's unauthorized response to return JSON rather than redirecting to HTML login pages
    @login_manager.unauthorized_handler
    def unauthorized():
        return jsonify({"error": "Unauthorized. Session cookie is missing, invalid or expired."}), 401
        
    @login_manager.user_loader
    def load_user(user_id):
        return User.get_by_id(mongo.db, user_id)
        
    # Register blueprints
    from routes.auth_routes import auth_bp
    from routes.customer_routes import customer_bp
    from routes.vendor_routes import vendor_bp
    from routes.admin_routes import admin_bp
    from routes.web_routes import web_bp
    
    # JSON API routes
    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(customer_bp, url_prefix='/api')
    app.register_blueprint(vendor_bp, url_prefix='/api')
    app.register_blueprint(admin_bp, url_prefix='/api')
    
    # HTML template routes
    app.register_blueprint(web_bp)
    
    # Global HTTP error handlers
    @app.errorhandler(404)
    def resource_not_found(e):
        return jsonify({"error": "Endpoint or resource not found."}), 404
        
    @app.errorhandler(500)
    def internal_server_error(e):
        app.logger.error(f"Server Error: {str(e)}")
        return jsonify({"error": "Internal server error. Please try again later."}), 500
        
    # Create required database schemas and indexes on startup
    with app.app_context():
        try:
            from models.db_init import setup_database
            setup_database(mongo.db)
            print("Successfully verified and configured MongoDB schemas and indexes.")
        except Exception as err:
            app.logger.warning(f"Could not initialize database schemas: {err}")
            
    return app

if __name__ == "__main__":
    app = create_app()
    # Run server locally on defined port
    app.run(host="0.0.0.0", port=app.config["PORT"], debug=app.config["DEBUG"])
