from flask import Blueprint, request, jsonify
from database import db, inventory_collection, sales_collection
from datetime import datetime, timedelta

distribution_bp = Blueprint('distribution', __name__)
customers_collection = db.customers

@distribution_bp.route('/customers', methods=['GET'])
def get_customers():
    """Fetches all registered customers and their live Khata balance."""
    try:
        customers = list(customers_collection.find({}, {"_id": 0}))
        
        today_str = datetime.utcnow().strftime('%Y-%m-%d')
        for c in customers:
            # Reset delivery status for a new day
            if c.get("last_delivery_date") != today_str:
                c["status"] = "Pending"
                
        return jsonify(customers), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@distribution_bp.route('/add', methods=['POST'])
def add_customer():
    """Registers a permanent Shop or Home without rigid quotas."""
    data = request.json
    
    # Check if customer already exists to prevent duplicates
    if customers_collection.find_one({"name": data.get("name")}):
        return jsonify({"error": "Customer name already exists"}), 400

    new_customer = {
        "name": data.get("name"),
        "type": data.get("type"), 
        "address": data.get("address"),
        "balance": 0.0, # The Khata Ledger starting at 0
        "status": "Pending", 
        "last_delivery_date": None,
        "created_at": datetime.utcnow()
    }
    
    try:
        customers_collection.insert_one(new_customer)
        return jsonify({"message": "Customer registered successfully!"}), 201
    except Exception as e:
        return jsonify({"error": "Database error"}), 500

@distribution_bp.route('/deliver', methods=['POST'])
def process_dynamic_delivery():
    """Processes a multi-item drop, updates inventory, sales, and Khata balance."""
    data = request.json
    customer_name = data.get("name")
    items = data.get("items", []) # Array of {product_name, unit_type, qty, price}
    cash_received = float(data.get("cash_received", 0))
    
    timestamp = datetime.utcnow()
    today_str = timestamp.strftime('%Y-%m-%d')

    if not items:
        return jsonify({"error": "No items in delivery drop"}), 400

    # 1. Calculate the total bill for this drop
    total_bill = sum(float(item['price']) for item in items)
    total_qty = sum(int(item['qty']) for item in items)

    # 2. INJECT INTO SALES LEDGER 
    formatted_items = []
    for item in items:
        formatted_items.append({
            "product_name": f"{item['product_name']} ({item['unit_type']})",
            "qty": item['qty'],
            "price": item['price']
        })

    receipt = {
        "timestamp": timestamp,
        "customer_name": customer_name,
        "items": formatted_items,
        "payment_mode": "Route Delivery", 
        "grand_total": total_bill,
        "cash_collected": cash_received,
        "total_items": total_qty
    }
    
    try:
        sales_collection.insert_one(receipt)

        # 3. Deduct inventory dynamically
        for item in items:
            inventory_collection.update_one(
                {"product_name": item['product_name'], "unit_type": item['unit_type']},
                {"$inc": {"available_quantity": -abs(int(item['qty']))}}
            )

        # 4. Update the Customer's Khata (Ledger)
        customers_collection.update_one(
            {"name": customer_name},
            {
                "$inc": {"balance": (total_bill - cash_received)},
                "$set": {
                    "status": "Delivered",
                    "last_delivery_date": today_str
                }
            }
        )
        return jsonify({"message": "Delivery logged, Khata updated!"}), 200
    except Exception as e:
        return jsonify({"error": "Failed to process delivery"}), 500

# ==========================================
# NEW: CUSTOMER 360° AND CRUD OPERATIONS
# ==========================================

@distribution_bp.route('/history/<customer_name>', methods=['GET'])
def get_customer_history(customer_name):
    """Fetches the last 30 days of purchases and settlements for a specific customer."""
    try:
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        # Query sales collection for this specific customer
        history_cursor = sales_collection.find(
            {
                "customer_name": customer_name,
                "timestamp": {"$gte": thirty_days_ago}
            },
            {"_id": 0} # Exclude object ID for JSON serialization
        ).sort("timestamp", -1) # Newest first
        
        history = list(history_cursor)
        return jsonify(history), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@distribution_bp.route('/settle', methods=['POST'])
def settle_balance():
    """Receives cash from a customer to pay down their pending Khata balance."""
    data = request.json
    customer_name = data.get("name")
    amount_paid = float(data.get("amount", 0))

    if amount_paid <= 0:
        return jsonify({"error": "Settlement amount must be greater than zero"}), 400

    timestamp = datetime.utcnow()

    try:
        # 1. Log the settlement as a positive cash flow in Sales so the Dashboard sees the money
        receipt = {
            "timestamp": timestamp,
            "customer_name": customer_name,
            "items": [{"product_name": "Khata Balance Settlement", "qty": 1, "price": 0}], # No products sold
            "payment_mode": "Khata Settlement", 
            "grand_total": 0, # Bill is 0
            "cash_collected": amount_paid, # But cash was received
            "total_items": 0
        }
        sales_collection.insert_one(receipt)

        # 2. Reduce the customer's balance
        customers_collection.update_one(
            {"name": customer_name},
            {"$inc": {"balance": -abs(amount_paid)}}
        )

        return jsonify({"message": f"Successfully settled ₹{amount_paid} for {customer_name}"}), 200
    except Exception as e:
        return jsonify({"error": "Failed to process settlement"}), 500

@distribution_bp.route('/update', methods=['POST'])
def update_customer():
    """Updates a customer's basic details."""
    data = request.json
    original_name = data.get("original_name")
    new_name = data.get("name")
    
    try:
        # If they are changing the name, ensure the new name doesn't already exist
        if original_name != new_name:
            if customers_collection.find_one({"name": new_name}):
                return jsonify({"error": "New customer name already exists"}), 400
                
        customers_collection.update_one(
            {"name": original_name},
            {"$set": {
                "name": new_name,
                "type": data.get("type"),
                "address": data.get("address")
            }}
        )
        
        # If name changed, we should theoretically update their past sales records too, 
        # but for performance, we update future ones. In strict enterprise, we use customer IDs.
        if original_name != new_name:
            sales_collection.update_many(
                {"customer_name": original_name},
                {"$set": {"customer_name": new_name}}
            )
            
        return jsonify({"message": "Customer updated successfully!"}), 200
    except Exception as e:
        return jsonify({"error": "Failed to update customer"}), 500

@distribution_bp.route('/delete/<customer_name>', methods=['DELETE'])
def delete_customer(customer_name):
    """Deletes a customer permanently."""
    try:
        # Prevent deletion if they still owe money
        customer = customers_collection.find_one({"name": customer_name})
        if customer and customer.get("balance", 0) > 0:
            return jsonify({"error": f"Cannot delete. Customer still owes ₹{customer['balance']}"}), 400
            
        result = customers_collection.delete_one({"name": customer_name})
        if result.deleted_count > 0:
            return jsonify({"message": "Customer deleted successfully"}), 200
        return jsonify({"error": "Customer not found"}), 404
    except Exception as e:
        return jsonify({"error": "Failed to delete customer"}), 500