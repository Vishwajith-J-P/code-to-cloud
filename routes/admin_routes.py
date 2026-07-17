from flask import Blueprint
from middlewares.auth_middleware import role_required
from controllers.admin_controller import (
    get_admin_dashboard, get_admin_users, get_admin_vendors, get_admin_products,
    get_admin_orders, delete_admin_user, delete_admin_vendor, delete_admin_product
)

admin_bp = Blueprint("admin", __name__)

# Apply admin role required decorator to all admin routes
@admin_bp.before_request
@role_required("admin")
def before_admin_request():
    pass

admin_bp.route("/admin/dashboard", methods=["GET"])(get_admin_dashboard)
admin_bp.route("/admin/users", methods=["GET"])(get_admin_users)
admin_bp.route("/admin/vendors", methods=["GET"])(get_admin_vendors)
admin_bp.route("/admin/products", methods=["GET"])(get_admin_products)
admin_bp.route("/admin/orders", methods=["GET"])(get_admin_orders)
admin_bp.route("/admin/user/<user_id>", methods=["DELETE"])(delete_admin_user)
admin_bp.route("/admin/vendor/<vendor_id>", methods=["DELETE"])(delete_admin_vendor)
admin_bp.route("/admin/product/<product_id>", methods=["DELETE"])(delete_admin_product)
