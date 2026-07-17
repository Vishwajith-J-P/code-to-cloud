from flask import Blueprint, render_template, redirect, url_for
from flask_login import current_user
from functools import wraps

web_bp = Blueprint("web", __name__, template_folder="../templates", static_folder="../static")

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or getattr(current_user, 'role', None) != 'admin':
            return redirect('/admin/login')
        return f(*args, **kwargs)
    return decorated_function

@web_bp.route("/")
def home():
    return render_template("home.html")

@web_bp.route("/login")
def login():
    return render_template("login.html")

@web_bp.route("/register")
def register():
    return render_template("register.html")

@web_bp.route("/products")
def products():
    return render_template("products.html")

@web_bp.route("/product/<product_id>")
def product_details(product_id):
    return render_template("product_details.html", product_id=product_id)

@web_bp.route("/cart")
def cart():
    return render_template("cart.html")

@web_bp.route("/checkout")
def checkout():
    return render_template("checkout.html")

@web_bp.route("/orders")
def orders():
    return render_template("orders.html")

@web_bp.route("/profile")
def profile():
    return render_template("profile.html")

# Admin Dashboard Template Routes
@web_bp.route("/admin/login")
def admin_login():
    if current_user.is_authenticated and getattr(current_user, 'role', None) == 'admin':
        return redirect('/admin/dashboard')
    return render_template("admin/login.html")

@web_bp.route("/admin/dashboard")
@admin_required
def admin_dashboard():
    return render_template("admin/dashboard.html")

@web_bp.route("/admin/customers")
@admin_required
def admin_customers():
    return render_template("admin/customers.html")

@web_bp.route("/admin/vendors")
@admin_required
def admin_vendors():
    return render_template("admin/vendors.html")

@web_bp.route("/admin/products")
@admin_required
def admin_products():
    return render_template("admin/products.html")

@web_bp.route("/admin/orders")
@admin_required
def admin_orders():
    return render_template("admin/orders.html")

@web_bp.route("/admin/categories")
@admin_required
def admin_categories():
    return render_template("admin/categories.html")

# Vendor UI Routes
@web_bp.route("/vendor/dashboard")
def vendor_dashboard():
    return render_template("vendor/dashboard.html")

@web_bp.route("/vendor/products")
def vendor_products():
    return render_template("vendor/products.html")

@web_bp.route("/vendor/products/add")
def vendor_products_add():
    return render_template("vendor/add_product.html")

@web_bp.route("/vendor/products/edit/<product_id>")
def vendor_products_edit(product_id):
    return render_template("vendor/edit_product.html")

@web_bp.route("/vendor/orders")
def vendor_orders():
    return render_template("vendor/orders.html")

@web_bp.route("/vendor/profile")
def vendor_profile():
    return render_template("vendor/profile.html")

