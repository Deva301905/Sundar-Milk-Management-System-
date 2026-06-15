from flask import Blueprint, request, jsonify
from database import sales_collection
from datetime import datetime, timedelta

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/weekly', methods=['GET'])
def get_weekly_aggregation():
    """Returns total sales grouped by day for the last 7 days."""
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    
    pipeline = [
        {"$match": {"timestamp": {"$gte": seven_days_ago}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}},
            "total_revenue": {"$sum": "$grand_total"},
            "total_items_sold": {"$sum": "$total_items"}
        }},
        {"$sort": {"_id": 1}} # Sort oldest to newest for charting
    ]
    
    results = list(sales_collection.aggregate(pipeline))
    return jsonify(results), 200

@reports_bp.route('/entries', methods=['GET'])
def get_daily_entries():
    """Fetches one-by-one receipt logs for a specific day."""
    # Expected format: YYYY-MM-DD
    target_date_str = request.args.get('date', datetime.utcnow().strftime('%Y-%m-%d'))
    
    start_of_day = datetime.strptime(target_date_str, "%Y-%m-%d")
    end_of_day = start_of_day + timedelta(days=1)
    
    # O(log N) indexed query
    entries = list(sales_collection.find(
        {"timestamp": {"$gte": start_of_day, "$lt": end_of_day}},
        {"_id": 0} # Exclude BSON ID
    ).sort("timestamp", -1))
    
    return jsonify(entries), 200