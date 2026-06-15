from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from database import db # Importing the raw db to access a users collection

auth_bp = Blueprint('auth', __name__)
users_collection = db.users

@auth_bp.route('/register_admin', methods=['POST'])
def register_admin():
    """
    Utility route to create your first admin account. 
    You can hit this once via Postman or a hidden script, then disable it.
    """
    data = request.json
    username = data.get("username")
    password = data.get("password")

    if users_collection.find_one({"username": username}):
        return jsonify({"error": "User already exists"}), 400

    # Never save plain text passwords. Hash them for enterprise-level security.
    hashed_password = generate_password_hash(password)
    
    users_collection.insert_one({
        "username": username,
        "password": hashed_password,
        "role": "admin"
    })
    
    return jsonify({"message": "Admin user created successfully!"}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticates the user and creates a secure server-side session."""
    data = request.json
    username = data.get("username")
    password = data.get("password")

    user = users_collection.find_one({"username": username})

    # Check if user exists AND the hashed password matches
    if user and check_password_hash(user['password'], password):
        # Create a secure session cookie
        session['user'] = user['username']
        session['role'] = user['role']
        return jsonify({"message": "Login successful", "role": user['role']}), 200
    
    return jsonify({"error": "Invalid username or password"}), 401


@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Clears the session cookie, effectively logging the user out."""
    session.clear()
    return jsonify({"message": "Logged out successfully"}), 200


@auth_bp.route('/status', methods=['GET'])
def auth_status():
    """
    The frontend JS will call this on page load to see if the user is 
    still logged in before rendering the dashboard.
    """
    if 'user' in session:
        return jsonify({"logged_in": True, "user": session['user']}), 200
    
    return jsonify({"logged_in": False}), 401

@auth_bp.route('/update-password', methods=['POST'])
def update_password():
    """Securely updates the logged-in user's password."""
    # Ensure the user is actually logged in
    if 'user' not in session:
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.json
    current_password = data.get("current_password")
    new_password = data.get("new_password")
    
    username = session['user']
    user_record = users_collection.find_one({"username": username})
    
    # FIX 1: Use check_password_hash to securely verify the current password
    if not user_record or not check_password_hash(user_record.get("password"), current_password):
        return jsonify({"error": "Incorrect current password"}), 400
        
    # FIX 2: Hash the NEW password before saving it to the database
    hashed_new_password = generate_password_hash(new_password)
    
    # Update the password in the database
    users_collection.update_one(
        {"username": username},
        {"$set": {"password": hashed_new_password}}
    )
    
    return jsonify({"message": "Password updated successfully!"}), 200