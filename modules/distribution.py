from flask import Blueprint, request, jsonify
from database import db, inventory_collection, sales_collection
from datetime import datetime

distribution_bp = Blueprint('distribution', __name__)
customers_collection = db.customers

@distribution_bp.route('/customers', methods=['GET'])
def get_customers():
    """Fetches all registered customers and their live Khata balance."""
    customers = list(customers_collection.find({}, {"_id": 0}))
    
    today_str = datetime.utcnow().strftime('%Y-%m-%d')
    for c in customers:
        # Reset delivery status for a new day
        if c.get("last_delivery_date") != today_str:
            c["status"] = "Pending"
            
    return jsonify(customers), 200

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
    
    customers_collection.insert_one(new_customer)
    return jsonify({"message": "Customer registered successfully!"}), 201

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
    sales_collection.insert_one(receipt)

    # 3. Deduct inventory dynamically
    for item in items:
        inventory_collection.update_one(
            {"product_name": item['product_name'], "unit_type": item['unit_type']},
            {"$inc": {"available_quantity": -abs(int(item['qty']))}}
        )

    # 4. Update the Customer's Khata (Ledger)
    # Formula: New Balance = Old Balance + Total Bill - Cash Received
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