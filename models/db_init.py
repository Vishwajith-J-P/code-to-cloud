from models.user import USER_SCHEMA
from models.product import PRODUCT_SCHEMA
from models.category import CATEGORY_SCHEMA
from models.cart import CART_SCHEMA
from models.order import ORDER_SCHEMA
from models.review import REVIEW_SCHEMA

def setup_database(db):
    """
    Sets up validation rules and unique indexes for all collections.
    Supports graceful fallbacks for MongoDB Atlas clusters with permission limits.
    """
    schemas = {
        "users": USER_SCHEMA,
        "products": PRODUCT_SCHEMA,
        "categories": CATEGORY_SCHEMA,
        "carts": CART_SCHEMA,
        "orders": ORDER_SCHEMA,
        "reviews": REVIEW_SCHEMA
    }
    
    # 1. Ensure all collections exist with validation constraints
    existing_collections = db.list_collection_names()
    for col_name, schema in schemas.items():
        try:
            if col_name not in existing_collections:
                db.create_collection(col_name, validator=schema)
            else:
                db.command("collMod", col_name, validator=schema)
        except Exception as e:
            import sys
            print(f"Warning: Could not set schema validator for collection '{col_name}': {e}", file=sys.stderr)
            
    # 2. Re-verify unique indexing constraints
    try:
        db.users.create_index("email", unique=True)
        db.categories.create_index("categoryName", unique=True)
    except Exception as e:
        import sys
        print(f"Warning: Could not create unique indexes: {e}", file=sys.stderr)
