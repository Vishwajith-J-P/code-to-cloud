from functools import wraps
from flask import jsonify
from flask_login import current_user

def role_required(*roles):
    """
    Decorator to restrict access to specific roles (e.g., 'customer', 'vendor', 'admin').
    Assumes Flask-Login is used and current_user is populated.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Check if user is logged in
            if not current_user.is_authenticated:
                return jsonify({"error": "Unauthorized. Please log in."}), 401
            
            # Check if user has one of the allowed roles
            if getattr(current_user, 'role', None) not in roles:
                return jsonify({
                    "error": "Forbidden. Insufficient permissions.",
                    "required_roles": list(roles),
                    "your_role": getattr(current_user, 'role', None)
                }), 403
                
            return f(*args, **kwargs)
        return decorated_function
    return decorator
