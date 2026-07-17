from flask_pymongo import PyMongo

# Initialize Flask-PyMongo instance
mongo = PyMongo()

def get_db():
    """
    Helper function to get the database instance.
    Can be used within application context.
    """
    return mongo.db
