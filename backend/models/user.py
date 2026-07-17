from flask_login import UserMixin
from bson import ObjectId
from werkzeug.security import generate_password_hash, check_password_hash
import datetime

class User(UserMixin):
    def __init__(self, user_data):
        self.id = str(user_data['_id'])
        self.email = user_data['email']
        self.fullName = user_data.get('fullName', '')
        self.phone = user_data.get('phone', '')
        self.address = user_data.get('address', '')
        self.role = user_data.get('role', 'customer')
        self.isActive = user_data.get('isActive', True)
        self.createdAt = user_data.get('createdAt')

    @staticmethod
    def get_by_id(db, user_id):
        """
        Loads user by ObjectId string.
        """
        try:
            user_data = db.users.find_one({"_id": ObjectId(user_id)})
            if user_data:
                return User(user_data)
        except Exception:
            return None
        return None

    def to_json(self):
        """
        Returns a clean dictionary representation of the user for API consumption.
        """
        return {
            "id": self.id,
            "email": self.email,
            "fullName": self.fullName,
            "phone": self.phone,
            "address": self.address,
            "role": self.role,
            "isActive": self.isActive,
            "createdAt": self.createdAt.isoformat() if isinstance(self.createdAt, datetime.datetime) else self.createdAt
        }

def create_user_doc(fullName, email, password, phone, address, role="customer"):
    """
    Prepares a dictionary structure for insertion into the users collection.
    """
    hashed_password = generate_password_hash(password)
    return {
        "fullName": fullName.strip(),
        "email": email.strip().lower(),
        "password": hashed_password,
        "phone": phone.strip(),
        "address": address.strip(),
        "role": role,  # customer, vendor, admin
        "isActive": True,
        "createdAt": datetime.datetime.utcnow()
    }

def verify_password(stored_password, provided_password):
    """
    Checks the stored hashed password against the user's provided password.
    """
    return check_password_hash(stored_password, provided_password)
