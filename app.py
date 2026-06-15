from flask import Flask, render_template
from modules.inventory import inventory_bp
from modules.sales import sales_bp
from modules.reports import reports_bp
from modules.expenses import expenses_bp
from modules.auth import auth_bp
from modules.distribution import distribution_bp
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# 1. First, create the Flask app!
app = Flask(__name__)

# 2. THEN, set the secret key for the app you just created
app.secret_key = os.getenv("FLASK_SECRET_KEY")

# Register Blueprints (Backend APIs)
app.register_blueprint(inventory_bp, url_prefix='/api/inventory')
app.register_blueprint(sales_bp, url_prefix='/api/sales')
app.register_blueprint(reports_bp, url_prefix='/api/reports')
app.register_blueprint(expenses_bp, url_prefix='/api/expenses')
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(distribution_bp, url_prefix='/api/distribution')

# ---------------------------------------------------------
# Frontend Shell Routes (Serves the blank HTML + JS files)
# ---------------------------------------------------------

@app.route('/')
def dashboard():
    return render_template('dashboard.html')

@app.route('/pos')
def pos():
    return render_template('pos.html')

@app.route('/reports')
def reports():
    return render_template('reports.html')

@app.route('/inventory')
def inventory():
    return render_template('inventory.html')

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/landing')
def landing():
    return render_template('landing.html')

@app.route('/distribution')
def distribution():
    return render_template('distribution.html')

if __name__ == '__main__':
    # Run the server in debug mode for development
    app.run(debug=True, port=5000)