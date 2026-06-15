import os
from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING, DESCENDING

# Load environment variables from the .env file FIRST
load_dotenv()

# ==========================================
# 1. DATABASE CONNECTION SETUP
# ==========================================
# Securely pull your connection string from the .env file
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
customers_collection = db.customers  # NEW: Added for the Distribution Khata module

# ==========================================
# 3. HIGH-PERFORMANCE INDEX CREATION
# ==========================================
def init_db_indexes():
    print("Initializing Lightning-Fast MongoDB Indexes...")
    try:
        # --- INVENTORY INDEXES (THE BUG FIX) ---
        # 1. Destroy the old strict rule that caused the DuplicateKeyError
        inventory_collection.drop_indexes()
        
        # 2. Create the new Smart Rule: Product Name + Unit Type must be unique TOGETHER
        inventory_collection.create_index(
            [("product_name", ASCENDING), ("unit_type", ASCENDING)], 
            unique=True
        )
        
        # --- SALES INDEXES ---
        # Sorts receipts by time automatically so your dashboard loads instantly
        sales_collection.create_index([("timestamp", DESCENDING)])
        
        # --- EXPENSES INDEXES ---
        expenses_collection.create_index([("timestamp", DESCENDING)])
        expenses_collection.create_index([("category", ASCENDING)])

        # --- CUSTOMER (DISTRIBUTION) INDEXES ---
        # Ensures you don't accidentally register two shops with the exact same name
        customers_collection.create_index([("name", ASCENDING)], unique=True)
        
        print("✅ All Database Indexes Configured Successfully!")
    except Exception as e:
        print(f"⚠️ Error creating indexes: {e}")

init_db_indexes()