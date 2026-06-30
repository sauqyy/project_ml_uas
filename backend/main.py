from flask import Flask, jsonify, request, send_from_directory, send_file
from flask_cors import CORS
from sqlalchemy.orm import Session
import os
import io
import csv
import re
import pandas as pd

from database import SessionLocal, engine, Base
import models
import ai_models

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

        # Check categories
        if db.query(models.Category).count() == 0:
            default_categories = [
                models.Category(name="Food & Dining"),
                models.Category(name="Shopping"),
                models.Category(name="Transportation"),
                models.Category(name="Bills & Utilities"),
                models.Category(name="Entertainment"),
                models.Category(name="Healthcare"),
                models.Category(name="Other")
            ]
            db.add_all(default_categories)
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

@app.route("/api/expenses/<int:expense_id>", methods=["PUT"])
def update_expense(expense_id):
    data = request.json
    db = get_db()
    try:
        expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
        if not expense:
            return jsonify({"detail": "Expense not found"}), 404
        
        expense.amount = float(data["amount"])
        expense.category = data["category"]
        expense.desc = data.get("desc")
        expense.date = data["date"]
        if "displayDate" in data:
            expense.displayDate = data["displayDate"]
            
        db.commit()
        return jsonify({
            "id": expense.id,
            "amount": expense.amount,
            "category": expense.category,
            "desc": expense.desc,
            "date": expense.date,
            "displayDate": expense.displayDate
        })
    except Exception as e:
        db.rollback()
        return jsonify({"detail": str(e)}), 500
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

# --- AI & File Upload API Endpoints ---

@app.route("/api/anomalies", methods=["GET"])
def get_anomalies():
    db = get_db()
    try:
        expenses = db.query(models.Expense).all()
        expense_list = []
        for e in expenses:
            expense_list.append({
                "id": e.id,
                "amount": e.amount,
                "category": e.category,
                "desc": e.desc,
                "date": e.date,
                "displayDate": e.displayDate
            })
        anomalies = ai_models.detect_anomalies_iso_forest(expense_list)
        return jsonify(anomalies)
    finally:
        db.close()

@app.route("/api/forecast", methods=["GET"])
def get_forecast():
    db = get_db()
    try:
        expenses = db.query(models.Expense).all()
        expense_list = []
        for e in expenses:
            expense_list.append({
                "id": e.id,
                "amount": e.amount,
                "category": e.category,
                "desc": e.desc,
                "date": e.date,
                "displayDate": e.displayDate
            })
        forecast = ai_models.get_arima_forecast_5days(expense_list)
        return jsonify(forecast)
    finally:
        db.close()

@app.route("/api/upload", methods=["POST"])
def upload_csv():
    if 'file' not in request.files:
        return jsonify({"detail": "No file part in request"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"detail": "No selected file"}), 400
        
    db = get_db()
    try:
        # Read and decode CSV file
        stream = io.StringIO(file.stream.read().decode("utf-8-sig"), newline=None)
        csv_reader = csv.DictReader(stream)
        
        # Verify columns
        headers = csv_reader.fieldnames
        if not headers or 'Jumlah' not in headers or 'Transaksi' not in headers:
            return jsonify({"detail": "Invalid file format. Columns must match the transaction history CSV."}), 400
            
        # Clear existing expenses and incomes to load the new data cleanly
        db.query(models.Expense).delete()
        db.query(models.Income).delete()
        db.commit()
        
        # Temporary lists to process
        raw_rows = []
        for row in csv_reader:
            raw_rows.append(row)
            
        if not raw_rows:
            return jsonify({"detail": "CSV file is empty"}), 400
            
        # Pre-process details for NLP category classifier
        nlp_inputs = []
        for row in raw_rows:
            desc = row.get('Transaksi', '').strip()
            nlp_inputs.append({"desc": desc})
            
        # Classify all descriptions
        predicted_categories = ai_models.train_and_classify_categories(nlp_inputs)
        
        # Parse and save expenses & incomes
        imported_expenses = 0
        imported_incomes = 0
        
        for idx, row in enumerate(raw_rows):
            desc = row.get('Transaksi', '').strip()
            date_str = row.get('Tanggal Transaksi', '').strip()
            amount_raw = row.get('Jumlah', '').strip()
            
            # Clean amount
            # e.g., -Rp10.400 -> -10400.0, +Rp500.000 -> 500000.0
            is_negative = '-' in amount_raw
            cleaned_digits = re.sub(r'[^\d]', '', amount_raw)
            if not cleaned_digits:
                amount_val = 0.0
            else:
                amount_val = float(cleaned_digits)
            
            # Handle date parsing using pandas to handle mixed formatting
            parsed_dt = pd.to_datetime(date_str, errors='coerce', dayfirst=True)
            if pd.isna(parsed_dt):
                # Fallback to general parsing if dayfirst fails
                parsed_dt = pd.to_datetime(date_str, errors='coerce')
                if pd.isna(parsed_dt):
                    parsed_dt = pd.Timestamp.now()
            
            formatted_date = parsed_dt.strftime("%Y-%m-%d")
            display_date = parsed_dt.strftime("%a, %b %d, %Y")
            
            if is_negative:
                # Save as Expense
                category = predicted_categories[idx] if idx < len(predicted_categories) else 'Lain-lain'
                expense = models.Expense(
                    amount=amount_val,
                    category=category,
                    desc=desc,
                    date=formatted_date,
                    displayDate=display_date
                )
                db.add(expense)
                imported_expenses += 1
            else:
                # Save as Income
                income = models.Income(
                    amount=amount_val,
                    source=desc,
                    date=formatted_date
                )
                db.add(income)
                imported_incomes += 1
                
        db.commit()
        return jsonify({
            "message": "File uploaded and processed successfully",
            "expenses_imported": imported_expenses,
            "incomes_imported": imported_incomes
        }), 201
    except Exception as e:
        db.rollback()
        print(f"Error parsing uploaded file: {e}")
        return jsonify({"detail": f"Error parsing uploaded file: {str(e)}"}), 500
    finally:
        db.close()

# Categories Endpoints
@app.route("/api/categories", methods=["GET"])
def get_categories():
    db = get_db()
    try:
        categories = db.query(models.Category).all()
        return jsonify([c.name for c in categories])
    finally:
        db.close()

@app.route("/api/categories", methods=["POST"])
def create_category():
    data = request.json
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"detail": "Category name cannot be empty"}), 400
    db = get_db()
    try:
        existing = db.query(models.Category).filter(models.Category.name == name).first()
        if existing:
            return jsonify({"detail": "Category already exists"}), 400
        category = models.Category(name=name)
        db.add(category)
        db.commit()
        return jsonify({"name": category.name}), 201
    except Exception as e:
        db.rollback()
        return jsonify({"detail": str(e)}), 500
    finally:
        db.close()

@app.route("/api/categories/<string:name>", methods=["DELETE"])
def delete_category(name):
    db = get_db()
    try:
        category = db.query(models.Category).filter(models.Category.name == name).first()
        if not category:
            return jsonify({"detail": "Category not found"}), 404
        db.delete(category)
        db.commit()
        return "", 204
    except Exception as e:
        db.rollback()
        return jsonify({"detail": str(e)}), 500
    finally:
        db.close()

# Export Data to CSV (Expenses & Incomes in a Single Table)
@app.route("/api/export", methods=["GET"])
def export_csv():
    db = get_db()
    try:
        expenses = db.query(models.Expense).order_by(models.Expense.date.desc()).all()
        incomes = db.query(models.Income).order_by(models.Income.date.desc()).all()
        
        # Create an in-memory CSV buffer
        si = io.StringIO()
        cw = csv.writer(si)
        
        # Header row
        cw.writerow(["Type", "Date", "Category/Source", "Amount", "Description"])
        
        # Combine both datasets
        all_transactions = []
        for e in expenses:
            all_transactions.append({
                "type": "Expense",
                "date": e.date,
                "category": e.category,
                "amount": -e.amount, # Negative for expenses
                "desc": e.desc or ""
            })
        for i in incomes:
            all_transactions.append({
                "type": "Income",
                "date": i.date,
                "category": i.source,
                "amount": i.amount, # Positive for incomes
                "desc": "Income from Wallet"
            })
            
        # Sort by date descending (newest first)
        all_transactions.sort(key=lambda x: x['date'], reverse=True)
        
        # Write rows
        for t in all_transactions:
            cw.writerow([t["type"], t["date"], t["category"], t["amount"], t["desc"]])
            
        return si.getvalue(), 200, {
            "Content-Type": "text/csv",
            "Content-Disposition": "attachment; filename=money_mind_export.csv"
        }
    except Exception as e:
        print(f"Error exporting CSV: {e}")
        return jsonify({"detail": str(e)}), 500
    finally:
        db.close()

# Reset/Delete All Transaction Data
@app.route("/api/reset", methods=["POST"])
def reset_data():
    db = get_db()
    try:
        db.query(models.Expense).delete()
        db.query(models.Income).delete()
        db.commit()
        return jsonify({"message": "All transaction data cleared successfully"}), 200
    except Exception as e:
        db.rollback()
        return jsonify({"detail": str(e)}), 500
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
