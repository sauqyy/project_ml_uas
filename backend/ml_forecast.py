"""
ml_forecast.py — Integrasi pipeline forecast/budget/anomaly ke MoneyMind.

Adaptasi dari `Model Tambahan/forecast_budget_pipeline.py`:
- Forecast pengeluaran harian pakai Prophet (cold-start gating).
- Budget monitor: proyeksi kumulatif vs target tabungan & pendapatan.
- Anomaly detection: modified z-score (median + MAD), keputusan user diingat.

Sumber data: `Data - Excel.xlsx - Sheet1.csv` di root project (1 tahun histori),
supaya forecast menghasilkan angka nyata (bukan cold-start).
Storage model & keputusan: `backend/storage/`.
"""

import json
import re
import pickle
import calendar
from pathlib import Path
from datetime import date
from typing import Dict, Optional

import numpy as np
import pandas as pd

_BASE_DIR = Path(__file__).resolve().parent
_PROJECT_ROOT = _BASE_DIR.parent
DATA_CSV = _PROJECT_ROOT / "Data - Excel.xlsx - Sheet1.csv"
STORAGE_DIR = _BASE_DIR / "storage"
DATASET_USER_ID = "sheet1_dataset"  # dataset showcase bersama

# ---- Konfigurasi cold-start & retrain ----
MIN_DAYS_TO_START = 21
RETRAIN_EVERY_N_NEW_DAYS = 7
DRIFT_MAE_MULTIPLIER = 1.5
DRIFT_MIN_SAMPLES = 5


# ============================================================
# LOAD & BERSIHKAN DATA
# ============================================================

def parse_jumlah(value) -> float:
    if pd.isna(value):
        return 0.0
    text = str(value).strip()
    if not text:
        return 0.0
    text = text.replace("Rp", "").replace("rp", "").replace(" ", "")
    text = re.sub(r"[^0-9,\.\-]", "", text)
    if not text:
        return 0.0
    text = text.replace(".", "").replace(",", ".")
    match = re.search(r"-?\d+(?:\.\d+)?", text)
    if match:
        try:
            number_text = match.group(0)
            sign = -1 if number_text.startswith("-") else 1
            return sign * float(number_text.replace("-", ""))
        except ValueError:
            return 0.0
    return 0.0


def parse_tanggal_transaksi(series: pd.Series) -> pd.Series:
    text = series.astype(str)
    is_slash_format = text.str.contains("/")
    parsed = pd.to_datetime(series, format="mixed", errors="coerce")
    if is_slash_format.any():
        parsed_slash = pd.to_datetime(
            series[is_slash_format], format="mixed", dayfirst=True, errors="coerce"
        )
        parsed.loc[is_slash_format] = parsed_slash
    return parsed


def load_transactions(csv_path: Optional[str] = None) -> pd.DataFrame:
    path = Path(csv_path) if csv_path else DATA_CSV
    df = pd.read_csv(path)
    df["Tanggal Transaksi"] = parse_tanggal_transaksi(df["Tanggal Transaksi"])
    df = df.dropna(subset=["Tanggal Transaksi"]).copy()
    df["Jumlah_num"] = df["Jumlah"].apply(parse_jumlah)
    df_out = df[df["Jumlah_num"] < 0].copy()
    df_out["Jumlah_abs"] = df_out["Jumlah_num"].abs()
    if "ID Transaksi" not in df_out.columns:
        df_out["ID Transaksi"] = df_out.index.astype(str)
    df_out["ID Transaksi"] = df_out["ID Transaksi"].astype(str)
    return df_out.reset_index(drop=True)


def build_daily_series(df_out: pd.DataFrame, exclude_ids: Optional[set] = None) -> pd.DataFrame:
    exclude_ids = exclude_ids or set()
    df_use = df_out[~df_out["ID Transaksi"].isin(exclude_ids)].copy()
    df_use["tanggal"] = df_use["Tanggal Transaksi"].dt.normalize()
    daily = (
        df_use.groupby("tanggal")["Jumlah_abs"].sum().rename("y").reset_index()
        .sort_values("tanggal")
    )
    full_range = pd.date_range(daily["tanggal"].min(), daily["tanggal"].max(), freq="D")
    daily = daily.set_index("tanggal").reindex(full_range, fill_value=0.0).reset_index()
    daily.columns = ["ds", "y"]
    return daily


# ============================================================
# ANOMALY DETECTION + FEEDBACK LOOP
# ============================================================

class AnomalyStore:
    def __init__(self, storage_dir):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def _path(self, user_id: str) -> Path:
        return self.storage_dir / f"{user_id}.json"

    def load(self, user_id: str) -> Dict[str, str]:
        path = self._path(user_id)
        return json.load(open(path)) if path.exists() else {}

    def save_decision(self, user_id: str, transaksi_id: str, decision: str):
        assert decision in ("include", "exclude")
        data = self.load(user_id)
        data[str(transaksi_id)] = decision
        json.dump(data, open(self._path(user_id), "w"), indent=2)

    def get_excluded_ids(self, user_id: str) -> set:
        return {tid for tid, d in self.load(user_id).items() if d == "exclude"}


def detect_anomalies(df_out, user_id, store, moderate_z=3.0, severe_z=5.0):
    amounts = df_out["Jumlah_abs"].to_numpy(dtype=float)
    median = np.median(amounts)
    mad = np.median(np.abs(amounts - median))
    mad_safe = mad if mad > 0 else 1e-9
    modified_z = 0.6745 * (amounts - median) / mad_safe

    result = df_out.copy()
    result["robust_z"] = modified_z
    result["anomaly_level"] = np.select(
        [modified_z >= severe_z, modified_z >= moderate_z], ["severe", "moderate"], default="normal"
    )
    result["median_pengeluaran"] = median
    decisions = store.load(user_id)
    result["keputusan_user"] = result["ID Transaksi"].map(decisions).fillna("belum_diputuskan")
    return result


def get_pending_anomaly_review(anomaly_df):
    mask = (anomaly_df["anomaly_level"].isin(["moderate", "severe"])) & \
           (anomaly_df["keputusan_user"] == "belum_diputuskan")
    cols = ["ID Transaksi", "Tanggal Transaksi", "Transaksi", "Jumlah_abs",
            "median_pengeluaran", "anomaly_level", "Kategori"]
    return anomaly_df.loc[mask, cols].sort_values("Jumlah_abs", ascending=False)


# ============================================================
# MODEL MANAGER (cold-start + persistence + retrain feedback loop)
# ============================================================

class ModelManager:
    def __init__(self, storage_dir):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def _model_path(self, user_id):
        return self.storage_dir / f"{user_id}_model.pkl"

    def _log_path(self, user_id):
        return self.storage_dir / f"{user_id}_forecast_log.json"

    def get_status(self, user_id, daily):
        n_days = len(daily)
        if n_days < MIN_DAYS_TO_START:
            return {
                "status": "belum_siap",
                "alasan": "Data historis belum cukup untuk mulai memprediksi.",
                "hari_terkumpul": n_days,
                "hari_dibutuhkan": MIN_DAYS_TO_START,
                "kurang_lagi": MIN_DAYS_TO_START - n_days,
            }
        if not self._model_path(user_id).exists():
            return {"status": "siap_belum_ditraining", "hari_terkumpul": n_days}
        meta = self._load(user_id)["meta"]
        return {"status": "ready", "meta": meta}

    def _save(self, user_id, prophet_model, meta):
        from prophet.serialize import model_to_json
        payload = {"prophet_model_json": model_to_json(prophet_model), "meta": meta}
        with open(self._model_path(user_id), "wb") as f:
            pickle.dump(payload, f)

    def _load(self, user_id):
        with open(self._model_path(user_id), "rb") as f:
            return pickle.load(f)

    def _load_prophet_model(self, user_id):
        from prophet.serialize import model_from_json
        payload = self._load(user_id)
        return model_from_json(payload["prophet_model_json"]), payload["meta"]

    def train(self, user_id, daily):
        from prophet import Prophet
        from sklearn.metrics import mean_squared_error

        n = len(daily)
        split_idx = int(n * 0.8)
        train_df = daily.iloc[:split_idx][["ds", "y"]].copy()
        test_df = daily.iloc[split_idx:][["ds", "y"]].copy()

        backtest_model = Prophet(daily_seasonality=False, weekly_seasonality=True,
                                 yearly_seasonality=False, seasonality_mode="additive",
                                 changepoint_prior_scale=0.05)
        backtest_model.fit(train_df)
        future = backtest_model.make_future_dataframe(periods=len(test_df))
        pred = np.clip(backtest_model.predict(future)["yhat"].values[-len(test_df):], 0, None)
        backtest_rmse = float(np.sqrt(mean_squared_error(test_df["y"].values, pred))) if len(test_df) else None

        final_model = Prophet(daily_seasonality=False, weekly_seasonality=True,
                              yearly_seasonality=False, seasonality_mode="additive",
                              changepoint_prior_scale=0.05)
        final_model.fit(daily[["ds", "y"]].copy())

        meta = {
            "status": "ready",
            "trained_at": pd.Timestamp.now().isoformat(),
            "n_days_training": n,
            "last_data_date": daily["ds"].max().date().isoformat(),
            "backtest_rmse": backtest_rmse,
        }
        self._save(user_id, final_model, meta)
        return meta

    def should_retrain(self, user_id, daily):
        if not self._model_path(user_id).exists():
            return {"retrain": True, "alasan": "model_belum_ada"}
        meta = self._load(user_id)["meta"]
        n_new_days = len(daily) - meta["n_days_training"]
        if n_new_days >= RETRAIN_EVERY_N_NEW_DAYS:
            return {"retrain": True, "alasan": f"jadwal_terpenuhi (+{n_new_days} hari data baru)"}
        drift = self.check_drift(user_id, daily, meta)
        if drift.get("drift_terdeteksi"):
            return {"retrain": True, "alasan": "drift_terdeteksi", "drift_detail": drift}
        return {"retrain": False}

    def log_forecast(self, user_id, forecast_result):
        log_path = self._log_path(user_id)
        log = json.load(open(log_path)) if log_path.exists() else {}
        made_at = pd.Timestamp.now().isoformat()
        for row in forecast_result["forecast"]:
            log[row["date"]] = {"predicted_expense": row["predicted_expense"], "made_at": made_at}
        json.dump(log, open(log_path, "w"), indent=2)

    def check_drift(self, user_id, daily, meta):
        log_path = self._log_path(user_id)
        if not log_path.exists() or meta.get("backtest_rmse") is None:
            return {"drift_terdeteksi": False, "alasan": "belum_ada_log_atau_baseline"}
        log = json.load(open(log_path))
        daily_indexed = daily.set_index(daily["ds"].dt.date.astype(str))["y"]
        errors = []
        for tgl_str, entry in log.items():
            if tgl_str in daily_indexed.index:
                actual = daily_indexed.loc[tgl_str]
                errors.append(abs(actual - entry["predicted_expense"]))
        if len(errors) < DRIFT_MIN_SAMPLES:
            return {"drift_terdeteksi": False, "alasan": "sampel_evaluasi_belum_cukup", "n_sampel": len(errors)}
        mae_terbaru = float(np.mean(errors))
        ambang = meta["backtest_rmse"] * DRIFT_MAE_MULTIPLIER
        return {
            "drift_terdeteksi": mae_terbaru > ambang,
            "mae_terbaru": round(mae_terbaru, 2),
            "ambang_drift": round(ambang, 2),
            "n_sampel": len(errors),
        }


# ============================================================
# BUDGET MONITOR
# ============================================================

def check_budget_warning(daily, forecast_result, income, savings_target, today=None):
    if today is None:
        today = date.today()
    max_pengeluaran_aman = income - savings_target
    if max_pengeluaran_aman <= 0:
        return {"error": "Target tabungan >= pendapatan, tidak ada ruang pengeluaran sama sekali."}

    month_start = today.replace(day=1)
    days_in_month = calendar.monthrange(today.year, today.month)[1]
    month_end = today.replace(day=days_in_month)

    daily_this_month = daily[(daily["ds"].dt.date >= month_start) & (daily["ds"].dt.date <= today)]
    actual_so_far = float(daily_this_month["y"].sum())

    forecast_rows = [
        r for r in forecast_result["forecast"]
        if month_start <= date.fromisoformat(r["date"]) <= month_end
    ]

    cumulative = actual_so_far
    tanggal_lewat_target, tanggal_lewat_income = None, None
    if cumulative > max_pengeluaran_aman:
        tanggal_lewat_target = today
    if cumulative > income:
        tanggal_lewat_income = today

    for row in forecast_rows:
        cumulative += row["predicted_expense"]
        d = date.fromisoformat(row["date"])
        if tanggal_lewat_target is None and cumulative > max_pengeluaran_aman:
            tanggal_lewat_target = d
        if tanggal_lewat_income is None and cumulative > income:
            tanggal_lewat_income = d
        if tanggal_lewat_target and tanggal_lewat_income:
            break

    def _fmt(d):
        return None if d is None else {"tanggal": d.isoformat(), "h_minus": (d - today).days}

    warnings_list = []
    if tanggal_lewat_target:
        info = _fmt(tanggal_lewat_target)
        kata = "SUDAH melewati" if info["h_minus"] <= 0 else "akan MELEWATI"
        warnings_list.append(f"Pengeluaran {kata} target tabungan sekitar {info['tanggal']} (H{info['h_minus']:+d}).")
    if tanggal_lewat_income:
        info = _fmt(tanggal_lewat_income)
        kata = "SUDAH melewati" if info["h_minus"] <= 0 else "akan MELEWATI"
        warnings_list.append(f"Pengeluaran {kata} total pendapatan bulan ini (defisit) sekitar {info['tanggal']} (H{info['h_minus']:+d}).")
    if not warnings_list:
        warnings_list.append("Aman - proyeksi pengeluaran bulan ini masih dalam batas target tabungan.")

    return {
        "actual_so_far_bulan_ini": round(actual_so_far, 2),
        "max_pengeluaran_aman": round(max_pengeluaran_aman, 2),
        "income": income,
        "savings_target": savings_target,
        "proyeksi_lewat_target_tabungan": _fmt(tanggal_lewat_target),
        "proyeksi_lewat_pendapatan": _fmt(tanggal_lewat_income),
        "pesan": warnings_list,
    }


# ============================================================
# WRAPPER UTAMA — bekerja dari transaksi akun user (DB), per user_id
# ============================================================

class ExpenseForecaster:
    def __init__(self, user_id, df_out, storage_dir=STORAGE_DIR):
        self.user_id = user_id
        self.anomaly_store = AnomalyStore(Path(storage_dir) / "anomaly_decisions")
        self.model_manager = ModelManager(Path(storage_dir) / "models")
        self.df_out = df_out
        self.refresh()

    def refresh(self):
        self.anomaly_df = detect_anomalies(self.df_out, self.user_id, self.anomaly_store)
        excluded = self.anomaly_store.get_excluded_ids(self.user_id)
        self.daily = build_daily_series(self.df_out, exclude_ids=excluded)

    def pending_anomaly_review(self):
        return get_pending_anomaly_review(self.anomaly_df)

    def status(self):
        return self.model_manager.get_status(self.user_id, self.daily)

    def get_forecast(self, days=30, force_retrain=False):
        st = self.status()
        if st["status"] == "belum_siap":
            return {"status": "belum_siap", **st}

        retrain_check = {"retrain": True} if force_retrain else self.model_manager.should_retrain(self.user_id, self.daily)
        if retrain_check["retrain"]:
            self.model_manager.train(self.user_id, self.daily)

        model, meta = self.model_manager._load_prophet_model(self.user_id)
        future = model.make_future_dataframe(periods=days)
        forecast = model.predict(future)
        pred_values = np.clip(forecast["yhat"].values[-days:], 0, None)
        future_dates = pd.date_range(self.daily["ds"].max() + pd.Timedelta(days=1), periods=days)

        # Get actual daily spending for the last 3 days
        actual_rows = []
        last_actuals = self.daily.tail(3)
        for _, r in last_actuals.iterrows():
            actual_rows.append({
                "date": r["ds"].date().isoformat(),
                "actual_expense": round(float(r["y"]), 2)
            })

        result = {
            "status": "ready",
            "selected_model": "Prophet",
            "meta": meta,
            "actuals": actual_rows,
            "forecast": [
                {"date": d.date().isoformat(), "predicted_expense": round(float(v), 2)}
                for d, v in zip(future_dates, pred_values)
            ],
        }
        self.model_manager.log_forecast(self.user_id, result)
        return result

    def check_budget(self, income, savings_target, days=30, today=None):
        forecast_result = self.get_forecast(days=days)
        if forecast_result["status"] == "belum_siap":
            return forecast_result
        return check_budget_warning(self.daily, forecast_result, income, savings_target, today=today)


# ============================================================
# API MODUL (dipakai main.py) — per user, dari transaksi akun (DB)
# ============================================================

def _sanitize(user_email: str) -> str:
    return re.sub(r"[^a-zA-Z0-9]+", "_", (user_email or "default").lower()).strip("_") or "default"


def _expenses_to_df(expenses: list) -> pd.DataFrame:
    """Ubah list transaksi DB [{id, desc, amount, date}] jadi df_out yang dipakai pipeline."""
    rows = []
    for e in expenses:
        dt = pd.to_datetime(e.get("date"), errors="coerce")
        if pd.isna(dt):
            continue
        amt = abs(float(e.get("amount") or 0))
        if amt <= 0:
            continue
        rows.append({
            "ID Transaksi": str(e.get("id")),
            "Transaksi": e.get("desc") or "",
            "Tanggal Transaksi": dt,
            "Jumlah_abs": amt,
            "Kategori": e.get("category") or "Lain-lain",
        })
    return pd.DataFrame(rows, columns=["ID Transaksi", "Transaksi", "Tanggal Transaksi", "Jumlah_abs", "Kategori"])


def _belum_siap(n_days: int) -> dict:
    return {
        "status": "belum_siap",
        "hari_terkumpul": n_days,
        "hari_dibutuhkan": MIN_DAYS_TO_START,
        "kurang_lagi": max(0, MIN_DAYS_TO_START - n_days),
    }


def get_forecast(user_email: str, expenses: list, days: int = 14) -> dict:
    df = _expenses_to_df(expenses)
    if df.empty:
        return _belum_siap(0)
    f = ExpenseForecaster(_sanitize(user_email), df)
    return f.get_forecast(days=days)


def budget_status(user_email: str, expenses: list, income: float,
                  savings_target: float, days: int = 30) -> dict:
    df = _expenses_to_df(expenses)
    if df.empty:
        return _belum_siap(0)
    f = ExpenseForecaster(_sanitize(user_email), df)
    today = f.daily["ds"].max().date()
    return f.check_budget(income=income, savings_target=savings_target, days=days, today=today)


def pending_anomalies(user_email: str, expenses: list, limit: int = 20) -> list:
    df = _expenses_to_df(expenses)
    if df.empty:
        return []
    f = ExpenseForecaster(_sanitize(user_email), df)
    review = f.pending_anomaly_review().head(limit)
    out = []
    for _, r in review.iterrows():
        out.append({
            "id": str(r["ID Transaksi"]),
            "transaksi": str(r["Transaksi"]),
            "tanggal": pd.Timestamp(r["Tanggal Transaksi"]).date().isoformat(),
            "jumlah": round(float(r["Jumlah_abs"]), 2),
            "median_pengeluaran": round(float(r["median_pengeluaran"]), 2),
            "anomaly_level": str(r["anomaly_level"]),
            "category": str(r["Kategori"]) if "Kategori" in r else "Lain-lain"
        })
    return out


def decide_anomaly(user_email: str, transaksi_id: str, keep_as_routine: bool) -> dict:
    """Simpan keputusan user (tanpa perlu rebuild data)."""
    store = AnomalyStore(STORAGE_DIR / "anomaly_decisions")
    store.save_decision(_sanitize(user_email), str(transaksi_id),
                        "include" if keep_as_routine else "exclude")
    return {"ok": True, "transaksi_id": str(transaksi_id),
            "decision": "include" if keep_as_routine else "exclude"}
