from flask import Blueprint
from middlewares.auth_middleware import role_required
from controllers.vendor_controller import (
    get_vendor_dashboard, get_vendor_products, create_vendor_product,
    update_vendor_product, delete_vendor_product, get_vendor_orders, update_vendor_order_status
)

vendor_bp = Blueprint("vendor", __name__)

# Apply vendor role required decorator to all vendor routes
@vendor_bp.before_request
@role_required("vendor")
def before_vendor_request():
    pass

vendor_bp.route("/vendor/dashboard", methods=["GET"])(get_vendor_dashboard)
vendor_bp.route("/vendor/products", methods=["GET"])(get_vendor_products)
vendor_bp.route("/vendor/products", methods=["POST"])(create_vendor_product)
vendor_bp.route("/vendor/products/<product_id>", methods=["PUT"])(update_vendor_product)
vendor_bp.route("/vendor/products/<product_id>", methods=["DELETE"])(delete_vendor_product)
vendor_bp.route("/vendor/orders", methods=["GET"])(get_vendor_orders)
vendor_bp.route("/vendor/order/status/<order_id>", methods=["PUT"])(update_vendor_order_status)
