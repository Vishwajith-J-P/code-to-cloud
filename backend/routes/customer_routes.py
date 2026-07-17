from flask import Blueprint
from controllers.customer_controller import (
    index, get_products, get_product, get_categories, search, filter_products,
    get_cart, add_to_cart, update_cart, remove_from_cart, checkout, get_orders, get_order, add_review
)

customer_bp = Blueprint("customer", __name__)

customer_bp.route("/", methods=["GET"])(index)
customer_bp.route("/products", methods=["GET"])(get_products)
customer_bp.route("/product/<product_id>", methods=["GET"])(get_product)
customer_bp.route("/categories", methods=["GET"])(get_categories)
customer_bp.route("/search", methods=["GET"])(search)
customer_bp.route("/filter", methods=["GET"])(filter_products)

# Cart Management
customer_bp.route("/cart", methods=["GET"])(get_cart)
customer_bp.route("/cart/add/<productId>", methods=["POST"])(add_to_cart)
customer_bp.route("/cart/update", methods=["PUT"])(update_cart)
customer_bp.route("/cart/remove/<productId>", methods=["DELETE"])(remove_from_cart)

# Checkout and Orders
customer_bp.route("/checkout", methods=["POST"])(checkout)
customer_bp.route("/orders", methods=["GET"])(get_orders)
customer_bp.route("/order/<order_id>", methods=["GET"])(get_order)

# Product Review
customer_bp.route("/product/<product_id>/review", methods=["POST"])(add_review)
