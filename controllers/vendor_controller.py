from flask import request, jsonify
from flask_login import login_required, current_user
from bson import ObjectId
from bson.errors import InvalidId
import datetime

from services.db import get_db
from models.product import serialize_product, create_product_doc
from models.order import serialize_order
from utils.validators import get_missing_fields

def get_vendor_dashboard():
    """
    GET /vendor/dashboard
    Aggregates statistics for the vendor dashboard.
    """
    db = get_db()
    vendor_oid = ObjectId(current_user.id)
    
    # 1. Total products
    total_products = db.products.count_documents({"vendorId": vendor_oid})
    
    # 2. Total orders
    total_orders = db.orders.count_documents({"vendorId": vendor_oid})
    
    # 3. Pending orders
    pending_orders = db.orders.count_documents({"vendorId": vendor_oid, "orderStatus": "Pending"})
    
    # 4. Completed orders
    completed_orders = db.orders.count_documents({"vendorId": vendor_oid, "orderStatus": "Delivered"})
    
    # 5. Revenue (Sum of subtotals of delivered orders)
    revenue_pipeline = [
        {"$match": {"vendorId": vendor_oid, "orderStatus": "Delivered"}},
        {"$group": {"_id": None, "revenue": {"$sum": "$subtotal"}}}
    ]
    res = list(db.orders.aggregate(revenue_pipeline))
    revenue = res[0]["revenue"] if res else 0.0

    # 6. Monthly Sales Chart (group vendor orders by month/year)
    months_map = {1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun",
                  7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec"}
    monthly_sales_pipeline = [
        {"$match": {"vendorId": vendor_oid, "orderStatus": "Delivered"}},
        {"$group": {
            "_id": {
                "year": {"$year": "$createdAt"},
                "month": {"$month": "$createdAt"}
            },
            "revenue": {"$sum": "$subtotal"}
        }},
        {"$sort": {"_id.year": 1, "_id.month": 1}}
    ]
    monthly_sales_res = list(db.orders.aggregate(monthly_sales_pipeline))
    monthly_sales = []
    for item in monthly_sales_res:
        m = item["_id"]["month"]
        y = item["_id"]["year"]
        monthly_sales.append({
            "label": f"{months_map.get(m, str(m))} {y}",
            "value": float(item["revenue"])
        })

    # 7. Order Status Distribution Chart
    status_pipeline = [
        {"$match": {"vendorId": vendor_oid}},
        {"$group": {
            "_id": "$orderStatus",
            "count": {"$sum": 1}
        }}
    ]
    status_res = list(db.orders.aggregate(status_pipeline))
    order_status = [{"status": item["_id"] or "Unknown", "count": item["count"]} for item in status_res]

    # 8. Top 5 Selling Products by total quantity sold
    top_products_pipeline = [
        {"$match": {"vendorId": vendor_oid}},
        {"$unwind": "$items"},
        {"$group": {
            "_id": "$items.productId",
            "productName": {"$first": "$items.productName"},
            "totalQty": {"$sum": "$items.quantity"}
        }},
        {"$sort": {"totalQty": -1}},
        {"$limit": 5}
    ]
    top_res = list(db.orders.aggregate(top_products_pipeline))
    top_products = [{"name": item["productName"], "qty": item["totalQty"]} for item in top_res]

    return jsonify({
        "dashboard": {
            "totalProducts": total_products,
            "totalOrders": total_orders,
            "pendingOrders": pending_orders,
            "completedOrders": completed_orders,
            "revenue": float(revenue),
            "monthlySales": monthly_sales,
            "orderStatus": order_status,
            "topProducts": top_products
        }
    }), 200


def get_vendor_products():
    """
    GET /vendor/products
    Retrieves all products created by this vendor.
    """
    db = get_db()
    vendor_oid = ObjectId(current_user.id)
    products_cursor = db.products.find({"vendorId": vendor_oid})
    products_list = [serialize_product(p) for p in products_cursor]
    return jsonify({"products": products_list}), 200

def create_vendor_product():
    """
    POST /vendor/products
    Creates a new product for this vendor.
    Validates duplicate names under the same vendor.
    """
    db = get_db()
    data = request.get_json() or {}
    
    required = ["productName", "description", "category", "price", "stock"]
    missing = get_missing_fields(data, required)
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400
        
    product_name = data.get("productName").strip()
    description = data.get("description").strip()
    category = data.get("category").strip()
    image = data.get("image", "").strip()
    
    try:
        price = float(data["price"])
        stock = int(data["stock"])
        if price < 0 or stock < 0:
            return jsonify({"error": "Price and stock must be positive numbers."}), 400
    except ValueError:
        return jsonify({"error": "Price must be a number and stock must be an integer."}), 400
        
    # Check duplicate product name for the same vendor
    vendor_oid = ObjectId(current_user.id)
    existing = db.products.find_one({
        "vendorId": vendor_oid,
        "productName": {"$regex": f"^{product_name}$", "$options": "i"}
    })
    if existing:
        return jsonify({"error": f"Duplicate product. You already have a product named '{product_name}'."}), 409
        
    # Check if category exists. If not, auto-create it to prevent orphans
    existing_category = db.categories.find_one({"categoryName": {"$regex": f"^{category}$", "$options": "i"}})
    if not existing_category:
        db.categories.insert_one({"categoryName": category, "image": ""})
        
    product_doc = create_product_doc(
        vendor_id=current_user.id,
        product_name=product_name,
        description=description,
        category=category,
        price=price,
        stock=stock,
        image=image
    )
    
    result = db.products.insert_one(product_doc)
    product_doc["_id"] = result.inserted_id
    
    return jsonify({
        "message": "Product created successfully.",
        "product": serialize_product(product_doc)
    }), 201

def update_vendor_product(product_id):
    """
    PUT /vendor/products/<id>
    Updates an existing product's fields. Verify ownership first.
    """
    db = get_db()
    try:
        prod_oid = ObjectId(product_id)
    except InvalidId:
        return jsonify({"error": "Invalid product ID format."}), 400
        
    vendor_oid = ObjectId(current_user.id)
    product = db.products.find_one({"_id": prod_oid})
    
    if not product:
        return jsonify({"error": "Product not found."}), 404
        
    # Ensure current vendor owns this product
    if product["vendorId"] != vendor_oid:
        return jsonify({"error": "Forbidden. You do not own this product."}), 403
        
    data = request.get_json() or {}
    
    update_data = {}
    if "productName" in data:
        name = data["productName"].strip()
        if not name:
            return jsonify({"error": "Product name cannot be empty."}), 400
            
        # Check duplicate if changing name
        if name.lower() != product["productName"].lower():
            existing = db.products.find_one({
                "vendorId": vendor_oid,
                "productName": {"$regex": f"^{name}$", "$options": "i"}
            })
            if existing:
                return jsonify({"error": "Duplicate product name. Another product with this name exists."}), 409
        update_data["productName"] = name
        
    if "description" in data:
        update_data["description"] = data["description"].strip()
        
    if "category" in data:
        cat = data["category"].strip()
        if not cat:
            return jsonify({"error": "Category cannot be empty."}), 400
        # Auto create category in categories collection if new
        existing_cat = db.categories.find_one({"categoryName": {"$regex": f"^{cat}$", "$options": "i"}})
        if not existing_cat:
            db.categories.insert_one({"categoryName": cat, "image": ""})
        update_data["category"] = cat
        
    if "price" in data:
        try:
            price = float(data["price"])
            if price < 0:
                return jsonify({"error": "Price must be non-negative."}), 400
            update_data["price"] = price
        except ValueError:
            return jsonify({"error": "Price must be a valid number."}), 400
            
    if "stock" in data:
        try:
            stock = int(data["stock"])
            if stock < 0:
                return jsonify({"error": "Stock must be non-negative."}), 400
            update_data["stock"] = stock
            # Sync stock availability
            update_data["isAvailable"] = stock > 0
        except ValueError:
            return jsonify({"error": "Stock must be a valid integer."}), 400
            
    if "image" in data:
        update_data["image"] = data["image"].strip()
        
    if "isAvailable" in data and "stock" not in data:
        # If toggling availability without stock updates, verify stock allows it
        is_avail = bool(data["isAvailable"])
        if is_avail and product.get("stock", 0) <= 0:
            return jsonify({"error": "Cannot mark product as available with 0 stock."}), 400
        update_data["isAvailable"] = is_avail
        
    if not update_data:
        return jsonify({"message": "No changes requested."}), 200
        
    update_data["updatedAt"] = datetime.datetime.utcnow()
    
    db.products.update_one({"_id": prod_oid}, {"$set": update_data})
    
    updated_product = db.products.find_one({"_id": prod_oid})
    return jsonify({
        "message": "Product updated successfully.",
        "product": serialize_product(updated_product)
    }), 200

def delete_vendor_product(product_id):
    """
    DELETE /vendor/products/<id>
    Deletes a vendor product. Verify ownership first.
    """
    db = get_db()
    try:
        prod_oid = ObjectId(product_id)
    except InvalidId:
        return jsonify({"error": "Invalid product ID format."}), 400
        
    vendor_oid = ObjectId(current_user.id)
    product = db.products.find_one({"_id": prod_oid})
    
    if not product:
        return jsonify({"error": "Product not found."}), 404
        
    if product["vendorId"] != vendor_oid:
        return jsonify({"error": "Forbidden. You do not own this product."}), 403
        
    db.products.delete_one({"_id": prod_oid})
    return jsonify({"message": "Product deleted successfully."}), 200

def get_vendor_orders():
    """
    GET /vendor/orders
    Retrieves all orders placed for this vendor's products.
    """
    db = get_db()
    vendor_oid = ObjectId(current_user.id)
    orders_cursor = db.orders.find({"vendorId": vendor_oid}).sort("createdAt", -1)
    orders_list = [serialize_order(o) for o in orders_cursor]
    return jsonify({"orders": orders_list}), 200

def update_vendor_order_status(order_id):
    """
    PUT /vendor/order/status/<id>
    Updates the status of an order (e.g. Confirmed, Packed, Delivered).
    Payload: { "status": "Confirmed" }
    """
    db = get_db()
    try:
        order_oid = ObjectId(order_id)
    except InvalidId:
        return jsonify({"error": "Invalid order ID format."}), 400
        
    vendor_oid = ObjectId(current_user.id)
    order = db.orders.find_one({"_id": order_oid})
    
    if not order:
        return jsonify({"error": "Order not found."}), 404
        
    if order["vendorId"] != vendor_oid:
        return jsonify({"error": "Forbidden. This order is not assigned to you."}), 403
        
    data = request.get_json() or {}
    new_status = data.get("status")
    
    valid_statuses = ["Pending", "Confirmed", "Packed", "Out For Delivery", "Delivered", "Cancelled"]
    if new_status not in valid_statuses:
        return jsonify({"error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"}), 400
        
    update_fields = {"orderStatus": new_status}
    
    # Automatically complete payment if order status becomes Delivered
    if new_status == "Delivered":
        update_fields["paymentStatus"] = "Completed"
        
    db.orders.update_one({"_id": order_oid}, {"$set": update_fields})
    
    updated_order = db.orders.find_one({"_id": order_oid})
    return jsonify({
        "message": f"Order status updated to '{new_status}' successfully.",
        "order": serialize_order(updated_order)
    }), 200
