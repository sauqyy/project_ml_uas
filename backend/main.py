from flask import Flask, jsonify, request, send_from_directory, send_file
from flask_cors import CORS
from sqlalchemy.orm import Session
from werkzeug.security import generate_password_hash, check_password_hash
import sys
import os

# Force UTF-8 encoding on stdout/stderr to prevent Windows console encoding issues (e.g. easyocr progress bars)
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

from dotenv import load_dotenv
load_dotenv()

import io
import csv
import re
import pandas as pd
import threading
import json
import telebot
import google.generativeai as genai

from database import SessionLocal, engine, Base
import models
import ml_categorizer  # model kategorisasi baru (rules + NB + kamus personal)
import ml_forecast     # Prophet forecast + budget monitor + anomali MAD

# Initialize DB tables
Base.metadata.create_all(bind=engine)

app = Flask(__name__, static_folder="static")
# Debug default ON untuk dev lokal; di produksi (Render) set FLASK_DEBUG=0 supaya
# pakai gunicorn dan bot Telegram ikut jalan (guard di bawah bergantung app.debug).
app.debug = os.environ.get("FLASK_DEBUG", "1") == "1"
CORS(app) # Enable CORS for all routes during development

# Built-in demo account credentials
DEMO_EMAIL = "demo@moneymind.com"
DEMO_PASSWORD = "demo123"

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
            default_setting = models.Setting(code="IDR", symbol="Rp", name="Indonesian Rupiah")
            db.add(default_setting)
            db.commit()

        # Check expenses
        if db.query(models.Expense).count() == 0:
            initial_expenses = [
                models.Expense(amount=45000.00, category="Food & Dining", desc="Lunch at downtown cafe", date="2024-01-15", displayDate="Mon, Jan 15, 2024"),
                models.Expense(amount=90000.00, category="Shopping", desc="New running shoes", date="2024-01-14", displayDate="Sun, Jan 14, 2024"),
                models.Expense(amount=12000.00, category="Transportation", desc="Gas station", date="2024-01-14", displayDate="Sun, Jan 14, 2024"),
                models.Expense(amount=156000.00, category="Bills & Utilities", desc="Monthly electricity bill", date="2024-01-13", displayDate="Sat, Jan 13, 2024"),
                models.Expense(amount=23000.00, category="Entertainment", desc="Movie tickets", date="2024-01-12", displayDate="Fri, Jan 12, 2024"),
                models.Expense(amount=67000.00, category="Food & Dining", desc="Grocery shopping", date="2024-01-11", displayDate="Thu, Jan 11, 2024"),
                models.Expense(amount=125000.00, category="Shopping", desc="Winter jacket", date="2023-12-20", displayDate="Wed, Dec 20, 2023"),
                models.Expense(amount=35000.00, category="Food & Dining", desc="Dinner with friends", date="2023-12-18", displayDate="Mon, Dec 18, 2023"),
                models.Expense(amount=78000.00, category="Bills & Utilities", desc="Internet bill", date="2023-12-15", displayDate="Fri, Dec 15, 2023"),
                models.Expense(amount=200000.00, category="Healthcare", desc="Doctor visit", date="2023-11-28", displayDate="Tue, Nov 28, 2023")
            ]
            db.add_all(initial_expenses)
            db.commit()

        # Check incomes
        if db.query(models.Income).count() == 0:
            initial_incomes = [
                models.Income(amount=5000000.00, source="Monthly Salary", date="2024-01-01")
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

        # Pastikan kategori keluaran model kategorisasi tersedia (untuk dropdown & warna)
        existing_cat_names = {c.name for c in db.query(models.Category).all()}
        for cat_name in ml_categorizer.APP_CATEGORIES:
            if cat_name not in existing_cat_names:
                db.add(models.Category(name=cat_name))
        db.commit()

        # Seed built-in demo account so it works with DB-based auth
        if db.query(models.User).filter(models.User.email == DEMO_EMAIL).count() == 0:
            db.add(models.User(
                username="Demo User",
                email=DEMO_EMAIL,
                password_hash=generate_password_hash(DEMO_PASSWORD),
            ))
            db.commit()
    finally:
        db.close()

seed_db()

# --- API Endpoints ---

def get_user_email():
    email = request.headers.get("X-User-Email") or request.args.get("email") or "demo@moneymind.com"
    return email.strip().lower()

def predict_categories(descs, user_email, confirmed_dict=None):
    """Prediksi kategori untuk banyak deskripsi memakai model kategorisasi baru.
    Koreksi user (confirmed_dict, exact desc) selalu menang."""
    confirmed_dict = confirmed_dict or {}
    result = {}
    for d in descs:
        dd = (d or "").strip()
        if dd in result:
            continue
        if dd in confirmed_dict:
            result[dd] = confirmed_dict[dd]
        else:
            result[dd] = ml_categorizer.categorize(dd, user_email)["category"]
    return result

# --- Authentication Endpoints (DB-backed) ---

def _user_public(user):
    return {
        "username": user.username,
        "email": user.email,
        "avatar": user.avatar,
    }

@app.route("/api/auth/register", methods=["POST"])
def auth_register():
    data = request.json or {}
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not username or not email or not password:
        return jsonify({"error": "Semua field wajib diisi."}), 400
    if len(password) < 6:
        return jsonify({"error": "Password minimal harus 6 karakter! 🔑"}), 400
    if email == DEMO_EMAIL:
        return jsonify({"error": "Email ini adalah akun demo bawaan dan tidak dapat didaftarkan kembali! 📧"}), 400
    if username.lower() in ("demo", "demo user"):
        return jsonify({"error": "Username ini adalah akun demo bawaan dan tidak dapat digunakan! 👤"}), 400

    db = get_db()
    try:
        if db.query(models.User).filter(models.User.email == email).first():
            return jsonify({"error": "Email sudah terdaftar! Gunakan email lain. 📧"}), 409
        if db.query(models.User).filter(models.User.username.ilike(username)).first():
            return jsonify({"error": "Username sudah digunakan! Pilih username lain. 👤"}), 409

        user = models.User(
            username=username,
            email=email,
            password_hash=generate_password_hash(password),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return jsonify({"message": "Registrasi berhasil", "user": _user_public(user)}), 201
    finally:
        db.close()

@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    data = request.json or {}
    identifier = (data.get("identifier") or data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not identifier or not password:
        return jsonify({"error": "Email/Username dan password wajib diisi."}), 400

    db = get_db()
    try:
        user = db.query(models.User).filter(
            (models.User.email == identifier) | (models.User.username.ilike(identifier))
        ).first()
        if not user or not check_password_hash(user.password_hash, password):
            return jsonify({"error": "Email/Username atau password salah. Coba lagi! 🔒"}), 401
        return jsonify({"message": "Login berhasil", "user": _user_public(user)})
    finally:
        db.close()

@app.route("/api/auth/update-profile", methods=["POST"])
def auth_update_profile():
    data = request.json or {}
    email = (data.get("email") or get_user_email()).strip().lower()

    db = get_db()
    try:
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            return jsonify({"error": "Akun tidak ditemukan."}), 404

        new_username = (data.get("username") or "").strip()
        avatar = data.get("avatar")
        current_password = data.get("currentPassword")
        new_password = data.get("newPassword")

        # Username change (with uniqueness check)
        if new_username and new_username.lower() != (user.username or "").lower():
            clash = db.query(models.User).filter(
                models.User.username.ilike(new_username),
                models.User.id != user.id,
            ).first()
            if clash:
                return jsonify({"error": "Username sudah digunakan! Pilih username lain. 👤"}), 409
            user.username = new_username
        elif new_username:
            user.username = new_username

        # Avatar update (allow clearing with empty string, skip when not provided)
        if avatar is not None:
            user.avatar = avatar

        # Password change
        if new_password:
            if not check_password_hash(user.password_hash, current_password or ""):
                return jsonify({"error": "Password lama salah! 🔒"}), 403
            if len(new_password) < 6:
                return jsonify({"error": "Password baru minimal harus 6 karakter! 🔑"}), 400
            user.password_hash = generate_password_hash(new_password)

        db.commit()
        db.refresh(user)
        return jsonify({"message": "Profil berhasil diperbarui", "user": _user_public(user)})
    finally:
        db.close()

@app.route("/api/auth/migrate", methods=["POST"])
def auth_migrate():
    """One-time import of legacy localStorage accounts into the DB."""
    data = request.json or {}
    legacy_users = data.get("users") or []

    db = get_db()
    created = 0
    try:
        for u in legacy_users:
            email = (u.get("email") or "").strip().lower()
            username = (u.get("username") or "").strip()
            password = u.get("password") or ""
            if not email or not username or not password or email == DEMO_EMAIL:
                continue
            exists = db.query(models.User).filter(
                (models.User.email == email) | (models.User.username.ilike(username))
            ).first()
            if exists:
                continue
            db.add(models.User(
                username=username,
                email=email,
                password_hash=generate_password_hash(password),
            ))
            created += 1
        db.commit()
        return jsonify({"migrated": created})
    finally:
        db.close()

# Expenses Endpoints
@app.route("/api/expenses", methods=["GET"])
def get_expenses():
    db = get_db()
    try:
        user_email = get_user_email()
        expenses = db.query(models.Expense).filter(models.Expense.user_email == user_email).order_by(models.Expense.date.desc(), models.Expense.id.desc()).all()
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
        user_email = get_user_email()
        expense = models.Expense(
            user_email=user_email,
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
        user_email = get_user_email()
        expense = db.query(models.Expense).filter(models.Expense.id == expense_id, models.Expense.user_email == user_email).first()
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
        user_email = get_user_email()
        expense = db.query(models.Expense).filter(models.Expense.id == expense_id, models.Expense.user_email == user_email).first()
        if not expense:
            return jsonify({"detail": "Expense not found"}), 404
        
        category_changed = data.get("category") != expense.category
        expense.amount = float(data["amount"])
        expense.category = data["category"]
        expense.desc = data.get("desc")
        expense.date = data["date"]
        if "displayDate" in data:
            expense.displayDate = data["displayDate"]

        db.commit()

        # Feedback loop: user mengubah kategori -> ajari model kategorisasi
        if category_changed and expense.desc:
            try:
                ml_categorizer.record_correction(expense.desc, expense.category, user_email)
            except Exception as e:
                print(f"record_correction (update_expense) failed: {e}")

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
        user_email = get_user_email()
        incomes = db.query(models.Income).filter(models.Income.user_email == user_email).order_by(models.Income.date.desc(), models.Income.id.desc()).all()
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
        user_email = get_user_email()
        income = models.Income(
            user_email=user_email,
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
        user_email = get_user_email()
        income = db.query(models.Income).filter(models.Income.id == income_id, models.Income.user_email == user_email).first()
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
        user_email = get_user_email()
        setting = db.query(models.Setting).filter(models.Setting.user_email == user_email).first()
        if not setting:
            setting = models.Setting(user_email=user_email, code="IDR", symbol="Rp", name="Indonesian Rupiah")
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
        user_email = get_user_email()
        setting = db.query(models.Setting).filter(models.Setting.user_email == user_email).first()
        if not setting:
            setting = models.Setting(user_email=user_email)
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

def _user_expenses_list(db, user_email):
    """Transaksi pengeluaran user (dari DB) untuk pipeline ML forecast/anomali."""
    expenses = db.query(models.Expense).filter(models.Expense.user_email == user_email).all()
    return [{"id": e.id, "desc": e.desc, "amount": e.amount, "date": e.date, "category": e.category} for e in expenses]

@app.route("/api/anomalies", methods=["GET"])
def get_anomalies():
    """Anomali pengeluaran (modified z-score median+MAD) dari transaksi akun user."""
    db = get_db()
    try:
        user_email = get_user_email()
        expenses = _user_expenses_list(db, user_email)
        items = ml_forecast.pending_anomalies(user_email, expenses, limit=20)
        result = []
        for a in items:
            level_label = "Sangat Tinggi" if a["anomaly_level"] == "severe" else "Tinggi"
            desc = (
                f"Transaksi '{a['transaksi']}' sebesar Rp{int(a['jumlah']):,} "
                f"jauh di atas kebiasaan (median Rp{int(a['median_pengeluaran']):,}). "
                f"Tandai apakah ini pengeluaran rutin atau hanya sekali saja."
            )
            median_val = float(a["median_pengeluaran"])
            ratio = round(float(a["jumlah"]) / median_val, 1) if median_val > 0 else 1.0
            result.append({
                "id": a["id"],
                "title": a["transaksi"],
                "category": a.get("category", "Lain-lain"),
                "level": a["anomaly_level"],
                "amount": a["jumlah"],
                "date": a["tanggal"],
                "description": desc,
                "ratio": ratio,
                "median_pengeluaran": a["median_pengeluaran"]
            })
        return jsonify(result)
    except Exception as e:
        print(f"Error in get_anomalies: {e}")
        return jsonify([])
    finally:
        db.close()

@app.route("/api/anomalies/decide", methods=["POST"])
def decide_anomaly_route():
    """Feedback loop anomali: user putuskan transaksi rutin (include) / sekali saja (exclude)."""
    data = request.json or {}
    tid = data.get("transaksi_id")
    keep = bool(data.get("keep_as_routine", False))
    if not tid:
        return jsonify({"detail": "transaksi_id wajib diisi"}), 400
    try:
        user_email = get_user_email()
        res = ml_forecast.decide_anomaly(user_email, str(tid), keep)
        return jsonify(res)
    except Exception as e:
        print(f"Error in decide_anomaly: {e}")
        return jsonify({"detail": str(e)}), 500

@app.route("/api/forecast", methods=["GET"])
def get_forecast():
    """Forecast pengeluaran harian (Prophet) dari transaksi akun user."""
    try:
        days = int(request.args.get("days", 14))
    except Exception:
        days = 14
    db = get_db()
    try:
        user_email = get_user_email()
        expenses = _user_expenses_list(db, user_email)
        result = ml_forecast.get_forecast(user_email, expenses, days=days)
        return jsonify(result)
    except Exception as e:
        print(f"Error in get_forecast: {e}")
        return jsonify({"status": "error", "error": str(e)}), 500
    finally:
        db.close()

@app.route("/api/budget-status", methods=["GET"])
def budget_status_route():
    """Budget monitor: proyeksi pengeluaran bulan berjalan vs target tabungan & pendapatan."""
    db = get_db()
    try:
        user_email = get_user_email()
        expenses = _user_expenses_list(db, user_email)
        incomes = db.query(models.Income).filter(models.Income.user_email == user_email).all()
        total_income = sum(i.amount for i in incomes) or 5_000_000
        try:
            savings_pct = float(request.args.get("savings_percent", 20))
        except Exception:
            savings_pct = 20
        savings_target = total_income * (savings_pct / 100.0)
        try:
            days = int(request.args.get("days", 30))
        except Exception:
            days = 30
        result = ml_forecast.budget_status(user_email, expenses, income=total_income,
                                           savings_target=savings_target, days=days)
        return jsonify(result)
    except Exception as e:
        print(f"Error in budget_status: {e}")
        return jsonify({"detail": str(e)}), 500
    finally:
        db.close()

@app.route("/api/import-dataset", methods=["POST"])
def import_dataset():
    """Import dataset contoh (CSV histori 1 tahun) ke akun user sebagai transaksi expense.
    Query ?replace=true (default) mengganti seluruh expense user; false = menambah."""
    db = get_db()
    try:
        user_email = get_user_email()
        replace = str(request.args.get("replace", "true")).lower() != "false"

        df = ml_forecast.load_transactions()  # baca CSV project (semua expense)
        if df.empty:
            return jsonify({"detail": "Dataset kosong / tidak ditemukan"}), 400

        if replace:
            db.query(models.Expense).filter(models.Expense.user_email == user_email).delete()
            db.commit()

        # Klasifikasi kategori semua deskripsi via model kategorisasi
        descs = [str(t) for t in df["Transaksi"].tolist()]
        confirmed_list = db.query(models.ConfirmedLabel).filter(models.ConfirmedLabel.user_email == user_email).all()
        confirmed_dict = {c.desc: c.category for c in confirmed_list}
        predictions_map = predict_categories(descs, user_email, confirmed_dict)

        count = 0
        for _, r in df.iterrows():
            dt = r["Tanggal Transaksi"]
            desc = str(r["Transaksi"])
            amt = float(r["Jumlah_abs"])
            cat = predictions_map.get(desc.strip(), "Lain-lain")
            db.add(models.Expense(
                user_email=user_email,
                amount=amt,
                category=cat,
                desc=desc,
                date=dt.strftime("%Y-%m-%d"),
                displayDate=dt.strftime("%a, %b %d, %Y"),
            ))
            count += 1
        db.commit()
        return jsonify({"imported": count, "replaced": replace}), 201
    except Exception as e:
        db.rollback()
        print(f"Error in import_dataset: {e}")
        return jsonify({"detail": str(e)}), 500
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
        user_email = get_user_email()
        # Read and decode CSV file
        stream = io.StringIO(file.stream.read().decode("utf-8-sig"), newline=None)
        csv_reader = csv.DictReader(stream)
        
        # Verify columns - support two formats
        headers = csv_reader.fieldnames
        if not headers:
            return jsonify({"detail": "CSV file has no headers."}), 400

        # Detect format: Bank statement (Indonesian) vs App export
        is_bank_format = 'Jumlah' in headers and 'Transaksi' in headers
        is_export_format = 'Amount' in headers and 'Description' in headers and 'Date' in headers
        
        if not is_bank_format and not is_export_format:
            return jsonify({"detail": "Format CSV tidak dikenali. Gunakan CSV dari bank statement (kolom: Tanggal Transaksi, Transaksi, Jumlah) atau CSV hasil export Money Mind (kolom: Type, Date, Category/Source, Amount, Description)."}), 400
            
        # Clear existing expenses and incomes for this user to load the new data cleanly
        db.query(models.Expense).filter(models.Expense.user_email == user_email).delete()
        db.query(models.Income).filter(models.Income.user_email == user_email).delete()
        db.commit()
        
        # Temporary lists to process
        raw_rows = []
        for row in csv_reader:
            raw_rows.append(row)
            
        if not raw_rows:
            return jsonify({"detail": "CSV file is empty"}), 400
        
        imported_expenses = 0
        imported_incomes = 0

        if is_bank_format:
            # --- BANK STATEMENT FORMAT ---
            # Kumpulkan deskripsi transaksi untuk klasifikasi kategori
            all_descs = [row.get('Transaksi', '').strip() for row in raw_rows]

            # Fetch all confirmed labels for this user
            confirmed_list = db.query(models.ConfirmedLabel).filter(models.ConfirmedLabel.user_email == user_email).all()
            confirmed_dict = {c.desc: c.category for c in confirmed_list}

            # Klasifikasi semua deskripsi memakai model kategorisasi baru (rules + NB + kamus personal)
            predictions_map = predict_categories(all_descs, user_email, confirmed_dict)
            
            for idx, row in enumerate(raw_rows):
                desc = row.get('Transaksi', '').strip()
                date_str = row.get('Tanggal Transaksi', '').strip()
                amount_raw = row.get('Jumlah', '').strip()
                
                # Clean amount
                is_negative = '-' in amount_raw
                cleaned_digits = re.sub(r'[^\d]', '', amount_raw)
                if not cleaned_digits:
                    amount_val = 0.0
                else:
                    amount_val = float(cleaned_digits)
                
                # Handle date parsing
                parsed_dt = pd.to_datetime(date_str, errors='coerce', dayfirst=True)
                if pd.isna(parsed_dt):
                    parsed_dt = pd.to_datetime(date_str, errors='coerce')
                    if pd.isna(parsed_dt):
                        parsed_dt = pd.Timestamp.now()
                
                formatted_date = parsed_dt.strftime("%Y-%m-%d")
                display_date = parsed_dt.strftime("%a, %b %d, %Y")
                
                if is_negative:
                    category = predictions_map.get(desc, 'Lain-lain')
                    expense = models.Expense(
                        user_email=user_email,
                        amount=amount_val,
                        category=category,
                        desc=desc,
                        date=formatted_date,
                        displayDate=display_date
                    )
                    db.add(expense)
                    imported_expenses += 1
                else:
                    income = models.Income(
                        user_email=user_email,
                        amount=amount_val,
                        source=desc,
                        date=formatted_date
                    )
                    db.add(income)
                    imported_incomes += 1
        else:
            # --- APP EXPORT FORMAT ---
            for idx, row in enumerate(raw_rows):
                row_type = row.get('Type', '').strip()
                date_str = row.get('Date', '').strip()
                category_source = row.get('Category/Source', '').strip()
                amount_raw = row.get('Amount', '').strip()
                desc = row.get('Description', '').strip()
                
                # Parse amount (can be negative for expenses in export)
                try:
                    amount_val = abs(float(amount_raw))
                except (ValueError, TypeError):
                    amount_val = 0.0
                
                # Handle date parsing
                parsed_dt = pd.to_datetime(date_str, errors='coerce')
                if pd.isna(parsed_dt):
                    parsed_dt = pd.to_datetime(date_str, errors='coerce', dayfirst=True)
                    if pd.isna(parsed_dt):
                        parsed_dt = pd.Timestamp.now()
                
                formatted_date = parsed_dt.strftime("%Y-%m-%d")
                display_date = parsed_dt.strftime("%a, %b %d, %Y")
                
                if row_type.lower() == 'expense':
                    expense = models.Expense(
                        user_email=user_email,
                        amount=amount_val,
                        category=category_source or 'Lain-lain',
                        desc=desc,
                        date=formatted_date,
                        displayDate=display_date
                    )
                    db.add(expense)
                    imported_expenses += 1
                else:
                    income = models.Income(
                        user_email=user_email,
                        amount=amount_val,
                        source=category_source or desc,
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


# Get unique descriptions for labeling confirmation (Secret Mode)
@app.route("/api/labeling-jobs", methods=["GET"])
def get_labeling_jobs():
    db = get_db()
    try:
        user_email = get_user_email()
        # Get all expenses for this user
        expenses = db.query(models.Expense).filter(models.Expense.user_email == user_email).all()
        # Get all confirmed labels for this user
        confirmed_list = db.query(models.ConfirmedLabel).filter(models.ConfirmedLabel.user_email == user_email).all()
        confirmed_dict = {c.desc: c.category for c in confirmed_list}
        
        # Group by description to find unique ones and count them
        desc_data = {}
        for e in expenses:
            desc = e.desc.strip() if e.desc else ""
            if not desc:
                continue
            if desc not in desc_data:
                desc_data[desc] = {
                    "desc": desc,
                    "category": e.category,
                    "count": 0,
                    "confirmed": desc in confirmed_dict
                }
            desc_data[desc]["count"] += 1
            
        # Convert to list and sort by count descending
        jobs = list(desc_data.values())
        jobs.sort(key=lambda x: x["count"], reverse=True)
        return jsonify(jobs)
    finally:
        db.close()

# Confirm a label, save to DB, retrain model, and update all database records
@app.route("/api/confirm-label", methods=["POST"])
def confirm_label():
    data = request.json
    desc = data.get("desc", "").strip()
    category = data.get("category", "").strip()
    if not desc or not category:
        return jsonify({"detail": "Description and Category are required"}), 400
        
    db = get_db()
    try:
        user_email = get_user_email()
        # 1. Save or update in ConfirmedLabel for this user
        existing = db.query(models.ConfirmedLabel).filter(models.ConfirmedLabel.desc == desc, models.ConfirmedLabel.user_email == user_email).first()
        if existing:
            existing.category = category
        else:
            new_label = models.ConfirmedLabel(user_email=user_email, desc=desc, category=category)
            db.add(new_label)
        db.commit()

        # Feedback loop: ajari model kategorisasi dengan koreksi user ini
        try:
            ml_categorizer.record_correction(desc, category, user_email)
        except Exception as e:
            print(f"record_correction (confirm_label) failed: {e}")

        # 2. Re-klasifikasi semua transaksi user memakai model + kamus personal terbaru
        expenses = db.query(models.Expense).filter(models.Expense.user_email == user_email).all()

        # Fetch all confirmed labels for this user
        confirmed_list = db.query(models.ConfirmedLabel).filter(models.ConfirmedLabel.user_email == user_email).all()
        confirmed_dict = {c.desc: c.category for c in confirmed_list}

        # Prediksi ulang kategori tiap deskripsi
        predictions_map = predict_categories([e.desc for e in expenses], user_email, confirmed_dict)
        
        # Update each expense in the database
        for e in expenses:
            e_desc = e.desc.strip() if e.desc else ""
            if e_desc in predictions_map:
                e.category = predictions_map[e_desc]
        db.commit()
        
        return jsonify({"message": "Label confirmed and model retrained successfully"}), 200
    except Exception as e:
        db.rollback()
        print(f"Error in confirm_label: {e}")
        return jsonify({"detail": str(e)}), 500
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
        
    # Format the name: capitalize the first letter of each word (Title Case)
    formatted_name = " ".join([w.capitalize() for w in name.split()])
    
    db = get_db()
    try:
        from sqlalchemy import func
        existing = db.query(models.Category).filter(func.lower(models.Category.name) == formatted_name.lower()).first()
        if existing:
            # If it already exists case-insensitively, return the existing capitalized category
            return jsonify({"name": existing.name}), 200
            
        category = models.Category(name=formatted_name)
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
        user_email = get_user_email()
        expenses = db.query(models.Expense).filter(models.Expense.user_email == user_email).order_by(models.Expense.date.desc()).all()
        incomes = db.query(models.Income).filter(models.Income.user_email == user_email).order_by(models.Income.date.desc()).all()
        
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
        user_email = get_user_email()
        db.query(models.Expense).filter(models.Expense.user_email == user_email).delete()
        db.query(models.Income).filter(models.Income.user_email == user_email).delete()
        db.commit()
        return jsonify({"message": "All transaction data cleared successfully"}), 200
    except Exception as e:
        db.rollback()
        return jsonify({"detail": str(e)}), 500
    finally:
        db.close()

# Telegram Account Connection Endpoints
@app.route("/api/telegram/status", methods=["GET"])
def get_telegram_status():
    db = get_db()
    try:
        user_email = get_user_email()
        conn = db.query(models.TelegramConnection).filter(models.TelegramConnection.user_email == user_email).first()
        
        # If no connection row exists, create one with a unique 6-digit OTP code
        if not conn:
            import random
            # Generate a unique 6-digit code
            while True:
                code = "".join([str(random.randint(0, 9)) for _ in range(6)])
                # Ensure code is unique in the database
                existing_code = db.query(models.TelegramConnection).filter(models.TelegramConnection.auth_code == code).first()
                if not existing_code:
                    break
            
            conn = models.TelegramConnection(user_email=user_email, auth_code=code, chat_id=None)
            db.add(conn)
            db.commit()
            db.refresh(conn)
            
        return jsonify({
            "connected": conn.chat_id is not None,
            "chat_id": conn.chat_id,
            "code": conn.auth_code
        }), 200
    except Exception as e:
        db.rollback()
        return jsonify({"detail": str(e)}), 500
    finally:
        db.close()

@app.route("/api/telegram/disconnect", methods=["POST"])
def disconnect_telegram():
    db = get_db()
    try:
        user_email = get_user_email()
        conn = db.query(models.TelegramConnection).filter(models.TelegramConnection.user_email == user_email).first()
        if conn:
            import random
            while True:
                code = "".join([str(random.randint(0, 9)) for _ in range(6)])
                existing_code = db.query(models.TelegramConnection).filter(models.TelegramConnection.auth_code == code).first()
                if not existing_code:
                    break
            conn.chat_id = None
            conn.auth_code = code
            db.commit()
            return jsonify({"message": "Telegram successfully disconnected", "code": code}), 200
        return jsonify({"detail": "No Telegram connection found"}), 404
    except Exception as e:
        db.rollback()
        return jsonify({"detail": str(e)}), 500
    finally:
        db.close()

# ==========================================
# TELEGRAM BOT & GEMINI AI INTEGRATION
# ==========================================

import os

# Load credentials from environment variables or a local .env file
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

# Simple helper to read .env if it exists in the root or parent directories
def load_local_env():
    global TELEGRAM_BOT_TOKEN, GEMINI_API_KEY
    for env_path in [".env", "backend/.env", "../.env"]:
        if os.path.exists(env_path):
            try:
                with open(env_path, "r") as f:
                    for line in f:
                        if "=" in line:
                            k, v = line.split("=", 1)
                            k = k.strip()
                            v = v.strip().strip('"').strip("'")
                            if k == "TELEGRAM_BOT_TOKEN" and not TELEGRAM_BOT_TOKEN:
                                TELEGRAM_BOT_TOKEN = v
                            elif k == "GEMINI_API_KEY" and not GEMINI_API_KEY:
                                GEMINI_API_KEY = v
            except Exception as e:
                print(f"Error loading local .env: {e}")
            break

load_local_env()

# Configure Gemini
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

def parse_expense_with_gemini(text, categories_list):
    """
    Uses Gemini 1.5 Flash to parse natural language input and return a structured JSON.
    """
    prompt = f"""
    Tugas Anda adalah menganalisis teks percakapan berikut dan mengekstrak informasi pengeluaran uang (expense) ke dalam format JSON.
    
    Daftar kategori pengeluaran yang tersedia: {categories_list}
    
    Aturan analisis:
    1. Jika teks berisi informasi pengeluaran uang (contoh: "makan siang sate padang 35 ribu", "beli bensin pertamax 50000", "bayar kosan 1.5jt", "tadi beli seblak 15.000"):
       Kembalikan JSON dengan format berikut:
       {{
         "is_expense": true,
         "desc": "deskripsi singkat transaksi (gunakan huruf kapital di awal setiap kata, contoh: 'Makan Bakso', 'Bensin Pertamax')",
         "amount": nominal angka saja (integer, konversikan kata seperti 'ribu' ke 1000, 'jt' atau 'juta' ke 1000000),
         "category": "pilih kategori yang paling cocok dari daftar di atas. Jika tidak ada yang cocok sama sekali, pilih 'Lain-lain'"
       }}
    2. Jika teks BUKAN merupakan informasi pengeluaran uang (contoh: "halo", "siapa kamu", "tolong beri saran hemat", "berapa pengeluaran saya"):
       Kembalikan JSON dengan format berikut:
       {{
         "is_expense": false,
         "reply": "Jawaban yang ramah, sopan, dan solutif untuk menjawab teks tersebut secara kontekstual sebagai asisten keuangan bernama MoneyMind"
       }}
       
    Teks pengguna: "{text}"
    
    Kembalikan HANYA string JSON yang valid. Jangan sertakan markdown block (seperti ```json) atau teks tambahan lainnya.
    """
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)
        
        # Bersihkan string respon dari kemungkinan markdown block
        clean_text = response.text.strip()
        if clean_text.startswith("```"):
            clean_text = re.sub(r'^```(?:json)?\n', '', clean_text)
            clean_text = re.sub(r'\n```$', '', clean_text)
            
        return json.loads(clean_text)
    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        return None

_easyocr_reader = None

def analyze_receipt_locally(image_bytes):
    """
    Analyzes receipt image locally using EasyOCR and a Decision Tree Classifier.
    Returns a dict with 'desc' and 'amount', or None if it fails.
    """
    global _easyocr_reader
    try:
        import easyocr
        import joblib
        import io
        from PIL import Image
        import numpy as np
        import pandas as pd
        
        # Initialize easyocr reader lazily to prevent startup slowdowns
        if _easyocr_reader is None:
            print("Initializing EasyOCR Reader (English & Indonesian)...")
            # Force CPU to avoid CUDA dependency issues
            _easyocr_reader = easyocr.Reader(['en', 'id'], gpu=False)
            
        # Convert bytes to numpy array
        image = Image.open(io.BytesIO(image_bytes))
        img_np = np.array(image)
        
        # Run EasyOCR
        results = _easyocr_reader.readtext(img_np)
        if not results:
            return {"error": "Tidak ada teks yang terdeteksi pada gambar struk secara lokal."}
            
        # Sort results by vertical position (y-coordinate of top-left box)
        results_sorted = sorted(results, key=lambda x: x[0][0][1])
        
        lines = [r[1] for r in results_sorted]
        total_lines = len(lines)
        
        if total_lines == 0:
            return {"error": "Struk kosong atau tidak terbaca secara lokal."}
            
        # Extract features for each line
        features = []
        keywords = ['total', 'jumlah', 'grand', 'bayar', 'rp', 'subtotal', 'netto']
        
        for idx, line in enumerate(lines):
            line_lower = line.lower()
            line_pos_ratio = idx / (total_lines - 1) if total_lines > 1 else 0.0
            has_total_keyword = 1 if any(kw in line_lower for kw in keywords) else 0
            has_number = 1 if re.search(r'\d', line) else 0
            
            features.append({
                'line_pos_ratio': line_pos_ratio,
                'has_total_keyword': has_total_keyword,
                'has_number': has_number
            })
            
        df_features = pd.DataFrame(features)
        
        # Load the Decision Tree model
        model_path = os.path.join(os.path.dirname(__file__), 'receipt_total_classifier.joblib')
        if not os.path.exists(model_path):
            return {"error": "File model receipt_total_classifier.joblib tidak ditemukan di folder backend."}
            
        clf = joblib.load(model_path)
        probs = clf.predict_proba(df_features)[:, 1]
        
        # Apply hard constraints (heuristics)
        for idx in range(total_lines):
            if df_features.loc[idx, 'has_number'] == 0:
                probs[idx] = 0.0
            if df_features.loc[idx, 'line_pos_ratio'] < 0.3:
                probs[idx] = 0.0
                
        # Find the maximum probability
        max_prob = np.max(probs)
        
        # Jika probabilitas tertinggi adalah 0.0, berarti tidak menemukan baris total yang valid
        if max_prob == 0.0:
            return {"error": "Tidak dapat mendeteksi nominal total belanja yang valid menggunakan model ML lokal."}
            
        # Dapatkan semua indeks baris yang memiliki probabilitas mendekati maksimum (selisih <= 0.01)
        candidate_indices = [i for i, p in enumerate(probs) if p >= max_prob - 0.01 and p > 0.0]
        
        # Dari kandidat tersebut, pilih baris dengan nominal angka terbesar (karena total belanja pasti yang terbesar)
        best_line_idx = candidate_indices[0]
        max_amount = -1
        
        for idx in candidate_indices:
            line_text = lines[idx]
            # Ekstrak nominal dari baris ini
            clean_line = line_text.replace(',', '').replace(' ', '')
            clean_line = re.sub(r'\.(\d{3})', r'\1', clean_line)
            clean_line = re.sub(r'\.(\d{2})$', '', clean_line)
            numbers_in_line = re.findall(r'\d+', clean_line)
            amount = int(numbers_in_line[-1]) if numbers_in_line else 0
            
            if amount > max_amount:
                max_amount = amount
                best_line_idx = idx
                
        predicted_total_line = lines[best_line_idx]
        amount = max_amount
        
        # Extract merchant name (first alphabetical line)
        merchant_name = "Struk Belanja"
        for line in lines:
            if len(re.findall(r'[a-zA-Z]', line)) >= 3 and not re.search(r'==|--|__', line):
                merchant_name = line.strip()
                break
                
        return {
            "desc": merchant_name,
            "amount": amount
        }
    except Exception as e:
        print(f"Error in local receipt analysis: {e}")
        return {"error": f"Gagal memproses gambar secara lokal: {str(e)}"}

def start_telegram_bot():
    if not TELEGRAM_BOT_TOKEN:
        print("Telegram Bot Token is not provided. Bot feature is disabled.")
        return
    bot = telebot.TeleBot(TELEGRAM_BOT_TOKEN)
    
    @bot.message_handler(commands=['start', 'help'])
    def send_welcome(message):
        welcome_text = (
            "👋 *Halo! Selamat datang di Money Mind Bot!*\n\n"
            "Saya adalah asisten keuangan pribadi Anda yang terhubung langsung dengan jurnal keuangan Anda.\n\n"
            "💬 *Cara mencatat lewat chat:* \n"
            "Ketik pengeluaran secara bebas dengan bahasa santai sehari-hari.\n"
            "Contoh: _makan siang sate padang 35 ribu_ atau _beli bensin 15000_\n\n"
            "📸 *Cara mencatat lewat foto struk:* \n"
            "Kirimkan foto struk belanja Anda langsung ke chat ini. Saya akan otomatis membaca nominal, nama toko, serta mengklasifikasikan kategorinya menggunakan model ML lokal Anda!\n\n"
            "🔗 *Cara menghubungkan ke Web Dashboard:*\n"
            "Silakan ketik `/connect <KODE_KHUSUS>` untuk menyambungkan bot ini ke akun web Money Mind Anda. Anda bisa mendapatkan kode tersebut dengan mengklik tombol 'Connect to Telegram' di kanan atas dashboard web Anda.\n\n"
            "🔌 *Cara memutus hubungan:*\n"
            "Ketik `/disconnect` untuk memutuskan hubungan akun Telegram ini dari dashboard web."
        )
        bot.reply_to(message, welcome_text, parse_mode="Markdown")
        
    @bot.message_handler(commands=['connect'])
    def connect_account(message):
        args = message.text.split()
        if len(args) < 2:
            bot.reply_to(
                message, 
                "⚠️ *Sertakan kode khusus Anda.*\n\n"
                "Contoh penggunaan:\n"
                "`/connect 123456`", 
                parse_mode="Markdown"
            )
            return
            
        code = args[1].strip()
        db = SessionLocal()
        try:
            conn = db.query(models.TelegramConnection).filter(models.TelegramConnection.auth_code == code).first()
            if not conn:
                bot.reply_to(
                    message, 
                    "❌ *Kode tidak valid.*\n\n"
                    "Kode otentikasi tidak ditemukan atau sudah kadaluarsa. Silakan cek ulang di dashboard web Anda.",
                    parse_mode="Markdown"
                )
                return
                
            # If this Telegram chat is already connected to another web account, unlink it first to avoid UNIQUE constraint violation
            existing_link = db.query(models.TelegramConnection).filter(models.TelegramConnection.chat_id == str(message.chat.id)).first()
            if existing_link:
                existing_link.chat_id = None
                db.flush()

            # Connect the chat ID
            conn.chat_id = str(message.chat.id)
            db.commit()
            bot.reply_to(
                message, 
                f"🎉 *Berhasil Terhubung!*\n\n"
                f"Akun Telegram Anda sekarang terhubung dengan email: *{conn.user_email}*.\n"
                f"Semua pencatatan keuangan yang Anda kirim ke bot ini akan masuk ke dashboard Money Mind Anda.",
                parse_mode="Markdown"
            )
        except Exception as e:
            db.rollback()
            bot.reply_to(message, f"❌ Terjadi kesalahan saat menghubungkan akun: {str(e)}")
        finally:
            db.close()
            
    @bot.message_handler(commands=['disconnect'])
    def disconnect_account_bot(message):
        db = SessionLocal()
        try:
            conn = db.query(models.TelegramConnection).filter(models.TelegramConnection.chat_id == str(message.chat.id)).first()
            if not conn:
                bot.reply_to(
                    message,
                    "⚠️ *Akun Anda belum terhubung.*\n\n"
                    "Tidak ada koneksi Telegram yang aktif untuk chat ini.",
                    parse_mode="Markdown"
                )
                return
            
            # Generate a new unique 6-digit code
            import random
            while True:
                code = "".join([str(random.randint(0, 9)) for _ in range(6)])
                existing_code = db.query(models.TelegramConnection).filter(models.TelegramConnection.auth_code == code).first()
                if not existing_code:
                    break
            
            conn.chat_id = None
            conn.auth_code = code
            db.commit()
            bot.reply_to(
                message,
                "🔌 *Berhasil Memutus Hubungan!*\n\n"
                "Koneksi Telegram ke akun Money Mind Anda telah dihapus. Bot ini tidak akan mencatat transaksi baru lagi ke dashboard Anda.\n\n"
                "Jika ingin menghubungkan kembali, Anda dapat menggunakan kode baru di dashboard web Anda.",
                parse_mode="Markdown"
            )
        except Exception as e:
            db.rollback()
            bot.reply_to(message, f"❌ Terjadi kesalahan saat memutus hubungan akun: {str(e)}")
        finally:
            db.close()
        
    @bot.message_handler(func=lambda message: True)
    def handle_user_message(message):
        # Check connection
        db = SessionLocal()
        user_email = None
        try:
            conn = db.query(models.TelegramConnection).filter(models.TelegramConnection.chat_id == str(message.chat.id)).first()
            if conn:
                user_email = conn.user_email
        except Exception as e:
            print(f"Error checking telegram connection: {e}")
        finally:
            db.close()

        if not user_email:
            bot.reply_to(
                message,
                "⚠️ *Akun Anda belum terhubung.*\n\n"
                "Untuk mencatat transaksi melalui bot ini, silakan hubungkan akun Telegram Anda terlebih dahulu dengan mengirimkan perintah:\n"
                "`/connect <KODE_KHUSUS>`\n\n"
                "Anda dapat menemukan kode tersebut pada tombol **Connect to Telegram** di dashboard web Anda.",
                parse_mode="Markdown"
            )
            return

        text = message.text.strip()
        
        # Ambil daftar kategori dari database
        db = get_db()
        try:
            categories_entities = db.query(models.Category).all()
            categories_list = [c.name for c in categories_entities]
        except Exception as e:
            print(f"Error fetching categories: {e}")
            categories_list = ["Makanan", "Transportasi", "Kebutuhan", "Lain-lain"]
        finally:
            db.close()
            
        # Panggil Gemini AI untuk melakukan parsing teks
        parsed = parse_expense_with_gemini(text, categories_list)
        
        if not parsed:
            bot.reply_to(message, "⚠️ Maaf, saya sedang kesulitan memproses pesan Anda. Silakan coba lagi beberapa saat lagi.")
            return
            
        if parsed.get("is_expense"):
            desc = parsed.get("desc")
            amount = parsed.get("amount")
            # Kategori ditentukan oleh MODEL KATEGORISASI LOKAL (bukan tebakan Gemini)
            try:
                category = ml_categorizer.categorize(desc, user_email)["category"]
            except Exception as e:
                print(f"Categorizer (telegram text) failed: {e}")
                category = parsed.get("category") or "Lain-lain"

            # Simpan transaksi ke database SQLite
            db = get_db()
            try:
                import datetime
                today = datetime.date.today()
                
                expense = models.Expense(
                    user_email=user_email,
                    amount=float(amount),
                    category=category,
                    desc=desc,
                    date=today.strftime("%Y-%m-%d"),
                    displayDate=today.strftime("%a, %b %d, %Y")
                )
                db.add(expense)
                db.commit()
                
                # Format nominal uang ke Rupiah dengan ribuan separator
                formatted_amount = f"Rp{int(amount):,}"
                
                success_msg = (
                    f"✅ *Pengeluaran Berhasil Dicatat!*\n\n"
                    f"📝 *Transaksi:* {desc}\n"
                    f"💰 *Jumlah:* {formatted_amount}\n"
                    f"🏷️ *Kategori:* {category}\n\n"
                    f"_Transaksi ini telah otomatis masuk ke jurnal keuangan web Money Mind Anda._"
                )
                bot.reply_to(message, success_msg, parse_mode="Markdown")
            except Exception as e:
                db.rollback()
                print(f"Error saving telegram expense: {e}")
                bot.reply_to(message, f"❌ Gagal menyimpan transaksi ke database: {str(e)}")
            finally:
                db.close()
        else:
            # Jika bukan pengeluaran, kirimkan balasan ramah dari AI
            reply_text = parsed.get("reply", "Halo! Ada yang bisa saya bantu dengan keuangan Anda hari ini?")
            bot.reply_to(message, reply_text)
            
    @bot.message_handler(content_types=['photo'])
    def handle_receipt_photo(message):
        # Check connection
        db = SessionLocal()
        user_email = None
        try:
            conn = db.query(models.TelegramConnection).filter(models.TelegramConnection.chat_id == str(message.chat.id)).first()
            if conn:
                user_email = conn.user_email
        except Exception as e:
            print(f"Error checking telegram connection: {e}")
        finally:
            db.close()

        if not user_email:
            bot.reply_to(
                message,
                "⚠️ *Akun Anda belum terhubung.*\n\n"
                "Untuk mengolah struk melalui bot ini, silakan hubungkan akun Telegram Anda terlebih dahulu melalui perintah:\n"
                "`/connect <KODE_KHUSUS>`\n\n"
                "Anda dapat menemukan kode tersebut pada tombol **Connect to Telegram** di dashboard web Anda.",
                parse_mode="Markdown"
            )
            return

        processing_msg = bot.reply_to(message, "📸 *Struk diterima!* Sedang menganalisis foto menggunakan Model ML Lokal...", parse_mode="Markdown")
        
        try:
            # 1. Unduh foto ukuran terbesar
            photo = message.photo[-1]
            file_info = bot.get_file(photo.file_id)
            downloaded_file = bot.download_file(file_info.file_path)
            
            # 2. Ekstrak deskripsi dan nominal belanja menggunakan EasyOCR + Decision Tree secara lokal
            parsed = analyze_receipt_locally(downloaded_file)
            
            if not parsed:
                bot.edit_message_text(
                    chat_id=message.chat.id,
                    message_id=processing_msg.message_id,
                    text="⚠️ Gagal menganalisis gambar struk Anda. Pastikan gambar struk Anda cukup terang dan jelas."
                )
                return
                
            if "error" in parsed:
                bot.edit_message_text(
                    chat_id=message.chat.id,
                    message_id=processing_msg.message_id,
                    text=f"⚠️ {parsed['error']}"
                )
                return
                
            desc = parsed.get("desc")
            amount = parsed.get("amount")
            
            if not desc or not amount:
                bot.edit_message_text(
                    chat_id=message.chat.id,
                    message_id=processing_msg.message_id,
                    text="⚠️ Tidak dapat menemukan informasi nama toko atau total nominal dari struk tersebut."
                )
                return
                
            # 3. Klasifikasi Kategori menggunakan MODEL KATEGORISASI LOKAL (rules + Naive Bayes + kamus personal)
            try:
                category = ml_categorizer.categorize(desc, user_email)["category"]
            except Exception as e:
                print(f"Error classifying category locally: {e}")
                category = "Lain-lain"
                
            # 4. Simpan transaksi ke database SQLite
            db = get_db()
            try:
                import datetime
                today = datetime.date.today()
                
                expense = models.Expense(
                    user_email=user_email,
                    amount=float(amount),
                    category=category,
                    desc=desc,
                    date=today.strftime("%Y-%m-%d"),
                    displayDate=today.strftime("%a, %b %d, %Y")
                )
                db.add(expense)
                db.commit()
                
                formatted_amount = f"Rp{int(amount):,}"
                
                success_msg = (
                    f"🧾 *Struk Berhasil Diolah secara Lokal!*\n\n"
                    f"🏪 *Toko/Merchant:* {desc}\n"
                    f"💰 *Total Belanja:* {formatted_amount}\n"
                    f"🏷️ *Kategori (Model ML Lokal):* {category}\n\n"
                    f"_Transaksi ini telah otomatis dimasukkan ke jurnal keuangan web Anda._"
                )
                bot.edit_message_text(
                    chat_id=message.chat.id,
                    message_id=processing_msg.message_id,
                    text=success_msg,
                    parse_mode="Markdown"
                )
            except Exception as e:
                db.rollback()
                print(f"Error saving receipt expense: {e}")
                bot.edit_message_text(
                    chat_id=message.chat.id,
                    message_id=processing_msg.message_id,
                    text=f"❌ Gagal menyimpan transaksi dari struk ke database: {str(e)}"
                )
            finally:
                db.close()
                
        except Exception as e:
            print(f"Error in handle_receipt_photo: {e}")
            bot.edit_message_text(
                chat_id=message.chat.id,
                message_id=processing_msg.message_id,
                text=f"❌ Terjadi kesalahan sistem saat memproses foto: {str(e)}"
            )

    try:
        print("Starting Telegram Bot polling...")
        bot.infinity_polling(timeout=10, long_polling_timeout=5)
    except Exception as e:
        print(f"Telegram Bot polling stopped: {e}")

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
        # Fallback to index.html for SPA routing.
        # index.html must never be cached, otherwise the browser keeps loading an old
        # bundle after a rebuild. The hashed assets it references can cache forever.
        resp = send_file(os.path.join(static_dir, "index.html"))
        resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        resp.headers["Pragma"] = "no-cache"
        resp.headers["Expires"] = "0"
        return resp

# Start Telegram Bot in a background thread (runs both on local debug server and production WSGI Gunicorn)
if not globals().get("_bot_thread_started", False):
    # Only launch the bot in the main Werkzeug reloader child process to avoid duplicate bot instances in debug mode
    if not app.debug or os.environ.get('WERKZEUG_RUN_MAIN') == 'true':
        globals()["_bot_thread_started"] = True
        print("Launching Telegram Bot in background thread...")
        threading.Thread(target=start_telegram_bot, daemon=True).start()

if __name__ == "__main__":
    # Get port from environment variable (Render sets this dynamically)
    port = int(os.environ.get("PORT", 8000))
    app.run(host="127.0.0.1", port=port, debug=app.debug)
