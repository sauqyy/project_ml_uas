"""
PIPELINE FORECAST PENGELUARAN - VERSI PRODUCTION
=====================================================================
Fitur:
1. COLD START GATING: sistem TIDAK memprediksi apa-apa sampai data historis
   user cukup (MIN_DAYS_TO_START hari). Selama belum cukup, status eksplisit
   "belum_siap" dikembalikan (bukan fallback diam-diam yang bisa menyesatkan).
2. MODEL PERSISTENCE: model Prophet ditraining SEKALI, disimpan ke disk,
   dipakai ulang untuk prediksi tanpa training ulang tiap request.
3. FEEDBACK LOOP:
   a. Anomaly decision - user putuskan transaksi besar itu rutin/one-time,
      keputusan diingat (dari versi sebelumnya).
   b. Scheduled retrain - model otomatis retrain tiap ada N hari data baru.
   c. Drift detection - prediksi masa lalu dibandingkan ke actual yang sudah
      terjadi; kalau error jauh lebih besar dari backtest RMSE awal, model
      dianggap "usang" (pola pengeluaran user berubah) dan di-retrain lebih
      cepat dari jadwal.
4. Budget monitor & anomaly detection (dari versi sebelumnya, tidak berubah).

FORMAT MODEL: disimpan sebagai .pkl (pickle) berisi dict:
    {
        "prophet_model_json": <string, hasil prophet.serialize.model_to_json>,
        "meta": {status, trained_at, n_days_training, backtest_rmse, ...}
    }
Prophet sendiri merekomendasikan serialisasi lewat model_to_json/model_from_json
(bukan pickle mentah ke objek Prophet-nya langsung, karena ada komponen Stan di
dalamnya yang kadang tidak stabil di-pickle). Kita tetap bungkus jadi satu file
.pkl di luar supaya konsisten dengan format model kategorisasi sebelumnya.
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

LOCAL_CSV = "Data -ML - Sheet1.csv"

# ---- Konfigurasi cold-start & retrain ----
MIN_DAYS_TO_START = 21          # minimal hari data historis sebelum model aktif
RETRAIN_EVERY_N_NEW_DAYS = 7    # retrain terjadwal tiap ada 7 hari data baru
DRIFT_MAE_MULTIPLIER = 1.5      # kalau error terbaru > 1.5x backtest RMSE -> retrain paksa
DRIFT_MIN_SAMPLES = 5           # minimal 5 hari actual-vs-prediksi sebelum drift dicek


# ============================================================
# BAGIAN 1: LOAD & BERSIHKAN DATA (semua expense dihitung)
# ============================================================

def find_data_file(filename: str = LOCAL_CSV) -> Path:
    candidates = [
        Path.cwd() / filename,
        Path(__file__).resolve().parent / filename,
        Path.home() / "Downloads" / filename,
    ]
    for path in candidates:
        if path.exists():
            return path
    raise FileNotFoundError(f"File '{filename}' tidak ditemukan.")


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
    """Parse tanggal transaksi secara robust untuk 2 format:
    - ISO/database style: '2025-06-01 17:28:00' (tidak ambigu, JANGAN pakai dayfirst)
    - Slash style dari mutasi bank: '01/06/2025 17:28' (ambigu, HARUS pakai dayfirst=True)
    Kalau keduanya diparse dengan dayfirst=True secara seragam (seperti kode awal),
    string ISO yang unambiguous bisa ke-parse KELIRU (tanggal & bulan tertukar).
    """
    text = series.astype(str)
    is_slash_format = text.str.contains("/")

    parsed = pd.to_datetime(series, format="mixed", errors="coerce")  # default: cocok untuk ISO
    if is_slash_format.any():
        parsed_slash = pd.to_datetime(
            series[is_slash_format], format="mixed", dayfirst=True, errors="coerce"
        )
        parsed.loc[is_slash_format] = parsed_slash
    return parsed


def load_transactions(csv_path: Optional[str] = None) -> pd.DataFrame:
    path = find_data_file(csv_path) if csv_path is None else Path(csv_path)
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
# BAGIAN 2: ANOMALY DETECTION + FEEDBACK LOOP (keputusan user diingat)
# ============================================================

class AnomalyStore:
    def __init__(self, storage_dir: str = "storage/anomaly_decisions"):
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


def detect_anomalies(df_out: pd.DataFrame, user_id: str, store: AnomalyStore,
                      moderate_z: float = 3.0, severe_z: float = 5.0) -> pd.DataFrame:
    """Modified z-score berbasis median+MAD -> threshold adaptif per user,
    tidak hardcoded, robust terhadap outlier itu sendiri."""
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


def get_pending_anomaly_review(anomaly_df: pd.DataFrame) -> pd.DataFrame:
    mask = (anomaly_df["anomaly_level"].isin(["moderate", "severe"])) & \
           (anomaly_df["keputusan_user"] == "belum_diputuskan")
    cols = ["ID Transaksi", "Tanggal Transaksi", "Transaksi", "Jumlah_abs",
            "median_pengeluaran", "anomaly_level"]
    return anomaly_df.loc[mask, cols].sort_values("Jumlah_abs", ascending=False)


# ============================================================
# BAGIAN 3: MODEL MANAGER (cold-start gating + persistence + retrain feedback loop)
# ============================================================

class ModelManager:
    """
    Mengelola siklus hidup model forecast per user:
      - Cek apakah data cukup untuk mulai prediksi (cold start gating)
      - Training model + simpan ke .pkl (tidak retrain tiap request)
      - Retrain terjadwal tiap N hari data baru terkumpul
      - Drift detection: bandingkan prediksi lama vs actual, retrain lebih awal
        kalau modelnya udah nggak akurat lagi
    """

    def __init__(self, storage_dir: str = "storage/models"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def _model_path(self, user_id: str) -> Path:
        return self.storage_dir / f"{user_id}_model.pkl"

    def _log_path(self, user_id: str) -> Path:
        return self.storage_dir / f"{user_id}_forecast_log.json"

    # ---------- status / cold start ----------

    def get_status(self, user_id: str, daily: pd.DataFrame) -> Dict:
        n_days = len(daily)
        if n_days < MIN_DAYS_TO_START:
            return {
                "status": "belum_siap",
                "alasan": "Data historis belum cukup untuk mulai memprediksi.",
                "hari_terkumpul": n_days,
                "hari_dibutuhkan": MIN_DAYS_TO_START,
                "kurang_lagi": MIN_DAYS_TO_START - n_days,
            }
        model_path = self._model_path(user_id)
        if not model_path.exists():
            return {"status": "siap_belum_ditraining", "hari_terkumpul": n_days}
        meta = self._load(user_id)["meta"]
        return {"status": "ready", "meta": meta}

    # ---------- persistence ----------

    def _save(self, user_id: str, prophet_model, meta: Dict):
        from prophet.serialize import model_to_json
        payload = {"prophet_model_json": model_to_json(prophet_model), "meta": meta}
        with open(self._model_path(user_id), "wb") as f:
            pickle.dump(payload, f)

    def _load(self, user_id: str) -> Dict:
        with open(self._model_path(user_id), "rb") as f:
            return pickle.load(f)

    def _load_prophet_model(self, user_id: str):
        from prophet.serialize import model_from_json
        payload = self._load(user_id)
        return model_from_json(payload["prophet_model_json"]), payload["meta"]

    # ---------- training ----------

    def train(self, user_id: str, daily: pd.DataFrame) -> Dict:
        from prophet import Prophet
        from sklearn.metrics import mean_squared_error

        n = len(daily)
        split_idx = int(n * 0.8)
        train_df = daily.iloc[:split_idx][["ds", "y"]].copy()
        test_df = daily.iloc[split_idx:][["ds", "y"]].copy()

        # backtest dulu buat catat RMSE baseline (dipakai referensi drift detection)
        backtest_model = Prophet(daily_seasonality=False, weekly_seasonality=True,
                                  yearly_seasonality=False, seasonality_mode="additive",
                                  changepoint_prior_scale=0.05)
        backtest_model.fit(train_df)
        future = backtest_model.make_future_dataframe(periods=len(test_df))
        pred = np.clip(backtest_model.predict(future)["yhat"].values[-len(test_df):], 0, None)
        backtest_rmse = float(np.sqrt(mean_squared_error(test_df["y"].values, pred))) if len(test_df) else None

        # model final: retrain ke SELURUH data historis untuk dipakai produksi
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

    def should_retrain(self, user_id: str, daily: pd.DataFrame) -> Dict:
        """Cek 2 pemicu retrain: (1) jadwal - cukup banyak hari data baru,
        (2) drift - prediksi lama meleset jauh dari actual."""
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

    # ---------- feedback loop: drift detection ----------

    def log_forecast(self, user_id: str, forecast_result: Dict):
        """Simpan snapshot prediksi supaya nanti bisa dibandingkan ke actual."""
        log_path = self._log_path(user_id)
        log = json.load(open(log_path)) if log_path.exists() else {}
        made_at = pd.Timestamp.now().isoformat()
        for row in forecast_result["forecast"]:
            # kalau tanggal yang sama diprediksi ulang, timpa dengan prediksi terbaru
            log[row["date"]] = {"predicted_expense": row["predicted_expense"], "made_at": made_at}
        json.dump(log, open(log_path, "w"), indent=2)

    def check_drift(self, user_id: str, daily: pd.DataFrame, meta: Dict) -> Dict:
        """Bandingkan prediksi yang pernah dibuat vs actual yang sudah terjadi.
        Kalau rata-rata error jauh lebih besar dari backtest_rmse awal, model
        dianggap sudah tidak merepresentasikan pola pengeluaran user terkini."""
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
# BAGIAN 4: BUDGET MONITOR
# ============================================================

def check_budget_warning(daily: pd.DataFrame, forecast_result: Dict,
                          income: float, savings_target: float,
                          today: Optional[date] = None) -> Dict:
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

    warnings = []
    if tanggal_lewat_target:
        info = _fmt(tanggal_lewat_target)
        kata = "SUDAH melewati" if info["h_minus"] <= 0 else "akan MELEWATI"
        warnings.append(f"Pengeluaran {kata} target tabungan sekitar {info['tanggal']} (H{info['h_minus']:+d}).")
    if tanggal_lewat_income:
        info = _fmt(tanggal_lewat_income)
        kata = "SUDAH melewati" if info["h_minus"] <= 0 else "akan MELEWATI"
        warnings.append(f"Pengeluaran {kata} total pendapatan bulan ini (defisit) sekitar {info['tanggal']} (H{info['h_minus']:+d}).")
    if not warnings:
        warnings.append("Aman - proyeksi pengeluaran bulan ini masih dalam batas target tabungan.")

    return {
        "actual_so_far_bulan_ini": round(actual_so_far, 2),
        "max_pengeluaran_aman": round(max_pengeluaran_aman, 2),
        "income": income,
        "proyeksi_lewat_target_tabungan": _fmt(tanggal_lewat_target),
        "proyeksi_lewat_pendapatan": _fmt(tanggal_lewat_income),
        "pesan": warnings,
    }


# ============================================================
# WRAPPER UTAMA
# ============================================================

class ExpenseForecaster:
    def __init__(self, csv_path: Optional[str] = None, user_id: str = "default_user",
                 storage_dir: str = "storage"):
        self.user_id = user_id
        self.anomaly_store = AnomalyStore(f"{storage_dir}/anomaly_decisions")
        self.model_manager = ModelManager(f"{storage_dir}/models")
        self.df_out = load_transactions(csv_path)
        self.refresh()

    def refresh(self):
        self.anomaly_df = detect_anomalies(self.df_out, self.user_id, self.anomaly_store)
        excluded = self.anomaly_store.get_excluded_ids(self.user_id)
        self.daily = build_daily_series(self.df_out, exclude_ids=excluded)

    # ---- anomaly feedback loop ----
    def pending_anomaly_review(self) -> pd.DataFrame:
        return get_pending_anomaly_review(self.anomaly_df)

    def decide_anomaly(self, transaksi_id: str, keep_as_routine: bool):
        decision = "include" if keep_as_routine else "exclude"
        self.anomaly_store.save_decision(self.user_id, transaksi_id, decision)
        self.refresh()

    # ---- cold start status ----
    def status(self) -> Dict:
        return self.model_manager.get_status(self.user_id, self.daily)

    # ---- forecast (dengan gating + auto retrain feedback loop) ----
    def get_forecast(self, days: int = 30, force_retrain: bool = False) -> Dict:
        status = self.status()
        if status["status"] == "belum_siap":
            return {"status": "belum_siap", **status}

        retrain_check = {"retrain": True} if force_retrain else self.model_manager.should_retrain(self.user_id, self.daily)
        if retrain_check["retrain"]:
            meta = self.model_manager.train(self.user_id, self.daily)
            print(f"[info] Model di-retrain. Alasan: {retrain_check.get('alasan', 'manual')}")
        else:
            meta = self.model_manager._load(self.user_id)["meta"]

        model, meta = self.model_manager._load_prophet_model(self.user_id)
        future = model.make_future_dataframe(periods=days)
        forecast = model.predict(future)
        pred_values = np.clip(forecast["yhat"].values[-days:], 0, None)
        future_dates = pd.date_range(self.daily["ds"].max() + pd.Timedelta(days=1), periods=days)

        result = {
            "status": "ready",
            "selected_model": "Prophet",
            "meta": meta,
            "forecast": [
                {"date": d.date().isoformat(), "predicted_expense": round(float(v), 2)}
                for d, v in zip(future_dates, pred_values)
            ],
        }
        self.model_manager.log_forecast(self.user_id, result)
        return result

    def check_budget(self, income: float, savings_target: float, days: int = 30,
                      today: Optional[date] = None) -> Dict:
        forecast_result = self.get_forecast(days=days)
        if forecast_result["status"] == "belum_siap":
            return forecast_result
        return check_budget_warning(self.daily, forecast_result, income, savings_target, today=today)


# ============================================================
# DEMO
# ============================================================

if __name__ == "__main__":
    CSV_PATH = "/mnt/user-data/uploads/Data_-ML_xlsx_-_Sheet1.csv"

    print("=" * 60)
    print("DEMO 1: SIMULASI COLD START (data dipotong jadi 10 hari pertama)")
    print("=" * 60)
    import shutil
    full_df_out = load_transactions(CSV_PATH)
    cutoff = full_df_out["Tanggal Transaksi"].min() + pd.Timedelta(days=10)
    small_df_out = full_df_out[full_df_out["Tanggal Transaksi"] <= cutoff]

    shutil.rmtree("/home/claude/storage_demo", ignore_errors=True)
    Path("/home/claude/storage_demo").mkdir(exist_ok=True)

    f_small = ExpenseForecaster.__new__(ExpenseForecaster)  # bypass __init__ (skip load csv)
    f_small.user_id = "demo_user"
    f_small.anomaly_store = AnomalyStore("/home/claude/storage_demo/anomaly_decisions")
    f_small.model_manager = ModelManager("/home/claude/storage_demo/models")
    f_small.df_out = small_df_out
    f_small.refresh()
    print("Status:", f_small.status())
    print("get_forecast() hasil:", f_small.get_forecast(days=7))

    print("\n" + "=" * 60)
    print("DEMO 2: DATA PENUH (harus sudah 'ready' dan bisa forecast)")
    print("=" * 60)
    f_full = ExpenseForecaster(csv_path=CSV_PATH, user_id="demo_user_full",
                                storage_dir="/home/claude/storage_demo")
    print("Status:", f_full.status())

    print("\n>>> Pending anomaly review:")
    print(f_full.pending_anomaly_review().head(5))

    print("\n>>> Forecast 14 hari:")
    result = f_full.get_forecast(days=14)
    print("Meta:", result["meta"])
    print(result["forecast"][:5])

    print("\n>>> Panggil get_forecast() LAGI - cek apakah retrain lagi atau pakai model tersimpan:")
    result2 = f_full.get_forecast(days=14)
    print("(Kalau tidak ada log '[info] Model di-retrain' di atas, berarti model dipakai dari cache, tidak retrain ulang)")

    print("\n>>> Budget check:")
    demo_today = f_full.daily["ds"].max().date()
    budget = check_budget_warning(f_full.daily, result, income=3_000_000, savings_target=800_000, today=demo_today)
    print(json.dumps(budget, indent=2, ensure_ascii=False))
