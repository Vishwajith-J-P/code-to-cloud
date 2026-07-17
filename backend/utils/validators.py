import re

def validate_email(email):
    """
    Validates email format using regex.
    """
    if not email:
        return False
    email_regex = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    return bool(re.match(email_regex, email.strip()))

def validate_phone(phone):
    """
    Validates phone format (supports optional + and 10 to 15 digits/spaces/dashes).
    """
    if not phone:
        return False
    phone_regex = r'^\+?[\d\s\-]{10,15}$'
    return bool(re.match(phone_regex, phone.strip()))

def validate_password(password):
    """
    Validates password strength (at least 6 characters).
    """
    if not password:
        return False
    return len(password) >= 6

def get_missing_fields(data, required_fields):
    """
    Checks if all required fields are present and non-empty in the input dictionary.
    Returns a list of missing field names.
    """
    if not data or not isinstance(data, dict):
        return required_fields
    
    missing = []
    for field in required_fields:
        if field not in data:
            missing.append(field)
        else:
            val = data[field]
            if isinstance(val, str) and not val.strip():
                missing.append(field)
            elif val is None:
                missing.append(field)
    return missing
