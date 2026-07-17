from flask import request, jsonify
from bson import ObjectId
from bson.errors import InvalidId

from services.db import get_db
from models.user import User
from models.product import serialize_product
from models.order import serialize_order

def get_admin_dashboard():
    """
    GET /admin/dashboard
    Aggregates metrics for the admin control panel.
    """
    db = get_db()
    
    total_customers = db.users.count_documents({"role": "customer"})
    total_vendors = db.users.count_documents({"role": "vendor"})
    total_products = db.products.count_documents({})
    total_orders = db.orders.count_documents({})
    
    # Platform Revenue (sum of totalAmount of all Delivered orders)
    revenue_pipeline = [
        {"$match": {"orderStatus": "Delivered"}},
        {"$group": {"_id": None, "revenue": {"$sum": "$totalAmount"}}}
    ]
    res = list(db.orders.aggregate(revenue_pipeline))
    revenue = res[0]["revenue"] if res else 0.0
    
    return jsonify({
        "dashboard": {
            "totalCustomers": total_customers,
            "totalVendors": total_vendors,
            "totalProducts": total_products,
            "totalOrders": total_orders,
            "revenue": float(revenue)
        }
    }), 200

def get_admin_users():
    """
    GET /admin/users
    Retrieves all registered customers.
    """
    db = get_db()
    users_cursor = db.users.find({"role": "customer"})
    users_list = [User(u).to_json() for u in users_cursor]
    return jsonify({"customers": users_list}), 200

def get_admin_vendors():
    """
    GET /admin/vendors
    Retrieves all registered vendors.
    """
    db = get_db()
    vendors_cursor = db.users.find({"role": "vendor"})
    vendors_list = [User(v).to_json() for v in vendors_cursor]
    return jsonify({"vendors": vendors_list}), 200

def get_admin_products():
    """
    GET /admin/products
    Retrieves all products on the platform.
    """
    db = get_db()
    products_cursor = db.products.find()
    products_list = [serialize_product(p) for p in products_cursor]
    return jsonify({"products": products_list}), 200

def get_admin_orders():
    """
    GET /admin/orders
    Retrieves all orders on the platform.
    """
    db = get_db()
    orders_cursor = db.orders.find().sort("createdAt", -1)
    orders_list = [serialize_order(o) for o in orders_cursor]
    return jsonify({"orders": orders_list}), 200

def delete_admin_user(user_id):
    """
    DELETE /admin/user/<id>
    Deletes a customer account. Clean up their cart.
    """
    db = get_db()
    try:
        user_oid = ObjectId(user_id)
    except InvalidId:
        return jsonify({"error": "Invalid user ID format."}), 400
        
    user = db.users.find_one({"_id": user_oid})
    if not user:
        return jsonify({"error": "User not found."}), 404
        
    if user.get("role") != "customer":
        return jsonify({"error": "This endpoint is strictly for deleting customer accounts."}), 400
        
    # Cascade delete cart
    db.carts.delete_one({"userId": user_oid})
    db.users.delete_one({"_id": user_oid})
    
    return jsonify({"message": f"Customer '{user.get('fullName')}' deleted successfully."}), 200

def delete_admin_vendor(vendor_id):
    """
    DELETE /admin/vendor/<id>
    Deletes a vendor account. Cascades and deletes all products listed by this vendor.
    """
    db = get_db()
    try:
        vendor_oid = ObjectId(vendor_id)
    except InvalidId:
        return jsonify({"error": "Invalid vendor ID format."}), 400
        
    vendor = db.users.find_one({"_id": vendor_oid})
    if not vendor:
        return jsonify({"error": "Vendor not found."}), 404
        
    if vendor.get("role") != "vendor":
        return jsonify({"error": "This endpoint is strictly for deleting vendor accounts."}), 400
        
    # Cascade delete all products listed by this vendor
    db.products.delete_many({"vendorId": vendor_oid})
    db.users.delete_one({"_id": vendor_oid})
    
    return jsonify({"message": f"Vendor '{vendor.get('fullName')}' and all associated products deleted successfully."}), 200

def delete_admin_product(product_id):
    """
    DELETE /admin/product/<id>
    Deletes any product on the platform.
    """
    db = get_db()
    try:
        prod_oid = ObjectId(product_id)
    except InvalidId:
        return jsonify({"error": "Invalid product ID format."}), 400
        
    product = db.products.find_one({"_id": prod_oid})
    if not product:
        return jsonify({"error": "Product not found."}), 404
        
    db.products.delete_one({"_id": prod_oid})
    return jsonify({"message": f"Product '{product.get('productName')}' deleted successfully."}), 200
