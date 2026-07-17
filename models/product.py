from bson import ObjectId
import datetime

def serialize_product(product):
    """
    Serializes a product document from MongoDB to a JSON-compatible dictionary.
    """
    if not product:
        return None
    return {
        "id": str(product["_id"]),
        "vendorId": str(product["vendorId"]),
        "productName": product.get("productName"),
        "description": product.get("description", ""),
        "category": product.get("category"),
        "price": float(product.get("price", 0.0)),
        "stock": int(product.get("stock", 0)),
        "image": product.get("image", ""),
        "isAvailable": bool(product.get("isAvailable", True)),
        "createdAt": product["createdAt"].isoformat() if isinstance(product.get("createdAt"), datetime.datetime) else product.get("createdAt"),
        "updatedAt": product["updatedAt"].isoformat() if isinstance(product.get("updatedAt"), datetime.datetime) else product.get("updatedAt")
    }

def create_product_doc(vendor_id, product_name, description, category, price, stock, image=""):
    """
    Constructs a dictionary for product insertion.
    """
    now = datetime.datetime.utcnow()
    stock_val = int(stock)
    return {
        "vendorId": ObjectId(vendor_id),
        "productName": product_name.strip(),
        "description": description.strip(),
        "category": category.strip(),
        "price": float(price),
        "stock": stock_val,
        "image": image.strip() if image else "",
        "isAvailable": stock_val > 0,
        "createdAt": now,
        "updatedAt": now
    }

PRODUCT_SCHEMA = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["vendorId", "productName", "category", "price", "stock", "isAvailable", "createdAt", "updatedAt"],
        "properties": {
            "vendorId": {
                "bsonType": "objectId",
                "description": "Must be an ObjectId and is required"
            },
            "productName": {
                "bsonType": "string",
                "description": "Must be a string and is required"
            },
            "description": {
                "bsonType": "string",
                "description": "Must be a string"
            },
            "category": {
                "bsonType": "string",
                "description": "Must be a string and is required"
            },
            "price": {
                "bsonType": "double",
                "description": "Must be a double and is required"
            },
            "stock": {
                "bsonType": "int",
                "description": "Must be an integer and is required"
            },
            "image": {
                "bsonType": "string",
                "description": "Must be a string"
            },
            "isAvailable": {
                "bsonType": "bool",
                "description": "Must be a boolean and is required"
            },
            "createdAt": {
                "bsonType": "date",
                "description": "Must be a date and is required"
            },
            "updatedAt": {
                "bsonType": "date",
                "description": "Must be a date and is required"
            }
        }
    }
}

