from flask import Blueprint, request, jsonify
from database import sales_collection, inventory_collection
from datetime import datetime

sales_bp = Blueprint('sales', __name__)

@sales_bp.route('/checkout', methods=['POST'])
def process_sale():
    """Logs a new sale and atomically decrements inventory."""
    data = request.json
    items_sold = data.get("items", []) # List of dicts: [{"product_name": "Arokya", "qty": 2, "price": 54}]
    
    total_amount = sum(item["price"] for item in items_sold)
    timestamp = datetime.utcnow()

    # 1. Save the receipt to the sales ledger
    receipt = {
        "timestamp": timestamp,
        "items": items_sold,
        "payment_mode": data.get("payment_mode", "Cash"),
        "grand_total": total_amount,
        "total_items": len(items_sold)
    }
    sales_collection.insert_one(receipt)

    # 2. Instantly deduct stock from inventory using a loop of atomic operations
    for item in items_sold:
        inventory_collection.update_one(
            {"product_name": item["product_name"]},
            {"$inc": {"available_quantity": -abs(item["qty"])}} # Ensure deduction
        )
        
    return jsonify({"message": "Sale completed", "total": total_amount}), 201