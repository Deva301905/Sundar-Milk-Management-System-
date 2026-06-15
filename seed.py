from werkzeug.security import generate_password_hash
from database import db # This reuses the lightning-fast connection we already built!

def seed_admin():
    print("🌱 Initializing Database Seeding...")
    users_collection = db.users

    # Check if Sundar already exists so we don't create duplicate accounts
    if users_collection.find_one({"username": "Sundar"}):
        print("⚠️ User 'Sundar' already exists. Skipping creation.")
        return

    # Never store plain text! We hash Sundar@123 for secure login
    hashed_password = generate_password_hash("Sundar@123")
    
    admin_user = {
        "username": "Sundar",
        "password": hashed_password,
        "role": "admin"
    }
    
    users_collection.insert_one(admin_user)
    print("✅ Admin user 'Sundar' created successfully!")
    print("🚀 You can now log in to the portal.")

if __name__ == "__main__":
    seed_admin()