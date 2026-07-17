from flask import Blueprint, render_template, redirect, url_for, request
from flask_login import current_user
from functools import wraps
from bson import ObjectId
import datetime

from services.db import get_db
from models.user import User
from models.product import serialize_product
from models.order import serialize_order
from models.category import serialize_category
from models.review import serialize_review

web_bp = Blueprint("web", __name__, template_folder="../templates", static_folder="../static")

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or getattr(current_user, 'role', None) != 'admin':
            return redirect('/admin/login')
        return f(*args, **kwargs)
    return decorated_function

def vendor_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or getattr(current_user, 'role', None) != 'vendor':
            return redirect('/vendor/login')
        return f(*args, **kwargs)
    return decorated_function

@web_bp.route("/")
def home():
    if current_user.is_authenticated:
        if getattr(current_user, 'role', None) == 'admin':
            return redirect('/admin/dashboard')
        elif getattr(current_user, 'role', None) == 'vendor':
            return redirect('/vendor/dashboard')
            
    return redirect(url_for('web.products'))

@web_bp.route("/login")
def login():
    if current_user.is_authenticated:
        if getattr(current_user, 'role', None) == 'admin':
            return redirect('/admin/dashboard')
        elif getattr(current_user, 'role', None) == 'vendor':
            return redirect('/vendor/dashboard')
        return redirect('/')
    return render_template("login.html")

@web_bp.route("/register")
def register():
    if current_user.is_authenticated:
        return redirect('/')
    return render_template("register.html")

@web_bp.route("/products")
def products():
    db = get_db()
    cat_filter = request.args.get("category", "")
    search_q = request.args.get("search", "")
    
    query = {"isAvailable": True}
    if cat_filter:
        query["category"] = cat_filter
    if search_q:
        query["$or"] = [
            {"productName": {"$regex": search_q, "$options": "i"}},
            {"description": {"$regex": search_q, "$options": "i"}}
        ]
        
    products_list = [serialize_product(p) for p in db.products.find(query)]
    categories = [serialize_category(c) for c in db.categories.find()]
    return render_template("products.html", products=products_list, categories=categories, active_category=cat_filter, search_query=search_q)

@web_bp.route("/product/<product_id>")
def product_details(product_id):
    db = get_db()
    try:
        prod = db.products.find_one({"_id": ObjectId(product_id)})
    except Exception:
        prod = None
    if not prod:
        return redirect(url_for("web.products"))
        
    s_product = serialize_product(prod)
    
    vendor = db.users.find_one({"_id": ObjectId(prod.get("vendorId"))})
    vendor_name = vendor.get("fullName") if vendor else "Local Merchant"
    
    reviews = [serialize_review(r) for r in db.reviews.find({"productId": ObjectId(product_id)})]
    return render_template("product_details.html", product=s_product, vendor_name=vendor_name, reviews=reviews)

@web_bp.route("/cart")
def cart():
    if not current_user.is_authenticated:
        return redirect(url_for("web.login"))
    db = get_db()
    cart_doc = db.carts.find_one({"userId": ObjectId(current_user.id)})
    items = []
    subtotal = 0.0
    if cart_doc:
        for it in cart_doc.get("items", []):
            p = db.products.find_one({"_id": ObjectId(it["productId"])})
            if p:
                sp = serialize_product(p)
                qty = it["quantity"]
                item_total = sp["price"] * qty
                subtotal += item_total
                items.append({
                    "product": sp,
                    "quantity": qty,
                    "total": item_total
                })
    delivery = 5.00 if items else 0.0
    total = subtotal + delivery
    return render_template("cart.html", items=items, subtotal=subtotal, delivery=delivery, total=total)

@web_bp.route("/checkout")
def checkout():
    if not current_user.is_authenticated:
        return redirect(url_for("web.login"))
    db = get_db()
    cart_doc = db.carts.find_one({"userId": ObjectId(current_user.id)})
    items = []
    subtotal = 0.0
    if cart_doc:
        for it in cart_doc.get("items", []):
            p = db.products.find_one({"_id": ObjectId(it["productId"])})
            if p:
                sp = serialize_product(p)
                qty = it["quantity"]
                item_total = sp["price"] * qty
                subtotal += item_total
                items.append({
                    "product": sp,
                    "quantity": qty,
                    "total": item_total
                })
    delivery = 5.00 if items else 0.0
    total = subtotal + delivery
    return render_template("checkout.html", items=items, subtotal=subtotal, delivery=delivery, total=total, user=current_user.to_json())

@web_bp.route("/orders")
def orders():
    if not current_user.is_authenticated:
        return redirect(url_for("web.login"))
    db = get_db()
    orders_list = [serialize_order(o) for o in db.orders.find({"userId": ObjectId(current_user.id)}).sort("createdAt", -1)]
    return render_template("orders.html", orders=orders_list)

@web_bp.route("/profile")
def profile():
    if not current_user.is_authenticated:
        return redirect(url_for("web.login"))
    return render_template("profile.html", user=current_user.to_json())

# Admin Dashboard Template Routes
@web_bp.route("/admin/login")
def admin_login():
    if current_user.is_authenticated and getattr(current_user, 'role', None) == 'admin':
        return redirect('/admin/dashboard')
    return render_template("admin/login.html")

@web_bp.route("/admin/dashboard")
@admin_required
def admin_dashboard():
    db = get_db()
    total_customers = db.users.count_documents({"role": "customer"})
    total_vendors = db.users.count_documents({"role": "vendor"})
    total_products = db.products.count_documents({})
    total_orders = db.orders.count_documents({})
    
    res = list(db.orders.aggregate([
        {"$match": {"orderStatus": "Delivered"}},
        {"$group": {"_id": None, "revenue": {"$sum": "$totalAmount"}}}
    ]))
    revenue = res[0]["revenue"] if res else 0.0
    
    recent_orders = [serialize_order(o) for o in db.orders.find().sort("createdAt", -1).limit(5)]
    recent_customers = [User(u).to_json() for u in db.users.find({"role": "customer"}).sort("createdAt", -1).limit(5)]
    recent_vendors = [User(u).to_json() for u in db.users.find({"role": "vendor"}).sort("createdAt", -1).limit(5)]
    recent_products = [serialize_product(p) for p in db.products.find().sort("createdAt", -1).limit(5)]
    
    return render_template("admin/dashboard.html", 
                           total_customers=total_customers,
                           total_vendors=total_vendors,
                           total_products=total_products,
                           total_orders=total_orders,
                           revenue=revenue,
                           recent_orders=recent_orders,
                           recent_customers=recent_customers,
                           recent_vendors=recent_vendors,
                           recent_products=recent_products)

@web_bp.route("/admin/customers")
@admin_required
def admin_customers():
    db = get_db()
    customers = [User(u).to_json() for u in db.users.find({"role": "customer"})]
    return render_template("admin/customers.html", customers=customers)

@web_bp.route("/admin/vendors")
@admin_required
def admin_vendors():
    db = get_db()
    vendors = [User(u).to_json() for u in db.users.find({"role": "vendor"})]
    return render_template("admin/vendors.html", vendors=vendors)

@web_bp.route("/admin/products")
@admin_required
def admin_products():
    db = get_db()
    products_list = [serialize_product(p) for p in db.products.find()]
    return render_template("admin/products.html", products=products_list)

@web_bp.route("/admin/orders")
@admin_required
def admin_orders():
    db = get_db()
    orders_list = [serialize_order(o) for o in db.orders.find().sort("createdAt", -1)]
    return render_template("admin/orders.html", orders=orders_list)

@web_bp.route("/admin/categories")
@admin_required
def admin_categories():
    db = get_db()
    categories = []
    for c in db.categories.find():
        sc = serialize_category(c)
        sc["productCount"] = db.products.count_documents({"category": sc["categoryName"]})
        categories.append(sc)
    return render_template("admin/categories.html", categories=categories)

# Vendor UI Routes
@web_bp.route("/vendor/dashboard")
@vendor_required
def vendor_dashboard():
    db = get_db()
    vendor_id = ObjectId(current_user.id)
    total_products = db.products.count_documents({"vendorId": vendor_id})
    total_orders = db.orders.count_documents({"vendorId": vendor_id})
    
    res = list(db.orders.aggregate([
        {"$match": {"vendorId": vendor_id, "orderStatus": "Delivered"}},
        {"$group": {"_id": None, "revenue": {"$sum": "$totalAmount"}}}
    ]))
    revenue = res[0]["revenue"] if res else 0.0
    
    recent_orders = [serialize_order(o) for o in db.orders.find({"vendorId": vendor_id}).sort("createdAt", -1).limit(5)]
    return render_template("vendor/dashboard.html",
                           total_products=total_products,
                           total_orders=total_orders,
                           revenue=revenue,
                           recent_orders=recent_orders)

@web_bp.route("/vendor/products")
@vendor_required
def vendor_products():
    db = get_db()
    products_list = [serialize_product(p) for p in db.products.find({"vendorId": ObjectId(current_user.id)})]
    return render_template("vendor/products.html", products=products_list)

@web_bp.route("/vendor/products/add")
@vendor_required
def vendor_products_add():
    db = get_db()
    categories = [serialize_category(c) for c in db.categories.find()]
    return render_template("vendor/add_product.html", categories=categories)

@web_bp.route("/vendor/products/edit/<product_id>")
@vendor_required
def vendor_products_edit(product_id):
    db = get_db()
    try:
        prod = db.products.find_one({"_id": ObjectId(product_id)})
    except Exception:
        prod = None
    if not prod:
        return redirect(url_for("web.vendor_products"))
    s_product = serialize_product(prod)
    categories = [serialize_category(c) for c in db.categories.find()]
    return render_template("vendor/edit_product.html", product=s_product, categories=categories)

@web_bp.route("/vendor/orders")
@vendor_required
def vendor_orders():
    db = get_db()
    orders_list = [serialize_order(o) for o in db.orders.find({"vendorId": ObjectId(current_user.id)}).sort("createdAt", -1)]
    return render_template("vendor/orders.html", orders=orders_list)

@web_bp.route("/vendor/profile")
@vendor_required
def vendor_profile():
    return render_template("vendor/profile.html", user=current_user.to_json())

@web_bp.route("/vendor/login")
def vendor_login():
    if current_user.is_authenticated and getattr(current_user, 'role', None) == 'vendor':
        return redirect('/vendor/dashboard')
    return render_template("vendor/login.html")
