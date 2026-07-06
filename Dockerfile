# MoneyMind — Hugging Face Spaces (Docker SDK)
# HF free tier: 16GB RAM / 2 vCPU, cukup untuk torch+easyocr (OCR struk).
# Frontend sudah ter-build di backend/static, jadi tidak perlu Node di image ini.
FROM python:3.11-slim

# Dependency sistem: opencv (dipakai easyocr) butuh libGL & glib.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libglib2.0-0 \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

# HF Spaces menjalankan container sebagai uid 1000. Buat user non-root supaya
# folder cache (model easyocr, prophet/matplotlib) bisa ditulis.
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR /home/user/app

# Install torch+torchvision CPU DULU dari index PyTorch, lalu KUNCI versinya via
# constraint supaya `pip install -r` tidak menimpanya dengan torchvision PyPI yang
# mismatch (penyebab error "torchvision::nms does not exist"). Sama seperti catatan
# di backend/requirements.txt.
COPY --chown=user:user backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip freeze | grep -iE "^(torch|torchvision)==" > /home/user/torch-constraint.txt && \
    pip install --no-cache-dir -c /home/user/torch-constraint.txt -r requirements.txt

# Kode backend (termasuk static/ hasil build frontend)
COPY --chown=user:user backend/ ./

# FLASK_DEBUG=0 -> jalur produksi (bot Telegram ikut jalan lewat WSGI).
# HF Spaces mengekspos port 7860 (lihat app_port di README Space).
ENV FLASK_DEBUG=0 \
    PORT=7860 \
    EASYOCR_MODULE_PATH=/home/user/.EasyOCR \
    MPLCONFIGDIR=/home/user/.matplotlib

EXPOSE 7860

# --workers 1 WAJIB: bot Telegram polling di background thread; kalau >1 worker,
# tiap worker jalankan polling sendiri -> Telegram error 409 Conflict.
CMD ["gunicorn", "--workers", "1", "--threads", "8", "--timeout", "180", "--bind", "0.0.0.0:7860", "main:app"]
