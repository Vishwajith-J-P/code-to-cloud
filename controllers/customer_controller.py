from flask import request, jsonify
from flask_login import login_required, current_user
from bson import ObjectId
from bson.errors import InvalidId
import datetime

from services.db import get_db
from models.product import serialize_product
from models.category import serialize_category
from models.cart import serialize_cart
from models.order import serialize_order, create_order_doc
from models.review import serialize_review, create_review_doc
from utils.validators import get_missing_fields

def index():
    """
    GET /
    Welcome/Status endpoint.
    """
    return jsonify({
        "status": "online",
        "message": "Welcome to the Hyperlocal E-Commerce API Backend",
        "version": "1.0.0"
    }), 200

def get_products():
    """
    GET /products
    List all products that are available.
    """
    db = get_db()
    products_cursor = db.products.find({"isAvailable": True})
    products_list = [serialize_product(p) for p in products_cursor]
    return jsonify({"products": products_list}), 200

def get_product(product_id):
    """
    GET /product/<id>
    Gets a single product's details, including its reviews.
    """
    db = get_db()
    try:
        prod_obj_id = ObjectId(product_id)
    except InvalidId:
        return jsonify({"error": "Invalid product ID format."}), 400
        
    product = db.products.find_one({"_id": prod_obj_id})
    if not product:
        return jsonify({"error": "Product not found."}), 404
        
    serialized = serialize_product(product)
    
    # Retrieve product reviews
    reviews_cursor = db.reviews.find({"productId": prod_obj_id})
    reviews_list = [serialize_review(r) for r in reviews_cursor]
    serialized["reviews"] = reviews_list
    
    return jsonify({"product": serialized}), 200

def get_categories():
    """
    GET /categories
    List all product categories.
    """
    db = get_db()
    categories_cursor = db.categories.find()
    categories_list = [serialize_category(c) for c in categories_cursor]
    return jsonify({"categories": categories_list}), 200

def search():
    """
    GET /search?q=
    Search products by name or category.
    """
    db = get_db()
    q = request.args.get("q", "").strip()
    if not q:
        return jsonify({"error": "Search query parameter 'q' is required."}), 400
        
    # Search matches product name or category case-insensitively
    query_dict = {
        "isAvailable": True,
        "$or": [
            {"productName": {"$regex": q, "$options": "i"}},
            {"category": {"$regex": q, "$options": "i"}}
        ]
    }
    
    products_cursor = db.products.find(query_dict)
    results = [serialize_product(p) for p in products_cursor]
    return jsonify({"query": q, "results": results}), 200

def filter_products():
    """
    GET /filter
    Filters products by category, price range, and stock status.
    Query params: category, minPrice, maxPrice, inStock
    """
    db = get_db()
    query = {}
    
    category = request.args.get("category", "").strip()
    if category:
        query["category"] = {"$regex": category, "$options": "i"}
        
    min_price = request.args.get("minPrice")
    max_price = request.args.get("maxPrice")
    if min_price or max_price:
        price_filter = {}
        if min_price:
            try:
                price_filter["$gte"] = float(min_price)
            except ValueError:
                return jsonify({"error": "Invalid minPrice format."}), 400
        if max_price:
            try:
                price_filter["$lte"] = float(max_price)
            except ValueError:
                return jsonify({"error": "Invalid maxPrice format."}), 400
        query["price"] = price_filter
        
    in_stock = request.args.get("inStock")
    if in_stock:
        if in_stock.lower() == "true":
            query["stock"] = {"$gt": 0}
            query["isAvailable"] = True
        elif in_stock.lower() == "false":
            query["stock"] = 0
            
    products_cursor = db.products.find(query)
    results = [serialize_product(p) for p in products_cursor]
    return jsonify({"filters": request.args, "results": results}), 200

@login_required
def get_cart():
    """
    GET /cart
    Gets the current logged in user's cart, enriching product data dynamically.
    """
    db = get_db()
    user_oid = ObjectId(current_user.id)
    cart = db.carts.find_one({"userId": user_oid})
    
    if not cart:
        # Create empty cart if not found
        from models.cart import create_cart_doc
        cart = create_cart_doc(current_user.id)
        db.carts.insert_one(cart)
        
    # Enrich the items with current product metadata
    enriched_items = []
    total_price = 0.0
    cart_updated = False
    
    for item in cart.get("items", []):
        prod = db.products.find_one({"_id": item["productId"]})
        if prod:
            # Check price change and update if needed
            current_price = float(prod.get("price", 0.0))
            if current_price != item["price"]:
                item["price"] = current_price
                cart_updated = True
                
            enriched_items.append({
                "productId": str(item["productId"]),
                "productName": prod.get("productName"),
                "image": prod.get("image", ""),
                "quantity": item["quantity"],
                "price": current_price,
                "subtotal": current_price * item["quantity"],
                "stockAvailable": prod.get("stock", 0),
                "isAvailable": prod.get("isAvailable", True)
            })
            total_price += current_price * item["quantity"]
        else:
            # Product doesn't exist anymore; flag cart as updated to drop it
            cart_updated = True
            
    if cart_updated or total_price != cart.get("totalPrice", 0.0):
        # Clean out dead products from the db copy
        cleaned_items = [
            i for i in cart.get("items", []) 
            if db.products.find_one({"_id": i["productId"]}) is not None
        ]
        db.carts.update_one(
            {"userId": user_oid},
            {
                "$set": {
                    "items": cleaned_items,
                    "totalPrice": total_price,
                    "updatedAt": datetime.datetime.utcnow()
                }
            }
        )
        
    return jsonify({
        "cart": {
            "items": enriched_items,
            "totalPrice": total_price
        }
    }), 200

@login_required
def add_to_cart(productId):
    """
    POST /cart/add/<productId>
    Adds a product to the user's cart.
    Payload: { "quantity": 1 }
    """
    db = get_db()
    try:
        prod_oid = ObjectId(productId)
    except InvalidId:
        return jsonify({"error": "Invalid product ID format."}), 400
        
    data = request.get_json() or {}
    quantity = int(data.get("quantity", 1))
    if quantity <= 0:
        return jsonify({"error": "Quantity must be greater than zero."}), 400
        
    product = db.products.find_one({"_id": prod_oid})
    if not product:
        return jsonify({"error": "Product not found."}), 404
        
    if not product.get("isAvailable", True) or product.get("stock", 0) <= 0:
        return jsonify({"error": "Product is currently out of stock."}), 400
        
    user_oid = ObjectId(current_user.id)
    cart = db.carts.find_one({"userId": user_oid})
    if not cart:
        from models.cart import create_cart_doc
        cart = create_cart_doc(current_user.id)
        db.carts.insert_one(cart)
        
    items = cart.get("items", [])
    
    # Check if item is already in the cart
    existing_item = None
    for item in items:
        if item["productId"] == prod_oid:
            existing_item = item
            break
            
    if existing_item:
        new_qty = existing_item["quantity"] + quantity
        if new_qty > product.get("stock", 0):
            return jsonify({"error": f"Cannot add. Total quantity ({new_qty}) exceeds available stock ({product.get('stock')})."}), 400
        existing_item["quantity"] = new_qty
        existing_item["price"] = float(product.get("price"))
    else:
        if quantity > product.get("stock", 0):
            return jsonify({"error": f"Cannot add. Quantity ({quantity}) exceeds available stock ({product.get('stock')})."}), 400
        items.append({
            "productId": prod_oid,
            "quantity": quantity,
            "price": float(product.get("price"))
        })
        
    # Recalculate total
    total_price = sum(i["quantity"] * i["price"] for i in items)
    
    db.carts.update_one(
        {"userId": user_oid},
        {
            "$set": {
                "items": items,
                "totalPrice": total_price,
                "updatedAt": datetime.datetime.utcnow()
            }
        }
    )
    
    return jsonify({"message": "Product added to cart successfully.", "cartTotalPrice": total_price}), 200

@login_required
def update_cart():
    """
    PUT /cart/update
    Updates the quantity of an item in the cart.
    Payload: { "productId": "...", "quantity": 5 }
    """
    db = get_db()
    data = request.get_json() or {}
    
    required = ["productId", "quantity"]
    missing = get_missing_fields(data, required)
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400
        
    product_id = data.get("productId")
    try:
        prod_oid = ObjectId(product_id)
    except InvalidId:
        return jsonify({"error": "Invalid product ID format."}), 400
        
    quantity = int(data.get("quantity"))
    
    user_oid = ObjectId(current_user.id)
    cart = db.carts.find_one({"userId": user_oid})
    if not cart:
        return jsonify({"error": "Cart is empty."}), 400
        
    items = cart.get("items", [])
    
    # If quantity is <= 0, remove the item
    if quantity <= 0:
        items = [i for i in items if i["productId"] != prod_oid]
    else:
        product = db.products.find_one({"_id": prod_oid})
        if not product:
            return jsonify({"error": "Product not found."}), 404
            
        if quantity > product.get("stock", 0):
            quantity = product.get("stock", 0)
            
        # Find item and update
        found = False
        for item in items:
            if item["productId"] == prod_oid:
                item["quantity"] = quantity
                item["price"] = float(product.get("price"))
                found = True
                break
        if not found:
            return jsonify({"error": "Product not in cart."}), 404
            
    total_price = sum(i["quantity"] * i["price"] for i in items)
    db.carts.update_one(
        {"userId": user_oid},
        {
            "$set": {
                "items": items,
                "totalPrice": total_price,
                "updatedAt": datetime.datetime.utcnow()
            }
        }
    )
    
    return jsonify({"message": "Cart updated successfully.", "cartTotalPrice": total_price}), 200

@login_required
def remove_from_cart(productId):
    """
    DELETE /cart/remove/<productId>
    Removes a product from the user's cart.
    """
    db = get_db()
    try:
        prod_oid = ObjectId(productId)
    except InvalidId:
        return jsonify({"error": "Invalid product ID format."}), 400
        
    user_oid = ObjectId(current_user.id)
    cart = db.carts.find_one({"userId": user_oid})
    if not cart:
        return jsonify({"error": "Cart not found."}), 404
        
    items = cart.get("items", [])
    # Filter out item
    new_items = [i for i in items if i["productId"] != prod_oid]
    
    if len(new_items) == len(items):
        return jsonify({"error": "Product not found in cart."}), 404
        
    total_price = sum(i["quantity"] * i["price"] for i in new_items)
    db.carts.update_one(
        {"userId": user_oid},
        {
            "$set": {
                "items": new_items,
                "totalPrice": total_price,
                "updatedAt": datetime.datetime.utcnow()
            }
        }
    )
    return jsonify({"message": "Product removed from cart.", "cartTotalPrice": total_price}), 200

@login_required
def checkout():
    """
    POST /checkout
    Checks out the user's cart. Validates stock, splits orders by vendor,
    reduces stock atomically, updates product availability status, creates orders,
    and empties the user's cart.
    Payload: { "paymentMethod": "COD", "shippingAddress": "123 Main St" }
    """
    db = get_db()
    data = request.get_json() or {}
    
    required = ["paymentMethod", "shippingAddress"]
    missing = get_missing_fields(data, required)
    if missing:
        return jsonify({"error": f"Missing checkout fields: {', '.join(missing)}"}), 400
        
    payment_method = data.get("paymentMethod")
    shipping_address = data.get("shippingAddress")
    
    user_oid = ObjectId(current_user.id)
    cart = db.carts.find_one({"userId": user_oid})
    
    if not cart or not cart.get("items"):
        return jsonify({"error": "Checkout failed. Your cart is empty."}), 400
        
    cart_items = cart["items"]
    
    # 1. First Pass: Validate stock availability for all items
    vendor_groups = {} # vendorId (string) -> list of cart items
    product_cache = {}
    
    for item in cart_items:
        prod_oid = item["productId"]
        product = db.products.find_one({"_id": prod_oid})
        
        if not product:
            return jsonify({"error": f"Product with ID {prod_oid} no longer exists."}), 400
            
        if not product.get("isAvailable", True) or product.get("stock", 0) < item["quantity"]:
            return jsonify({
                "error": f"Insufficient stock for '{product.get('productName')}'. "
                         f"Requested: {item['quantity']}, Available: {product.get('stock', 0)}."
            }), 400
            
        product_cache[prod_oid] = product
        
        # Group by vendor
        vendor_id_str = str(product["vendorId"])
        if vendor_id_str not in vendor_groups:
            vendor_groups[vendor_id_str] = []
            
        # Store items with productName for inclusion in order items
        vendor_groups[vendor_id_str].append({
            "productId": prod_oid,
            "quantity": item["quantity"],
            "price": float(product.get("price")),
            "productName": product.get("productName")
        })
        
    # 2. Second Pass: Perform atomic stock updates & create orders
    created_orders = []
    
    for vendor_id_str, items in vendor_groups.items():
        subtotal = sum(i["quantity"] * i["price"] for i in items)
        delivery_charge = 5.00  # Flat delivery charge per vendor order
        
        # Deduct stock atomically and check if the stock remains sufficient
        for item in items:
            prod_oid = item["productId"]
            qty = item["quantity"]
            
            # Atomic update matching sufficient stock
            res = db.products.update_one(
                {"_id": prod_oid, "stock": {"$gte": qty}},
                {"$inc": {"stock": -qty}, "$set": {"updatedAt": datetime.datetime.utcnow()}}
            )
            
            if res.modified_count == 0:
                # Stock check failed in a race condition. Since we don't have multi-doc transactions
                # easily available, we'll try to rollback already-decremented stock in this order session.
                # (Normally, Atlas uses transactions, but for local/flat setups, simple atomic lock is safe).
                # We revert what we did for this vendor group so far
                for rollback_item in items:
                    if rollback_item == item:
                        break # stop rollback at the current item
                    db.products.update_one(
                        {"_id": rollback_item["productId"]},
                        {"$inc": {"stock": rollback_item["quantity"]}}
                    )
                return jsonify({"error": "Checkout process encountered a stock updates conflict. Please try again."}), 409
                
            # If stock reaches 0, update availability status
            updated_prod = db.products.find_one({"_id": prod_oid})
            if updated_prod and updated_prod.get("stock", 0) <= 0:
                db.products.update_one({"_id": prod_oid}, {"$set": {"isAvailable": False}})
                
        # Create order document
        order_doc = create_order_doc(
            user_id=current_user.id,
            vendor_id=vendor_id_str,
            items=items,
            subtotal=subtotal,
            delivery_charge=delivery_charge,
            payment_method=payment_method,
            shipping_address=shipping_address
        )
        
        db.orders.insert_one(order_doc)
        created_orders.append(serialize_order(order_doc))
        
    # 3. Empty user's cart
    db.carts.update_one(
        {"userId": user_oid},
        {
            "$set": {
                "items": [],
                "totalPrice": 0.0,
                "updatedAt": datetime.datetime.utcnow()
            }
        }
    )
    
    return jsonify({
        "message": "Checkout successful. Order(s) created.",
        "orders": created_orders
    }), 201

@login_required
def get_orders():
    """
    GET /orders
    Retrieves all orders placed by the current user.
    """
    db = get_db()
    user_oid = ObjectId(current_user.id)
    orders_cursor = db.orders.find({"userId": user_oid}).sort("createdAt", -1)
    orders_list = [serialize_order(o) for o in orders_cursor]
    return jsonify({"orders": orders_list}), 200

@login_required
def get_order(order_id):
    """
    GET /order/<id>
    Retrieves details of a single order.
    """
    db = get_db()
    try:
        order_oid = ObjectId(order_id)
    except InvalidId:
        return jsonify({"error": "Invalid order ID format."}), 400
        
    order = db.orders.find_one({"_id": order_oid})
    if not order:
        return jsonify({"error": "Order not found."}), 404
        
    # Ensure this order belongs to the user
    if order["userId"] != ObjectId(current_user.id):
        return jsonify({"error": "Forbidden. You do not own this order."}), 403
        
    return jsonify({"order": serialize_order(order)}), 200

@login_required
def add_review(product_id):
    """
    POST /product/<id>/review
    Optional custom helper route to leave a review.
    Payload: { "rating": 5, "review": "Excellent quality!" }
    """
    db = get_db()
    try:
        prod_oid = ObjectId(product_id)
    except InvalidId:
        return jsonify({"error": "Invalid product ID format."}), 400
        
    # Check product exists
    product = db.products.find_one({"_id": prod_oid})
    if not product:
        return jsonify({"error": "Product not found."}), 404
        
    data = request.get_json() or {}
    required = ["rating", "review"]
    missing = get_missing_fields(data, required)
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400
        
    try:
        rating = int(data["rating"])
        if rating < 1 or rating > 5:
            return jsonify({"error": "Rating must be an integer between 1 and 5."}), 400
    except ValueError:
        return jsonify({"error": "Rating must be an integer."}), 400
        
    review_text = data["review"]
    
    review_doc = create_review_doc(product_id, current_user.id, rating, review_text)
    db.reviews.insert_one(review_doc)
    
    return jsonify({
        "message": "Review submitted successfully.",
        "review": serialize_review(review_doc)
    }), 201
