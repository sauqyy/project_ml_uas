"""
ml_categorizer.py — Integrasi model kategorisasi transaksi ke MoneyMind.

Adaptasi dari `Model Tambahan/pipeline_kategorisasi.py`. Alur prediksi 4 lapis:
    1. Rule statis (dictionary keyword)         -> confidence 1.0
    2. Kamus personal user (hasil koreksi)      -> confidence 1.0
    3. Naive Bayes (TF-IDF + MultinomialNB)     -> hasil ML jika confidence >= threshold
    4. Fallback "Lain-lain" (low confidence)    -> ditandai perlu review user

10: Output kategori model: Transportasi, Food & Dining, Belanja, Lain2.
11: Di app, "Lain2" dipetakan ke "Other" agar konsisten dengan kategori & warna app.
"""

import re
import os
import json
import warnings
import joblib

# Model di-pickle dengan sklearn 1.8.0; env memakai 1.9.0 (kompatibel, hanya warning).
try:
    from sklearn.exceptions import InconsistentVersionWarning
    warnings.filterwarnings("ignore", category=InconsistentVersionWarning)
except Exception:
    pass

# ============================================================
# RULE-BASED DICTIONARY (disalin dari pipeline_kategorisasi.py)
# ============================================================
RULES = [
    ("Lain2", [
        r"ditransfer ke", r"kolekte", r"gereja", r"pgak", r"katolik",
        r"kitabisa", r"apartemen", r"tip ke driver",
        r"rs unair", r"health care", r"klinik", r"rumah sakit",
        r"unair(?!.*(kantin|gor))", r"fakultas", r"gedung kuliah", r"gkb kampus",
        r"aseec tower", r"himatesda", r"rumah karya sosial", r"convention center",
        r"hotel", r"carnival park", r"orchestra", r"gor kampus c",
        r"gosend", r"wisata air", r"st aloysius", r"gotagihan",
    ]),
    ("Transportasi", [
        r"grab transport", r"grjk", r"gojek", r"maxim",
        r"suroboyo bus", r"srboyo bus", r"kemenhub sby", r"dishub sby",
        r"shell", r"pertamina", r"spbu", r"parkir", r"\btol\b",
        r"kereta", r"stasiun", r"commuterline", r"\bkrl\b",
        r"traveloka", r"tiket\.?com", r"tiketux", r"jackal holidays",
        r"mitrabl",
    ]),
    ("Food & Dining", [
        r"gofood", r"grabfood", r"shopeefood",
        r"mcd\b", r"mcdonald", r"kfc\b", r"burger king", r"wingstop",
        r"\ba&w\b", r"domino", r"pizza", r"chatime", r"koi the",
        r"starbucks", r"chaterise", r"chaterhaise", r"second cup coffee",
        r"kopi", r"kedai", r"imba coffee", r"stmj",
        r"bakso", r"\bmie\b", r"nasi ", r"ayam", r"warteg", r"kantin",
        r"pentol", r"rujak", r"cilok", r"geprek", r"gepruk", r"sate", r"soto",
        r"mixue", r"ikki topokki", r"es toeng", r"es degan", r"durian",
        r"macaroni", r"snackita", r"aurelune pastry", r"mako cake",
        r"taretan", r"inikan", r"tanant fnb", r"il burro", r"esb restaurant",
        r"pok pok", r"cappucino", r"ikea food", r"a&w mal",
        r"pak de saijo", r"penyetan", r"sutrisno buah",
    ]),
    ("Belanja", [
        r"alfamart", r"indomaret", r"alfamidi", r"familymart", r"circle k",
        r"sakinah minimarket", r"freshco market", r"super indo",
        r"aeon store", r"hypermart", r"superindo", r"mako mall",
        r"shopee", r"tokopedia", r"lazada", r"blibli", r"tiktok",
        r"google play", r"\bapple\b",
        r"\bim3\b", r"\btri\b", r"\bioh\b", r"myim3", r"pulsa", r"kuota",
        r"qpon", r"printbox", r"fotocopy", r"geeko komputer",
        r"\bstore\b", r"\bshop\b", r"\btoko\b",
        r"salon", r"galaxy mall", r"pakuwon", r"tunjungan plaza",
    ]),
]

# Pemetaan kategori output model -> kategori kanonik di app MoneyMind
CATEGORY_MAP = {
    "Transportasi": "Transportation",
    "Food & Dining": "Food & Dining",
    "Belanja": "Shopping",
    "Lain2": "Other",
}
# Kategori app yang dihasilkan model (untuk seeding tabel categories)
APP_CATEGORIES = ["Transportation", "Food & Dining", "Shopping", "Other"]

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(_BASE_DIR, "model_nb_kategori.pkl")
LEARNED_DIR = os.path.join(_BASE_DIR, "storage", "learned_dicts")


def clean_text(text: str) -> str:
    """Lowercase, buang karakter aneh, rapikan spasi."""
    text = str(text).lower()
    text = re.sub(r"[^a-z0-9\s&./']", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def rule_based_categorize(text_clean: str):
    """Return nama kategori (versi model) kalau ada rule yang match, else None."""
    for kategori, patterns in RULES:
        for pat in patterns:
            if re.search(pat, text_clean):
                return kategori
    return None


def _map_category(model_category: str) -> str:
    return CATEGORY_MAP.get(model_category, model_category)


def _sanitize(user_email: str) -> str:
    return re.sub(r"[^a-zA-Z0-9]+", "_", (user_email or "default").lower()).strip("_") or "default"


# ---- Model NB dimuat sekali, dibagi ke semua user ----
_pipeline = None


def _get_pipeline():
    global _pipeline
    if _pipeline is None:
        _pipeline = joblib.load(MODEL_PATH)
    return _pipeline


class Kategorizer:
    """Wrapper per-user dengan feedback loop (kamus personal disimpan ke JSON)."""

    def __init__(self, user_email: str = "default_user", threshold: float = 0.5):
        self.pipeline = _get_pipeline()
        self.threshold = threshold
        self.user_email = user_email
        os.makedirs(LEARNED_DIR, exist_ok=True)
        self.learned_path = os.path.join(LEARNED_DIR, f"{_sanitize(user_email)}.json")
        self.learned_dict = self._load_learned_dict()

    def _load_learned_dict(self) -> dict:
        if os.path.exists(self.learned_path):
            try:
                with open(self.learned_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return {}
        return {}

    def _save_learned_dict(self):
        with open(self.learned_path, "w", encoding="utf-8") as f:
            json.dump(self.learned_dict, f, ensure_ascii=False, indent=2)

    def record_correction(self, teks_transaksi: str, kategori_benar: str):
        """Simpan koreksi user (key = teks yang sudah di-clean)."""
        clean = clean_text(teks_transaksi)
        if not clean:
            return
        self.learned_dict[clean] = kategori_benar
        self._save_learned_dict()

    def predict(self, teks_baru: str):
        """Return (kategori_app, sumber, confidence)."""
        clean = clean_text(teks_baru)

        # 1. Rule statis
        hasil_rule = rule_based_categorize(clean)
        if hasil_rule:
            return _map_category(hasil_rule), "rule", 1.0

        # 2. Kamus personal user (nilainya sudah kategori app)
        if clean in self.learned_dict:
            return self.learned_dict[clean], "user_learned", 1.0

        # 3. Model ML
        if not clean:
            return "Other", "low_confidence_need_review", 0.0
        proba_arr = self.pipeline.predict_proba([clean])[0]
        idx_max = int(proba_arr.argmax())
        hasil_ml = self.pipeline.classes_[idx_max]
        conf = float(proba_arr[idx_max])

        # 4. Confidence rendah -> perlu review
        if conf < self.threshold:
            return "Other", "low_confidence_need_review", conf

        return _map_category(str(hasil_ml)), "ml", conf


# ---- Cache instance per user supaya kamus personal tetap sinkron dalam proses ----
_cache = {}


def get_categorizer(user_email: str = "default_user") -> Kategorizer:
    key = _sanitize(user_email)
    if key not in _cache:
        _cache[key] = Kategorizer(user_email=user_email)
    return _cache[key]


def categorize(desc: str, user_email: str = "default_user") -> dict:
    """Helper ringkas: kembalikan {category, source, confidence}."""
    kategori, sumber, conf = get_categorizer(user_email).predict(desc)
    return {"category": kategori, "source": sumber, "confidence": round(conf, 4)}


def record_correction(desc: str, category: str, user_email: str = "default_user"):
    """Ajari model: simpan koreksi kategori user ke kamus personal."""
    get_categorizer(user_email).record_correction(desc, category)
