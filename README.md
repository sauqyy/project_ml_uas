# MoneyMind — Aplikasi Manajemen Keuangan berbasis Machine Learning

Aplikasi pencatatan & analisis keuangan pribadi. Terdiri dari **backend Flask (Python)** dan **frontend React (Vite)**.

Fitur ML:
- **Kategorisasi transaksi otomatis** — Rules + Naive Bayes + kamus personal per user (feedback loop).
- **Forecast pengeluaran harian** — Prophet (dengan cold-start gating).
- **Budget monitor** — proyeksi pengeluaran bulan berjalan vs target tabungan & pendapatan.
- **Deteksi anomali** — Modified Z-Score (Median + MAD).
- **Bot Telegram** (opsional) — catat pengeluaran via teks (Gemini) atau foto struk (OCR), kategori ditentukan model lokal.

---

## 1. Prasyarat (yang harus di-install lebih dulu)

| Software | Versi disarankan | Keterangan |
|---|---|---|
| **Python** | 3.10 – 3.12 | untuk backend. (di-develop di 3.14, tapi 3.11/3.12 paling stabil untuk Prophet) |
| **Node.js + npm** | Node 18+ / 20+ | untuk frontend |
| **Git** | terbaru | opsional, untuk clone |

Cek instalasi:
```bash
python --version
node --version
npm --version
```

---

## 2. Library / Dependency

### Backend (Python) — lihat `backend/requirements.txt`
Inti:
- `Flask`, `flask-cors`, `sqlalchemy`, `pydantic` — web & database (SQLite)
- `pandas`, `numpy`, `scikit-learn`, `statsmodels`, `joblib` — ML umum
- `prophet` — model forecast pengeluaran

Opsional (hanya untuk fitur Bot Telegram & foto struk):
- `pyTelegramBotAPI` — bot Telegram
- `google-generativeai` — parsing teks via Gemini
- `easyocr`, `Pillow` — OCR foto struk (menarik `torch`, ukurannya besar)
- `gunicorn` — server produksi (opsional, Linux)

### Frontend (Node) — lihat `frontend/package.json`
- `react`, `react-dom`, `recharts` (grafik), `lucide-react` (ikon), `@splinetool/*` (animasi 3D)
- Dev: `vite`, `@vitejs/plugin-react`, `tailwindcss`

---

## 3. Instalasi

### 3a. Backend
```bash
cd backend

# (disarankan) buat virtual environment
python -m venv venv
# aktifkan:
#   Windows (PowerShell):  venv\Scripts\Activate.ps1
#   Windows (cmd):         venv\Scripts\activate.bat
#   macOS/Linux:           source venv/bin/activate

# install semua library
pip install -r requirements.txt
```

> Catatan: `easyocr` akan mengunduh `torch` (cukup besar). Kalau **tidak** butuh fitur foto struk Telegram, kamu boleh menghapus baris `easyocr` & `Pillow` dari `requirements.txt` sebelum install.

### 3b. Frontend
```bash
cd frontend
npm install
```

---

## 4. Cara Menjalankan Program

Ada 2 cara. **Cara A** paling gampang untuk sekadar menjalankan aplikasi.

### Cara A — Mode Produksi (frontend di-build, Flask menyajikan semuanya)

1. **Build frontend** (hasilnya otomatis masuk ke `backend/static`):
   ```bash
   cd frontend
   npm run build
   ```
2. **Jalankan backend**:
   ```bash
   cd ../backend
   python main.py
   ```
3. Buka browser ke **http://localhost:8000**

> Setiap kali mengubah kode frontend, ulangi `npm run build` agar perubahannya terlihat di `localhost:8000`.

### Cara B — Mode Development (hot-reload, untuk ngoding)

Butuh **2 terminal**:

- **Terminal 1 — Backend (API):**
  ```bash
  cd backend
  python main.py
  ```
  Backend jalan di `http://localhost:8000`.

- **Terminal 2 — Frontend (dev server):**
  ```bash
  cd frontend
  npm run dev
  ```
  Buka **http://localhost:5173**. Dev server otomatis mem-*proxy* `/api` ke backend `:8000`, dan setiap perubahan kode langsung ter-reload.

---

## 5. Login & Data Contoh

- **Akun demo bawaan:** email `demo@moneymind.com`, password `demo123`.
- Atau **Register** akun baru dari halaman login (tersimpan di database, password ter-hash).
- **Import dataset contoh:** di menu **Prediksi Keuangan**, jika data masih sedikit akan muncul tombol **"Import Dataset Contoh"** yang mengisi akun dengan histori 1 tahun (dari `Data - Excel.xlsx - Sheet1.csv`) agar fitur forecast/anomali langsung aktif.

Database SQLite (`backend/finance.db`) dan tabel-tabelnya dibuat otomatis saat pertama kali backend dijalankan.

---

## 6. (Opsional) Konfigurasi Bot Telegram & Gemini

Fitur bot Telegram butuh token. Buat file **`backend/.env`**:
```
TELEGRAM_BOT_TOKEN=isi_token_bot_dari_@BotFather
GEMINI_API_KEY=isi_api_key_google_gemini
```
Tanpa file ini, aplikasi web tetap berjalan normal — hanya fitur bot Telegram yang non-aktif.

---

## 7. Deploy ke Render (dengan OCR)

Repo ini sudah menyertakan **`render.yaml`** (blueprint) untuk deploy sebagai **1 web service + PostgreSQL**.

**Penting soal biaya & RAM:**
- Fitur **OCR foto struk** (easyocr/PyTorch) butuh RAM besar → **wajib plan Standard (2GB)**. Free/Starter (512MB) akan crash saat memproses struk.
- Butuh **PostgreSQL** karena disk Render bersifat sementara (SQLite `finance.db` akan ke-reset tiap restart → data hilang). `render.yaml` sudah menyertakan database Postgres.
- **Versi hemat (tanpa OCR):** hapus `easyocr` & `Pillow` dari `requirements.txt` dan bagian `pip install torch ...` dari `buildCommand` → bisa pakai plan lebih kecil (Starter/Free).

**Langkah deploy:**
1. Build frontend & commit: di `frontend/` jalankan `npm run build`, lalu commit + push folder `backend/static` (Render **tidak** mem-build frontend).
2. Push repo ke GitHub.
3. Render Dashboard → **New → Blueprint** → pilih repo ini → Render membaca `render.yaml` otomatis.
4. (Opsional) isi Environment Variable: `TELEGRAM_BOT_TOKEN`, `GEMINI_API_KEY`.
5. Klik Deploy. `DATABASE_URL` otomatis terhubung ke Postgres; tabel & akun demo dibuat otomatis saat start.

**Yang sudah disiapkan untuk produksi:**
- `database.py` membaca `DATABASE_URL` (Postgres), fallback ke SQLite saat lokal.
- `FLASK_DEBUG=0` di produksi → memakai gunicorn dan bot Telegram tetap aktif.
- `startCommand`: `gunicorn main:app --workers 1 --timeout 300` (1 worker agar bot tidak dobel; timeout besar untuk OCR & training Prophet).
- torch versi **CPU-only** di-install saat build (menghindari paket CUDA ~2GB yang bikin build gagal/OOM).

> Catatan: request pertama setelah idle/deploy agak lambat (import Prophet/torch + easyocr mengunduh model ~64MB ke disk sementara).

---

## 8. Struktur Singkat

```
UAS/
├── backend/                 # Flask API + model ML
│   ├── main.py              # entry point server (port 8000)
│   ├── ml_categorizer.py    # model kategorisasi (rules + Naive Bayes)
│   ├── ml_forecast.py       # Prophet forecast + budget + anomali
│   ├── model_nb_kategori.pkl# model kategorisasi terlatih
│   ├── requirements.txt     # dependency Python
│   ├── finance.db           # database SQLite (dibuat otomatis)
│   └── static/              # hasil build frontend (disajikan Flask)
├── frontend/                # React + Vite
│   ├── src/                 # source code UI
│   └── package.json         # dependency Node
└── Data - Excel.xlsx - Sheet1.csv   # dataset contoh untuk import
```

---

## 9. Troubleshooting

- **Perubahan frontend tidak muncul di `localhost:8000`** → kamu lupa `npm run build`, atau cache browser (tekan Ctrl+Shift+R).
- **`prophet` gagal di-install** → gunakan Python 3.11/3.12; pastikan `pip` terbaru (`python -m pip install --upgrade pip`).
- **`torch`/`easyocr` terlalu besar / tidak dibutuhkan** → hapus `easyocr` & `Pillow` dari `requirements.txt` (fitur foto struk Telegram tidak akan aktif, sisanya normal).
- **Port 8000 dipakai** → jalankan dengan port lain: `PORT=8001 python main.py` (Windows PowerShell: `$env:PORT=8001; python main.py`).
