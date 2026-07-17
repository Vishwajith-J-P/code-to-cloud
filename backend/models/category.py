from bson import ObjectId

def serialize_category(category):
    """
    Serializes a category document.
    """
    if not category:
        return None
    return {
        "id": str(category["_id"]),
        "categoryName": category.get("categoryName"),
        "image": category.get("image", "")
    }

def create_category_doc(category_name, image=""):
    """
    Constructs a dictionary for category insertion.
    """
    return {
        "categoryName": category_name.strip(),
        "image": image.strip() if image else ""
    }
