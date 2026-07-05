# Dokumentasi Sistem ML — Money Manager App

Dokumen ini menjelaskan dua sistem machine learning yang dipakai di aplikasi:

1. **Model Kategorisasi Transaksi** (`pipeline_kategorisasi.py`)
2. **Model Forecast Pengeluaran + Budget Monitor + Anomaly Detection** (`forecast_budget_pipeline.py`)

---

# 1. Model Kategorisasi Transaksi

## 1.1 Tujuan

Mengklasifikasikan setiap transaksi ke salah satu dari 4 kategori secara otomatis:
`Transportasi`, `Food & Dining`, `Belanja`, `Lain2`.

Contoh: input `"Gojek 5000"` → output `"Transportasi"`.

## 1.2 Arsitektur

Prediksi berjalan lewat 4 lapis, dicek berurutan — begitu satu lapis menemukan jawaban, langsung berhenti:

```
Input: "Gojek 5000"
   │
   ▼
1. RULE STATIS (dictionary keyword, global, berlaku semua user)
   │  match?  → langsung return, confidence 100%
   ▼ tidak match
2. KAMUS PERSONAL USER (hasil koreksi manual user sebelumnya)
   │  match?  → return, confidence 100% (preferensi user menang di atas rule statis)
   ▼ tidak match
3. MODEL NAIVE BAYES (TF-IDF + MultinomialNB, untuk merchant baru yang tak dikenal)
   │  confidence ≥ threshold (default 0.5)?  → return hasil ML
   ▼ confidence rendah
4. FALLBACK "Lain2" + flag "low_confidence_need_review" → UI harus minta konfirmasi user
```

**Kenapa urutannya begini:**
- Rule statis paling akurat untuk merchant yang sudah dikenal & sering berulang (≈97% dari data uji).
- Kamus personal user diprioritaskan di atas rule statis karena preferensi kategorisasi tiap orang bisa beda (misal ada yang mau taruh minimarket di "Food & Dining", bukan "Belanja").
- Model ML dipakai sebagai fallback untuk generalisasi ke merchant yang benar-benar baru, tidak ada di dictionary manapun.
- Kalau confidence ML rendah, sistem **tidak menebak sembarangan** — mending diakui tidak yakin dan minta user konfirmasi, daripada salah kategorisasi diam-diam.

## 1.3 Kenapa bukan BERT?

- Dataset training hanya ~1000 baris / ~240 merchant unik — terlalu kecil untuk fine-tuning transformer tanpa overfitting.
- Teks transaksi itu pendek (nama merchant, kode transaksi) bukan kalimat natural, jadi keunggulan pemahaman konteks BERT kurang kepakai.
- Naive Bayes + TF-IDF jauh lebih ringan di-deploy untuk kebutuhan real-time di app, dan hasilnya sudah 94% akurat pada data uji.

## 1.4 File yang Dihasilkan

| File | Isi |
|---|---|
| `pipeline_kategorisasi.py` | Source code: rule dictionary, fungsi training, class `Kategorizer` |
| `model_nb_kategori.pkl` | Model Naive Bayes yang sudah ditraining (TF-IDF + MultinomialNB dalam satu `sklearn.Pipeline`) |
| `hasil_kategorisasi.csv` | Data historis yang sudah dikategorikan (untuk referensi/audit) |
| `learned_dicts/{user_id}.json` | Kamus personal hasil koreksi tiap user (dibuat otomatis saat user pertama kali koreksi) |

## 1.5 Cara Pakai

```python
from pipeline_kategorisasi import Kategorizer

kat = Kategorizer(
    model_path="model_nb_kategori.pkl",
    user_id="user_123",
    threshold=0.5,
)

# Prediksi kategori
hasil, sumber, confidence = kat.predict("Gojek 5000")
# hasil="Transportasi", sumber="rule", confidence=1.0

hasil, sumber, confidence = kat.predict("J.CO Donuts Galaxy Mall")
# kalau tidak match rule/kamus, sumber bisa "ml" (dengan confidence) atau
# "low_confidence_need_review" jika model tidak yakin

# Kalau user mengoreksi hasil prediksi
kat.record_correction("J.CO Donuts Galaxy Mall", "Food & Dining")
# koreksi ini otomatis diprioritaskan untuk prediksi berikutnya dengan teks yang sama
```

Load model langsung tanpa class wrapper (misal untuk inspeksi):
```python
import joblib
pipeline = joblib.load("model_nb_kategori.pkl")
pipeline.predict(["contoh teks transaksi"])
pipeline.predict_proba(["contoh teks transaksi"])
```

## 1.6 Feedback Loop

**Koreksi kategorisasi per-user.** Saat user mengoreksi hasil prediksi lewat app:
```python
kat.record_correction(teks_transaksi, kategori_benar)
```
Koreksi disimpan ke `learned_dicts/{user_id}.json` sebagai pasangan `teks_bersih → kategori`. Prediksi berikutnya untuk teks yang **sama persis** (setelah dibersihkan/lowercase) langsung memakai keputusan ini, bukan tebak ulang.

**Batasan feedback loop ini:**
- Matching-nya **exact-text**, bukan fuzzy. Kalau user koreksi `"beli baju di pasar turi"`, input baru `"Beli baju baru di Pasar Turi"` (kata beda) **tidak otomatis ke-match**. Cocok untuk teks mutasi bank yang selalu identik (mis. "GRAB TRANSPORT"), kurang cocok untuk input manual bebas.
- Belum ada retraining otomatis model NB dari hasil koreksi — koreksi hanya masuk kamus personal, bukan menambah data training model. Kalau mau, kamus personal antar semua user bisa dikumpulkan secara berkala untuk retraining ulang `model_nb_kategori.pkl`.
- Storage masih file JSON lokal — untuk production dengan banyak user, sebaiknya pindah ke tabel database (misal `user_category_corrections`).

## 1.7 Keputusan Ambigu yang Diambil (perlu direview)

- Minimarket (Alfamart/Indomaret/dll) → **Belanja**, bukan Food & Dining.
- GoSend (kurir) → **Lain2**, bukan Transportasi/Belanja.
- KEMENHUB SBY / DISHUB SBY → diasumsikan **Transportasi** (retribusi Suroboyo Bus/parkir).

Kalau salah satu asumsi ini tidak sesuai kebutuhanmu, tinggal edit list keyword `RULES` di `pipeline_kategorisasi.py`.

---

# 2. Model Forecast Pengeluaran + Budget Monitor + Anomaly Detection

## 2.1 Tujuan

1. Memprediksi total pengeluaran harian untuk N hari ke depan.
2. Membandingkan proyeksi kumulatif pengeluaran bulan berjalan terhadap target tabungan & pendapatan user, lalu memberi peringatan dengan estimasi tanggal.
3. Mendeteksi transaksi yang jumlahnya jauh di luar kebiasaan (anomali), dan meminta keputusan user apakah itu pengeluaran rutin atau one-time.

## 2.2 Arsitektur

### a. Cold Start Gating

Sistem **tidak memprediksi apa pun** sampai user punya histori transaksi minimal `MIN_DAYS_TO_START = 21` hari. Sebelum itu:

```python
status = forecaster.status()
# {"status": "belum_siap", "hari_terkumpul": 11, "hari_dibutuhkan": 21, "kurang_lagi": 10}
```

Kenapa gating eksplisit (bukan fallback moving-average diam-diam): supaya UI bisa menampilkan progress yang jujur ("11/21 hari data terkumpul, forecast belum aktif") daripada menampilkan angka yang sebenarnya belum bisa dipercaya.

### b. Model Forecast: Prophet (bukan ensemble 3 model)

Awalnya dibandingkan 3 model (ARIMA, Prophet, LSTM) lewat backtest. Hasilnya di data nyata:

| Model | RMSE (backtest) |
|---|---|
| **Prophet** | **445.536** (menang) |
| ARIMA | 452.801 |
| LSTM | 452.619 |

Prophet dipilih sebagai satu-satunya model produksi karena:
- Menang tipis di backtest,
- Dependency jauh lebih ringan (tidak butuh TensorFlow yang berat/lambat di-install),
- Robust untuk histori data pendek (~3 minggu cukup, ARIMA/LSTM butuh jauh lebih banyak),
- Tidak ada risiko bug scaling/data-leakage seperti yang sempat ditemukan di implementasi LSTM awal.

### c. Model Persistence (tidak retraining tiap request)

Model ditraining sekali, disimpan ke `.pkl`, dan dipakai ulang. Retraining hanya terjadi kalau salah satu syarat terpenuhi (lihat feedback loop di bawah).

### d. Budget Monitor

```
max_pengeluaran_aman = income - savings_target
```

Sistem menjumlahkan pengeluaran aktual bulan berjalan + forecast untuk sisa hari di bulan itu, lalu mencari tanggal proyeksi kumulatif pertama kali:
1. Melewati `max_pengeluaran_aman` → warning target tabungan gagal tercapai.
2. Melewati `income` penuh → warning defisit (pengeluaran > pendapatan).

### e. Anomaly Detection

Menggunakan **modified z-score berbasis median + MAD** (Median Absolute Deviation) per transaksi — bukan mean/std biasa, karena MAD tidak mudah terpengaruh oleh outlier itu sendiri. Threshold **adaptif per user** (menyesuaikan skala pengeluaran masing-masing), bukan angka tetap.

Dua level: `moderate` (z ≥ 3.0) dan `severe` (z ≥ 5.0).

## 2.3 File yang Dihasilkan

| File | Isi |
|---|---|
| `forecast_budget_pipeline.py` | Source code lengkap: load data, anomaly detection, `ModelManager`, budget monitor, class `ExpenseForecaster` |
| `storage/models/{user_id}_model.pkl` | Model Prophet (serialized) + metadata training |
| `storage/models/{user_id}_forecast_log.json` | Riwayat prediksi yang pernah dibuat (dipakai untuk drift detection) |
| `storage/anomaly_decisions/{user_id}.json` | Keputusan user atas transaksi anomali (include/exclude) |

**Isi `{user_id}_model.pkl`:**
```python
{
    "prophet_model_json": "...",  # model Prophet, diserialisasi lewat prophet.serialize (rekomendasi resmi Prophet)
    "meta": {
        "status": "ready",
        "trained_at": "2026-07-05T02:22:54",
        "n_days_training": 365,
        "last_data_date": "2026-05-31",
        "backtest_rmse": 445536.53
    }
}
```

## 2.4 Cara Pakai

```python
from forecast_budget_pipeline import ExpenseForecaster

f = ExpenseForecaster(csv_path="transaksi.csv", user_id="user_123", storage_dir="storage")

# 1. Cek status cold-start dulu
status = f.status()
if status["status"] == "belum_siap":
    print(f"Butuh {status['kurang_lagi']} hari data lagi sebelum forecast aktif")
else:
    # 2. Review anomali yang perlu keputusan user
    print(f.pending_anomaly_review())
    f.decide_anomaly(transaksi_id="xyz", keep_as_routine=False)  # exclude dari forecast

    # 3. Forecast pengeluaran 30 hari ke depan (auto retrain kalau perlu)
    forecast = f.get_forecast(days=30)
    print(forecast["forecast"][:5])

    # 4. Cek status budget vs target tabungan & pendapatan
    status_budget = f.check_budget(income=3_000_000, savings_target=800_000)
    print(status_budget["pesan"])
```

Load model `.pkl` langsung tanpa class wrapper (misal untuk inspeksi/debugging):
```python
import pickle
from prophet.serialize import model_from_json

payload = pickle.load(open("storage/models/user_123_model.pkl", "rb"))
model = model_from_json(payload["prophet_model_json"])
print(payload["meta"])

future = model.make_future_dataframe(periods=30)
forecast = model.predict(future)
```

## 2.5 Feedback Loop

Ada **3 feedback loop**, masing-masing untuk tujuan berbeda:

| Loop | Fungsi | Trigger |
|---|---|---|
| **Anomaly decision** | User putuskan transaksi besar itu rutin (tetap dihitung) atau one-time (exclude dari forecast) | Manual, dipanggil lewat `f.decide_anomaly(...)` |
| **Scheduled retrain** | Model auto-retrain supaya selalu memakai data terbaru | Otomatis tiap ≥`RETRAIN_EVERY_N_NEW_DAYS` (default 7) hari data baru terkumpul sejak training terakhir |
| **Drift detection** | Model di-retrain lebih cepat dari jadwal kalau prediksinya sudah tidak akurat lagi (pola pengeluaran user berubah) | Otomatis: tiap `get_forecast()` dipanggil, prediksi lama dibandingkan ke actual yang sudah terjadi; kalau rata-rata error > `DRIFT_MAE_MULTIPLIER` (default 1.5×) dari RMSE backtest awal → retrain dipaksa |

Ketiganya berjalan otomatis di dalam `ExpenseForecaster.get_forecast()` — kamu tidak perlu memanggil retrain manual kecuali mau paksa (`force_retrain=True`).

## 2.6 Parameter Konfigurasi

Semua ada di bagian atas `forecast_budget_pipeline.py`, bisa disesuaikan:

```python
MIN_DAYS_TO_START = 21          # minimal hari data historis sebelum forecast aktif
RETRAIN_EVERY_N_NEW_DAYS = 7    # retrain terjadwal tiap berapa hari data baru
DRIFT_MAE_MULTIPLIER = 1.5      # ambang toleransi error sebelum dianggap "drift"
DRIFT_MIN_SAMPLES = 5           # minimal sampel evaluasi sebelum drift dicek
```

## 2.7 Batasan & Hal yang Perlu Diputuskan Sendiri

- **Definisi "bulan ini"** di budget monitor memakai kalender bulan berjalan (reset tiap tanggal 1). Kalau target tabungan dimaksudkan sebagai rolling 30 hari (bukan kalender), logikanya perlu diubah.
- **Storage masih file-based** (JSON/pickle per user di disk) — untuk production dengan banyak user, sebaiknya pindah ke database.
- **UI anomaly review & cold-start progress** belum dibuat — pipeline ini hanya menyediakan data/statusnya (`pending_anomaly_review()`, `status()`), tampilan di app perlu dibangun terpisah.
- Angka default (`MIN_DAYS_TO_START`, `RETRAIN_EVERY_N_NEW_DAYS`, `DRIFT_MAE_MULTIPLIER`) dipilih wajar berdasarkan pertimbangan umum, bukan hasil tuning ketat — boleh disesuaikan sesuai observasi nyata setelah app dipakai user.

---

# 3. Instalasi Dependency

```bash
# Untuk model kategorisasi
pip install scikit-learn pandas numpy joblib --break-system-packages

# Untuk model forecast
pip install prophet pandas numpy scikit-learn --break-system-packages
```
