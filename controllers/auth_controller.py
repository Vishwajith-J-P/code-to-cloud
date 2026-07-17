from flask import request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from services.db import get_db
from models.user import User, create_user_doc, verify_password
from models.cart import create_cart_doc
from utils.validators import validate_email, validate_phone, validate_password, get_missing_fields

def register():
    """
    POST /register
    Registers a new user (customer, vendor, or admin).
    """
    db = get_db()
    data = request.get_json() or {}
    
    # 1. Validate required fields
    required = ["fullName", "email", "password", "phone", "address", "role"]
    missing = get_missing_fields(data, required)
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400
        
    fullName = data.get("fullName")
    email = data.get("email")
    password = data.get("password")
    phone = data.get("phone")
    address = data.get("address")
    role = data.get("role").strip().lower()
    
    # 2. Validate field formats
    if not validate_email(email):
        return jsonify({"error": "Invalid email address format."}), 400
    if not validate_password(password):
        return jsonify({"error": "Password must be at least 6 characters long."}), 400
    if not validate_phone(phone):
        return jsonify({"error": "Invalid phone number format."}), 400
    if role not in ["customer", "vendor", "admin"]:
        return jsonify({"error": "Invalid role. Must be 'customer', 'vendor', or 'admin'."}), 400
        
    # 3. Check duplicate email
    existing_user = db.users.find_one({"email": email.strip().lower()})
    if existing_user:
        return jsonify({"error": "Email address already registered."}), 409
        
    # 4. Insert user
    user_doc = create_user_doc(fullName, email, password, phone, address, role)
    result = db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    
    # 5. Automatically initialize cart for customer
    if role == "customer":
        cart_doc = create_cart_doc(result.inserted_id)
        db.carts.insert_one(cart_doc)
        
    user_obj = User(user_doc)
    return jsonify({
        "message": "User registered successfully.",
        "user": user_obj.to_json()
    }), 201

def login():
    """
    POST /login
    Authenticates user and starts a session.
    """
    db = get_db()
    data = request.get_json() or {}
    
    required = ["email", "password"]
    missing = get_missing_fields(data, required)
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400
        
    email = data.get("email").strip().lower()
    password = data.get("password")
    
    user_data = db.users.find_one({"email": email})
    if not user_data:
        return jsonify({"error": "Invalid email or password."}), 401
        
    # Verify active state
    if not user_data.get("isActive", True):
        return jsonify({"error": "Account is deactivated."}), 403
        
    # Check password
    if not verify_password(user_data["password"], password):
        return jsonify({"error": "Invalid email or password."}), 401
        
    # Log in using Flask-Login
    user_obj = User(user_data)
    login_user(user_obj)
    
    return jsonify({
        "message": "Logged in successfully.",
        "user": user_obj.to_json()
    }), 200

@login_required
def logout():
    """
    POST /logout
    Terminates the user's session.
    """
    logout_user()
    return jsonify({"message": "Logged out successfully."}), 200

@login_required
def profile():
    """
    GET /profile
    Retrieves the current logged in user's profile.
    """
    return jsonify({
        "user": current_user.to_json()
    }), 200
