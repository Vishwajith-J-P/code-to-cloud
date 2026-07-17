from bson import ObjectId
import datetime

def serialize_review(review):
    """
    Serializes a review document.
    """
    if not review:
        return None
    return {
        "id": str(review["_id"]),
        "productId": str(review["productId"]),
        "userId": str(review["userId"]),
        "rating": int(review.get("rating", 0)),
        "review": review.get("review", ""),
        "createdAt": review["createdAt"].isoformat() if isinstance(review.get("createdAt"), datetime.datetime) else review.get("createdAt")
    }

def create_review_doc(product_id, user_id, rating, review_text):
    """
    Constructs a dictionary for review insertion.
    """
    return {
        "productId": ObjectId(product_id),
        "userId": ObjectId(user_id),
        "rating": int(rating),
        "review": review_text.strip(),
        "createdAt": datetime.datetime.utcnow()
    }

REVIEW_SCHEMA = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["productId", "userId", "rating", "review", "createdAt"],
        "properties": {
            "productId": {
                "bsonType": "objectId"
            },
            "userId": {
                "bsonType": "objectId"
            },
            "rating": {
                "bsonType": "int",
                "minimum": 1,
                "maximum": 5
            },
            "review": {
                "bsonType": "string"
            },
            "createdAt": {
                "bsonType": "date"
            }
        }
    }
}

