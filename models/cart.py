from bson import ObjectId
import datetime

def serialize_cart(cart):
    """
    Serializes a cart document from MongoDB.
    """
    if not cart:
        return {
            "items": [],
            "totalPrice": 0.0,
            "updatedAt": None
        }
    return {
        "id": str(cart["_id"]),
        "userId": str(cart["userId"]),
        "items": [
            {
                "productId": str(item["productId"]),
                "quantity": int(item["quantity"]),
                "price": float(item["price"])
            }
            for item in cart.get("items", [])
        ],
        "totalPrice": float(cart.get("totalPrice", 0.0)),
        "updatedAt": cart["updatedAt"].isoformat() if isinstance(cart.get("updatedAt"), datetime.datetime) else cart.get("updatedAt")
    }

def create_cart_doc(user_id):
    """
    Constructs an empty cart for a new user.
    """
    return {
        "userId": ObjectId(user_id),
        "items": [],
        "totalPrice": 0.0,
        "updatedAt": datetime.datetime.utcnow()
    }

CART_SCHEMA = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["userId", "items", "totalPrice", "updatedAt"],
        "properties": {
            "userId": {
                "bsonType": "objectId",
                "description": "Must be an ObjectId and is required"
            },
            "items": {
                "bsonType": "array",
                "description": "Must be an array of cart items",
                "items": {
                    "bsonType": "object",
                    "required": ["productId", "quantity", "price"],
                    "properties": {
                        "productId": {
                            "bsonType": "objectId",
                            "description": "Must be an ObjectId and is required"
                        },
                        "quantity": {
                            "bsonType": "int",
                            "description": "Must be an integer and is required"
                        },
                        "price": {
                            "bsonType": "double",
                            "description": "Must be a double and is required"
                        }
                    }
                }
            },
            "totalPrice": {
                "bsonType": "double",
                "description": "Must be a double and is required"
            },
            "updatedAt": {
                "bsonType": "date",
                "description": "Must be a date and is required"
            }
        }
    }
}

