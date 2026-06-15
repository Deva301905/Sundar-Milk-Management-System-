from flask import Blueprint, request, jsonify
from database import expenses_collection
from datetime import datetime

expenses_bp = Blueprint('expenses', __name__)

@expenses_bp.route('/add', methods=['POST'])
def log_expense():
    """Records money flowing out."""
    data = request.json
    
    expense = {
        "timestamp": datetime.utcnow(),
        "category": data.get("category"), # e.g., 'Spillage', 'Electricity'
        "amount": float(data.get("amount")),
        "description": data.get("description", "")
    }
    
    expenses_collection.insert_one(expense)
    return jsonify({"message": "Expense logged"}), 201

@expenses_bp.route('/today', methods=['GET'])
def get_todays_expenses():
    """Quick fetch of today's total expenses for the dashboard."""
    start_of_day = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    pipeline = [
        {"$match": {"timestamp": {"$gte": start_of_day}}},
        {"$group": {
            "_id": "$category",
            "total_amount": {"$sum": "$amount"}
        }}
    ]
    
    results = list(expenses_collection.aggregate(pipeline))
    return jsonify(results), 200