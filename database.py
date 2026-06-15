import os
from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING, DESCENDING

# Load environment variables from the .env file FIRST
load_dotenv()

# ==========================================
# 1. DATABASE CONNECTION SETUP
# ==========================================
# Now it will securely pull your connection string from the .env file!
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(MONGO_URI)

# Create or connect to the specific database for the project
db = client.sundar_milk_shop

# ==========================================
# 2. COLLECTION DEFINITIONS
# ==========================================
inventory_collection = db.inventory
sales_collection = db.sales
expenses_collection = db.expenses
users_collection = db.users

# ==========================================
# 3. HIGH-PERFORMANCE INDEX CREATION
# ==========================================
def init_db_indexes():
    print("Initializing Lightning-Fast MongoDB Indexes...")
    try:
        sales_collection.create_index([("timestamp", DESCENDING)])
        inventory_collection.create_index([("product_name", ASCENDING)], unique=True)
        inventory_collection.create_index([("expiry_date", ASCENDING)])
        expenses_collection.create_index([("timestamp", DESCENDING)])
        expenses_collection.create_index([("category", ASCENDING)])
        print("✅ All Database Indexes Configured Successfully!")
    except Exception as e:
        print(f"⚠️ Error creating indexes: {e}")

init_db_indexes()