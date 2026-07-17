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
