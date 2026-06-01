from flask import Flask, jsonify, request, send_from_directory, send_file
from flask_cors import CORS
from sqlalchemy.orm import Session
import os

from database import SessionLocal, engine, Base
import models

# Initialize DB tables
Base.metadata.create_all(bind=engine)

app = Flask(__name__, static_folder="static")
CORS(app) # Enable CORS for all routes during development

# Helper to get DB session
def get_db():
    db = SessionLocal()
    try:
        return db
    except Exception as e:
        db.close()
        raise e

# Seed DB if empty
def seed_db():
    db = SessionLocal()
    try:
        # Check settings
        if db.query(models.Setting).count() == 0:
            default_setting = models.Setting(code="USD", symbol="$", name="US Dollar")
            db.add(default_setting)
            db.commit()

        # Check expenses
        if db.query(models.Expense).count() == 0:
            initial_expenses = [
                models.Expense(amount=45.67, category="Food & Dining", desc="Lunch at downtown cafe", date="2024-01-15", displayDate="Mon, Jan 15, 2024"),
                models.Expense(amount=89.99, category="Shopping", desc="New running shoes", date="2024-01-14", displayDate="Sun, Jan 14, 2024"),
                models.Expense(amount=12.50, category="Transportation", desc="Gas station", date="2024-01-14", displayDate="Sun, Jan 14, 2024"),
                models.Expense(amount=156.78, category="Bills & Utilities", desc="Monthly electricity bill", date="2024-01-13", displayDate="Sat, Jan 13, 2024"),
                models.Expense(amount=23.45, category="Entertainment", desc="Movie tickets", date="2024-01-12", displayDate="Fri, Jan 12, 2024"),
                models.Expense(amount=67.89, category="Food & Dining", desc="Grocery shopping", date="2024-01-11", displayDate="Thu, Jan 11, 2024"),
                models.Expense(amount=125.00, category="Shopping", desc="Winter jacket", date="2023-12-20", displayDate="Wed, Dec 20, 2023"),
                models.Expense(amount=35.50, category="Food & Dining", desc="Dinner with friends", date="2023-12-18", displayDate="Mon, Dec 18, 2023"),
                models.Expense(amount=78.90, category="Bills & Utilities", desc="Internet bill", date="2023-12-15", displayDate="Fri, Dec 15, 2023"),
                models.Expense(amount=200.00, category="Healthcare", desc="Doctor visit", date="2023-11-28", displayDate="Tue, Nov 28, 2023")
            ]
            db.add_all(initial_expenses)
            db.commit()

        # Check incomes
        if db.query(models.Income).count() == 0:
            initial_incomes = [
                models.Income(amount=5000.00, source="Monthly Salary", date="2024-01-01")
            ]
            db.add_all(initial_incomes)
            db.commit()
    finally:
        db.close()

seed_db()

# --- API Endpoints ---

# Expenses Endpoints
@app.route("/api/expenses", methods=["GET"])
def get_expenses():
    db = get_db()
    try:
        expenses = db.query(models.Expense).order_by(models.Expense.date.desc(), models.Expense.id.desc()).all()
        result = []
        for e in expenses:
            result.append({
                "id": e.id,
                "amount": e.amount,
                "category": e.category,
                "desc": e.desc,
                "date": e.date,
                "displayDate": e.displayDate
            })
        return jsonify(result)
    finally:
        db.close()

@app.route("/api/expenses", methods=["POST"])
def create_expense():
    data = request.json
    db = get_db()
    try:
        expense = models.Expense(
            amount=float(data["amount"]),
            category=data["category"],
            desc=data.get("desc"),
            date=data["date"],
            displayDate=data.get("displayDate")
        )
        db.add(expense)
        db.commit()
        db.refresh(expense)
        return jsonify({
            "id": expense.id,
            "amount": expense.amount,
            "category": expense.category,
            "desc": expense.desc,
            "date": expense.date,
            "displayDate": expense.displayDate
        }), 201
    finally:
        db.close()

@app.route("/api/expenses/<int:expense_id>", methods=["DELETE"])
def delete_expense(expense_id):
    db = get_db()
    try:
        expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
        if not expense:
            return jsonify({"detail": "Expense not found"}), 404
        db.delete(expense)
        db.commit()
        return "", 204
    finally:
        db.close()

# Incomes Endpoints
@app.route("/api/incomes", methods=["GET"])
def get_incomes():
    db = get_db()
    try:
        incomes = db.query(models.Income).order_by(models.Income.date.desc(), models.Income.id.desc()).all()
        result = []
        for i in incomes:
            result.append({
                "id": i.id,
                "amount": i.amount,
                "source": i.source,
                "date": i.date
            })
        return jsonify(result)
    finally:
        db.close()

@app.route("/api/incomes", methods=["POST"])
def create_income():
    data = request.json
    db = get_db()
    try:
        income = models.Income(
            amount=float(data["amount"]),
            source=data["source"],
            date=data["date"]
        )
        db.add(income)
        db.commit()
        db.refresh(income)
        return jsonify({
            "id": income.id,
            "amount": income.amount,
            "source": income.source,
            "date": income.date
        }), 201
    finally:
        db.close()

@app.route("/api/incomes/<int:income_id>", methods=["DELETE"])
def delete_income(income_id):
    db = get_db()
    try:
        income = db.query(models.Income).filter(models.Income.id == income_id).first()
        if not income:
            return jsonify({"detail": "Income not found"}), 404
        db.delete(income)
        db.commit()
        return "", 204
    finally:
        db.close()

# Settings Endpoints
@app.route("/api/settings", methods=["GET"])
def get_settings():
    db = get_db()
    try:
        setting = db.query(models.Setting).first()
        if not setting:
            setting = models.Setting(code="USD", symbol="$", name="US Dollar")
            db.add(setting)
            db.commit()
            db.refresh(setting)
        return jsonify({
            "id": setting.id,
            "code": setting.code,
            "symbol": setting.symbol,
            "name": setting.name
        })
    finally:
        db.close()

@app.route("/api/settings", methods=["POST"])
def update_settings():
    data = request.json
    db = get_db()
    try:
        setting = db.query(models.Setting).first()
        if not setting:
            setting = models.Setting()
            db.add(setting)
        
        setting.code = data["code"]
        setting.symbol = data["symbol"]
        setting.name = data["name"]
        
        db.commit()
        db.refresh(setting)
        return jsonify({
            "id": setting.id,
            "code": setting.code,
            "symbol": setting.symbol,
            "name": setting.name
        })
    finally:
        db.close()

# Static Frontend Serving for Production Mode
static_dir = os.path.join(os.path.dirname(__file__), "static")

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if path.startswith("api/"):
        return jsonify({"detail": "API endpoint not found"}), 404
        
    if not os.path.exists(static_dir):
        return "Frontend build folder not found. Please compile the React frontend.", 404
        
    # Check if file exists inside static directory (e.g. assets/index.js)
    file_path = os.path.join(static_dir, path)
    if path != "" and os.path.exists(file_path):
        return send_from_directory(static_dir, path)
    else:
        # Fallback to index.html for SPA routing
        return send_file(os.path.join(static_dir, "index.html"))

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
