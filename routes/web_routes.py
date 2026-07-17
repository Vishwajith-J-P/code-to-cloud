from flask import Blueprint, render_template

web_bp = Blueprint("web", __name__, template_folder="../templates", static_folder="../static")

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
