from bson import ObjectId
import datetime
import random

def serialize_order(order):
    """
    Serializes an order document from MongoDB.
    """
    if not order:
        return None
    return {
        "id": str(order["_id"]),
        "orderNumber": order.get("orderNumber"),
        "userId": str(order["userId"]),
        "vendorId": str(order["vendorId"]),
        "items": [
            {
                "productId": str(item["productId"]),
                "quantity": int(item["quantity"]),
                "price": float(item["price"]),
                "productName": item.get("productName", "")
            }
            for item in order.get("items", [])
        ],
        "subtotal": float(order.get("subtotal", 0.0)),
        "deliveryCharge": float(order.get("deliveryCharge", 0.0)),
        "totalAmount": float(order.get("totalAmount", 0.0)),
        "paymentMethod": order.get("paymentMethod", "COD"),
        "paymentStatus": order.get("paymentStatus", "Pending"),
        "orderStatus": order.get("orderStatus", "Pending"),
        "shippingAddress": order.get("shippingAddress", ""),
        "createdAt": order["createdAt"].isoformat() if isinstance(order.get("createdAt"), datetime.datetime) else order.get("createdAt")
    }

def generate_order_number():
    """
    Generates a unique order format: ORD-YYYYMMDD-XXXXXX
    """
    date_str = datetime.datetime.utcnow().strftime("%Y%m%d")
    random_digits = "".join([str(random.randint(0, 9)) for _ in range(6)])
    return f"ORD-{date_str}-{random_digits}"

def create_order_doc(user_id, vendor_id, items, subtotal, delivery_charge, payment_method, shipping_address):
    """
    Constructs a dictionary for order insertion.
    """
    now = datetime.datetime.utcnow()
    total_amount = subtotal + delivery_charge
    return {
        "orderNumber": generate_order_number(),
        "userId": ObjectId(user_id),
        "vendorId": ObjectId(vendor_id),
        "items": [
            {
                "productId": ObjectId(item["productId"]),
                "quantity": int(item["quantity"]),
                "price": float(item["price"]),
                "productName": item["productName"]
            }
            for item in items
        ],
        "subtotal": float(subtotal),
        "deliveryCharge": float(delivery_charge),
        "totalAmount": float(total_amount),
        "paymentMethod": payment_method.strip(),
        "paymentStatus": "Pending",  # Pending, Completed, Failed
        "orderStatus": "Pending",  # Pending, Confirmed, Packed, Out For Delivery, Delivered, Cancelled
        "shippingAddress": shipping_address.strip(),
        "createdAt": now
    }

ORDER_SCHEMA = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["orderNumber", "userId", "vendorId", "items", "subtotal", "deliveryCharge", "totalAmount", "paymentMethod", "paymentStatus", "orderStatus", "shippingAddress", "createdAt"],
        "properties": {
            "orderNumber": {
                "bsonType": "string",
                "pattern": "^ORD-\\d{8}-\\d{6}$",
                "description": "Must be an ORD-YYYYMMDD-XXXXXX format and is required"
            },
            "userId": {
                "bsonType": "objectId",
                "description": "Must be an ObjectId and is required"
            },
            "vendorId": {
                "bsonType": "objectId",
                "description": "Must be an ObjectId and is required"
            },
            "items": {
                "bsonType": "array",
                "items": {
                    "bsonType": "object",
                    "required": ["productId", "quantity", "price", "productName"],
                    "properties": {
                        "productId": {
                            "bsonType": "objectId"
                        },
                        "quantity": {
                            "bsonType": "int"
                        },
                        "price": {
                            "bsonType": "double"
                        },
                        "productName": {
                            "bsonType": "string"
                        }
                    }
                }
            },
            "subtotal": {
                "bsonType": "double"
            },
            "deliveryCharge": {
                "bsonType": "double"
            },
            "totalAmount": {
                "bsonType": "double"
            },
            "paymentMethod": {
                "bsonType": "string"
            },
            "paymentStatus": {
                "bsonType": "string",
                "enum": ["Pending", "Completed", "Failed"]
            },
            "orderStatus": {
                "bsonType": "string",
                "enum": ["Pending", "Confirmed", "Packed", "Out For Delivery", "Delivered", "Cancelled"]
            },
            "shippingAddress": {
                "bsonType": "string"
            },
            "createdAt": {
                "bsonType": "date"
            }
        }
    }
}

