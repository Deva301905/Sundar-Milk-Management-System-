from flask import Blueprint, request, jsonify
from database import inventory_collection, expenses_collection, db
from datetime import datetime

inventory_bp = Blueprint('inventory', __name__)

@inventory_bp.route('/', methods=['GET'])
def get_inventory():
    """Fetches all active inventory to display on the screen."""
    items = list(inventory_collection.find({}, {"_id": 0}))
    return jsonify(items), 200

@inventory_bp.route('/add', methods=['POST'])
def add_stock():
    """Logs incoming milk products or creates new ones."""
    data = request.json
    
    new_item = {
        "product_name": data.get("product_name"),
        "unit_type": data.get("unit_type"), 
        "available_quantity": float(data.get("quantity")),
        "cost_price": float(data.get("cost_price")),
        "selling_price": float(data.get("selling_price")),
        "updated_at": datetime.utcnow()
    }
    
    # Matches BOTH Name and Unit Type to prevent overwriting bugs
    inventory_collection.update_one(
        {
            "product_name": new_item["product_name"],
            "unit_type": new_item["unit_type"] 
        },
        {
            "$inc": {"available_quantity": new_item["available_quantity"]},
            "$set": {
                "cost_price": new_item["cost_price"],
                "selling_price": new_item["selling_price"],
                "updated_at": new_item["updated_at"]
            }
        },
        upsert=True
    )
    return jsonify({"message": "Stock updated successfully!"}), 201

@inventory_bp.route('/edit', methods=['POST'])
def edit_stock():
    """Directly overrides pricing and stock data (Update)."""
    data = request.json
    
    target_query = {
        "product_name": data.get("original_name"),
        "unit_type": data.get("original_unit")
    }
    
    update_data = {
        "$set": {
            "product_name": data.get("product_name"),
            "unit_type": data.get("unit_type"),
            "available_quantity": float(data.get("quantity")),
            "cost_price": float(data.get("cost_price")),
            "selling_price": float(data.get("selling_price")),
            "updated_at": datetime.utcnow()
        }
    }
    
    result = inventory_collection.update_one(target_query, update_data)
    if result.matched_count > 0:
        return jsonify({"message": "Product updated successfully!"}), 200
    return jsonify({"error": "Product not found."}), 404

@inventory_bp.route('/delete', methods=['POST'])
def delete_stock():
    """Removes a product entirely from the warehouse (Delete)."""
    data = request.json
    target_query = {
        "product_name": data.get("product_name"),
        "unit_type": data.get("unit_type")
    }
    
    result = inventory_collection.delete_one(target_query)
    if result.deleted_count > 0:
        return jsonify({"message": "Product deleted successfully!"}), 200
    return jsonify({"error": "Product not found."}), 404

@inventory_bp.route('/spoilage', methods=['POST'])
def log_spoilage():
    """Deducts leaked/spoiled stock and logs it as an expense."""
    data = request.json
    product_name = data.get("product_name")
    unit_type = data.get("unit_type")
    qty_lost = int(data.get("qty"))
    
    # 1. Get the cost price of the item
    product = inventory_collection.find_one({"product_name": product_name, "unit_type": unit_type})
    if not product:
        return jsonify({"error": "Product not found."}), 404
        
    cost_price = product.get("cost_price", 0)
    financial_loss = cost_price * qty_lost
    
    # 2. Deduct from inventory
    inventory_collection.update_one(
        {"product_name": product_name, "unit_type": unit_type},
        {"$inc": {"available_quantity": -abs(qty_lost)}}
    )
    
    # 3. Inject financial loss into Expenses Collection
    expense_entry = {
        "description": f"Spoilage/Leakage: {qty_lost}x {product_name} ({unit_type})",
        "amount": financial_loss,
        "category": "Spoilage & Damage",
        "timestamp": datetime.utcnow(),
        "logged_by": "System Auto-Log"
    }
    expenses_collection.insert_one(expense_entry)
    
    return jsonify({"message": f"Logged {qty_lost} damaged items. ₹{financial_loss} added to expenses."}), 200