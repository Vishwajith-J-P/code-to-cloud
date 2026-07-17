from flask import request, jsonify
from bson import ObjectId
from bson.errors import InvalidId
import datetime

from services.db import get_db
from models.user import User
from models.product import serialize_product
from models.order import serialize_order
from models.category import serialize_category, create_category_doc

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
    
    # Monthly Revenue Chart (Delivered orders grouped by month)
    months_map = {1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun", 7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec"}
    monthly_rev_pipeline = [
        {"$match": {"orderStatus": "Delivered"}},
        {"$group": {
            "_id": {
                "year": {"$year": "$createdAt"},
                "month": {"$month": "$createdAt"}
            },
            "revenue": {"$sum": "$totalAmount"}
        }},
        {"$sort": {"_id.year": 1, "_id.month": 1}}
    ]
    monthly_res = list(db.orders.aggregate(monthly_rev_pipeline))
    monthly_revenue = []
    for item in monthly_res:
        m = item["_id"]["month"]
        y = item["_id"]["year"]
        monthly_revenue.append({
            "label": f"{months_map.get(m, str(m))} {y}",
            "value": float(item["revenue"])
        })

    # Daily Orders Chart (Orders in the last 30 days)
    thirty_days_ago = datetime.datetime.utcnow() - datetime.timedelta(days=30)
    daily_orders_pipeline = [
        {"$match": {"createdAt": {"$gte": thirty_days_ago}}},
        {"$group": {
            "_id": {
                "year": {"$year": "$createdAt"},
                "month": {"$month": "$createdAt"},
                "day": {"$dayOfMonth": "$createdAt"}
            },
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id.year": 1, "_id.month": 1, "_id.day": 1}}
    ]
    daily_res = list(db.orders.aggregate(daily_orders_pipeline))
    daily_orders = []
    for item in daily_res:
        date_str = f"{item['_id']['year']}-{item['_id']['month']:02d}-{item['_id']['day']:02d}"
        daily_orders.append({"date": date_str, "count": item["count"]})

    # Product Categories Chart
    category_pipeline = [
        {"$group": {
            "_id": "$category",
            "count": {"$sum": 1}
        }}
    ]
    cat_res = list(db.products.aggregate(category_pipeline))
    product_categories = [{"category": item["_id"] or "Uncategorized", "count": item["count"]} for item in cat_res]
    
    return jsonify({
        "dashboard": {
            "totalCustomers": total_customers,
            "totalVendors": total_vendors,
            "totalProducts": total_products,
            "totalOrders": total_orders,
            "revenue": float(revenue),
            "monthlyRevenue": monthly_revenue,
            "dailyOrders": daily_orders,
            "productCategories": product_categories
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

def update_admin_user(user_id):
    """
    PUT /admin/user/<id>
    Updates a customer account's details.
    """
    db = get_db()
    try:
        user_oid = ObjectId(user_id)
    except InvalidId:
        return jsonify({"error": "Invalid user ID format."}), 400
        
    user = db.users.find_one({"_id": user_oid})
    if not user:
        return jsonify({"error": "User not found."}), 404
        
    data = request.get_json() or {}
    fullName = data.get("fullName", "").strip()
    email = data.get("email", "").strip().lower()
    phone = data.get("phone", "").strip()
    address = data.get("address", "").strip()
    isActive = data.get("isActive")
    
    if not fullName or not email:
        return jsonify({"error": "Name and email are required fields."}), 400
        
    # Check duplicate email
    existing = db.users.find_one({"email": email, "_id": {"$ne": user_oid}})
    if existing:
        return jsonify({"error": "Email is already taken by another user."}), 400
        
    update_data = {
        "fullName": fullName,
        "email": email,
        "phone": phone,
        "address": address
    }
    if isActive is not None:
        update_data["isActive"] = bool(isActive)
        
    db.users.update_one({"_id": user_oid}, {"$set": update_data})
    return jsonify({"message": "User updated successfully."}), 200

def update_admin_vendor(vendor_id):
    """
    PUT /admin/vendor/<id>
    Updates a vendor account's details.
    """
    db = get_db()
    try:
        vendor_oid = ObjectId(vendor_id)
    except InvalidId:
        return jsonify({"error": "Invalid vendor ID format."}), 400
        
    vendor = db.users.find_one({"_id": vendor_oid})
    if not vendor:
        return jsonify({"error": "Vendor not found."}), 404
        
    data = request.get_json() or {}
    fullName = data.get("fullName", "").strip()
    email = data.get("email", "").strip().lower()
    phone = data.get("phone", "").strip()
    address = data.get("address", "").strip()
    isActive = data.get("isActive")
    
    if not fullName or not email:
        return jsonify({"error": "Name and email are required fields."}), 400
        
    # Check duplicate email
    existing = db.users.find_one({"email": email, "_id": {"$ne": vendor_oid}})
    if existing:
        return jsonify({"error": "Email is already taken by another user."}), 400
        
    update_data = {
        "fullName": fullName,
        "email": email,
        "phone": phone,
        "address": address
    }
    if isActive is not None:
        update_data["isActive"] = bool(isActive)
        
    db.users.update_one({"_id": vendor_oid}, {"$set": update_data})
    return jsonify({"message": "Vendor updated successfully."}), 200

def update_admin_product(product_id):
    """
    PUT /admin/product/<id>
    Updates a product's details.
    """
    db = get_db()
    try:
        prod_oid = ObjectId(product_id)
    except InvalidId:
        return jsonify({"error": "Invalid product ID format."}), 400
        
    product = db.products.find_one({"_id": prod_oid})
    if not product:
        return jsonify({"error": "Product not found."}), 404
        
    data = request.get_json() or {}
    productName = data.get("productName", "").strip()
    description = data.get("description", "").strip()
    category = data.get("category", "").strip()
    price = data.get("price")
    stock = data.get("stock")
    image = data.get("image", "").strip()
    isAvailable = data.get("isAvailable")
    
    if not productName or not category or price is None or stock is None:
        return jsonify({"error": "Product name, category, price, and stock are required."}), 400
        
    update_data = {
        "productName": productName,
        "description": description,
        "category": category,
        "price": float(price),
        "stock": int(stock),
        "image": image,
        "updatedAt": datetime.datetime.utcnow()
    }
    if isAvailable is not None:
        update_data["isAvailable"] = bool(isAvailable)
    else:
        update_data["isAvailable"] = int(stock) > 0
        
    db.products.update_one({"_id": prod_oid}, {"$set": update_data})
    return jsonify({"message": "Product updated successfully."}), 200

def update_admin_order(order_id):
    """
    PUT /admin/order/<id>
    Updates an order's status and payment status.
    """
    db = get_db()
    try:
        order_oid = ObjectId(order_id)
    except InvalidId:
        return jsonify({"error": "Invalid order ID format."}), 400
        
    order = db.orders.find_one({"_id": order_oid})
    if not order:
        return jsonify({"error": "Order not found."}), 404
        
    data = request.get_json() or {}
    orderStatus = data.get("orderStatus")
    paymentStatus = data.get("paymentStatus")
    
    update_data = {}
    if orderStatus:
        update_data["orderStatus"] = orderStatus
    if paymentStatus:
        update_data["paymentStatus"] = paymentStatus
        
    if not update_data:
        return jsonify({"error": "No update fields provided."}), 400
        
    db.orders.update_one({"_id": order_oid}, {"$set": update_data})
    return jsonify({"message": "Order updated successfully."}), 200

def get_admin_categories():
    """
    GET /admin/categories
    Retrieves all categories and their product counts.
    """
    db = get_db()
    categories = list(db.categories.find())
    serialized = []
    for cat in categories:
        cat_name = cat.get("categoryName")
        prod_count = db.products.count_documents({"category": cat_name})
        s = serialize_category(cat)
        s["productCount"] = prod_count
        serialized.append(s)
    return jsonify({"categories": serialized}), 200

def create_admin_category():
    """
    POST /admin/categories
    Creates a new category.
    """
    db = get_db()
    data = request.get_json() or {}
    categoryName = data.get("categoryName", "").strip()
    image = data.get("image", "").strip()
    
    if not categoryName:
        return jsonify({"error": "Category name is required."}), 400
        
    # Check if duplicate name
    existing = db.categories.find_one({"categoryName": {"$regex": f"^{categoryName}$", "$options": "i"}})
    if existing:
        return jsonify({"error": "Category name already exists."}), 400
        
    doc = create_category_doc(categoryName, image)
    res = db.categories.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    return jsonify({"message": "Category created successfully.", "category": doc}), 201

def update_admin_category(category_id):
    """
    PUT /admin/category/<id>
    Updates a category.
    """
    db = get_db()
    try:
        cat_oid = ObjectId(category_id)
    except InvalidId:
        return jsonify({"error": "Invalid category ID format."}), 400
        
    cat = db.categories.find_one({"_id": cat_oid})
    if not cat:
        return jsonify({"error": "Category not found."}), 404
        
    data = request.get_json() or {}
    categoryName = data.get("categoryName", "").strip()
    image = data.get("image", "").strip()
    
    if not categoryName:
        return jsonify({"error": "Category name is required."}), 400
        
    # Check if duplicate name
    existing = db.categories.find_one({"categoryName": {"$regex": f"^{categoryName}$", "$options": "i"}, "_id": {"$ne": cat_oid}})
    if existing:
        return jsonify({"error": "Category name already exists."}), 400
        
    db.categories.update_one(
        {"_id": cat_oid},
        {"$set": {"categoryName": categoryName, "image": image}}
    )
    # Also update products with the old category name to the new category name
    old_name = cat.get("categoryName")
    if old_name and old_name != categoryName:
        db.products.update_many({"category": old_name}, {"$set": {"category": categoryName}})
        
    return jsonify({"message": "Category updated successfully."}), 200

def delete_admin_category(category_id):
    """
    DELETE /admin/category/<id>
    Deletes a category.
    """
    db = get_db()
    try:
        cat_oid = ObjectId(category_id)
    except InvalidId:
        return jsonify({"error": "Invalid category ID format."}), 400
        
    cat = db.categories.find_one({"_id": cat_oid})
    if not cat:
        return jsonify({"error": "Category not found."}), 404
        
    db.categories.delete_one({"_id": cat_oid})
    return jsonify({"message": f"Category '{cat.get('categoryName')}' deleted successfully."}), 200
