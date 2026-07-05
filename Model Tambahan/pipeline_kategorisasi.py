"""
PIPELINE AUTO-CATEGORIZE TRANSAKSI - MONEY MANAGER APP
========================================================
Alur:
1. Load & bersihkan data transaksi mentah
2. Kategorisasi otomatis pakai RULE-BASED dictionary (untuk bootstrap label)
3. Training model Naive Bayes pakai hasil rule-based sebagai label
4. Gabungkan rule-based + ML jadi satu fungsi predict_kategori()
   -> rule dicek dulu (cepat & akurat untuk merchant dikenal)
   -> kalau rule nggak match, fallback ke model ML
   -> kalau confidence ML rendah, ditandai untuk dikonfirmasi user

Kategori: Transportasi, Food & Dining, Belanja, Lain2

Cara pakai ulang di kemudian hari (tanpa training ulang):
    import joblib
    pipeline = joblib.load("model_nb_kategori.pkl")
"""

import re
import os
import json
import pandas as pd
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.pipeline import Pipeline

# ============================================================
# BAGIAN 1: RULE-BASED DICTIONARY
# ============================================================
# Urutan penting: dicek dari atas ke bawah, begitu match langsung berhenti.
# Prioritas: transfer/donasi paling spesifik dulu, baru transport/food/belanja.
# Silakan tambah/ubah keyword di sini seiring bertambahnya merchant baru.

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


def clean_text(text: str) -> str:
    """Lowercase, buang karakter aneh, rapikan spasi."""
    text = str(text).lower()
    text = re.sub(r"[^a-z0-9\s&./']", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def rule_based_categorize(text_clean: str):
    """Return nama kategori kalau ada rule yang match, else None."""
    for kategori, patterns in RULES:
        for pat in patterns:
            if re.search(pat, text_clean):
                return kategori
    return None


# ============================================================
# BAGIAN 2: BUILD DATASET BERLABEL (bootstrap dari rule)
# ============================================================

def build_labeled_dataset(csv_path: str, kolom_transaksi: str = "Transaksi") -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    df["Transaksi_clean"] = df[kolom_transaksi].apply(clean_text)

    df["Kategori_Raw"] = df["Transaksi_clean"].apply(rule_based_categorize)
    # Fallback: yang nggak ke-cover rule didorong ke Lain2 (catch-all)
    df["Kategori"] = df["Kategori_Raw"].fillna("Lain2")
    df["Sumber"] = df["Kategori_Raw"].apply(lambda x: "rule" if pd.notna(x) else "fallback_lain2")

    return df


# ============================================================
# BAGIAN 3: TRAINING MODEL NAIVE BAYES
# ============================================================

def train_model(df: pd.DataFrame, test_size: float = 0.2, random_state: int = 42):
    X_train, X_test, y_train, y_test = train_test_split(
        df["Transaksi_clean"], df["Kategori"],
        test_size=test_size, random_state=random_state, stratify=df["Kategori"]
    )

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1)),
        ("clf", MultinomialNB(alpha=0.5))
    ])
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    print("=== Classification Report ===")
    print(classification_report(y_test, y_pred))

    labels = sorted(df["Kategori"].unique())
    print("=== Confusion Matrix ===")
    print("Label urutan:", labels)
    print(confusion_matrix(y_test, y_pred, labels=labels))

    return pipeline


# ============================================================
# BAGIAN 4: PREDIKSI FINAL (RULE + ML + CONFIDENCE THRESHOLD)
# ============================================================

class Kategorizer:
    """
    Wrapper siap-pakai untuk auto-categorize transaksi baru, dengan
    FEEDBACK LOOP per-user: koreksi user disimpan sebagai learned dictionary
    personal, dicek SEBELUM fallback ke model ML.

    Urutan prioritas prediksi:
        1. Rule statis (RULES di atas)          -> paling cepat, berlaku semua user
        2. Learned dictionary milik user ini     -> hasil koreksi user sebelumnya
        3. Model ML (Naive Bayes)                -> generalisasi merchant baru
        4. Fallback "Lain2" kalau confidence ML rendah -> minta konfirmasi user

    Cara pakai:
        kat = Kategorizer(model_path="model_nb_kategori.pkl", user_id="user_123")
        hasil, sumber, confidence = kat.predict("Kopi Kenangan")

        # Kalau user mengoreksi hasil prediksi (misal app nebak salah):
        kat.record_correction("Kopi Kenangan", "Food & Dining")

        # Prediksi berikutnya untuk teks yang sama/mirip akan otomatis benar:
        hasil, sumber, confidence = kat.predict("Kopi Kenangan")
        # -> ("Food & Dining", "user_learned", 1.0)
    """

    def __init__(
        self,
        model_path: str = "model_nb_kategori.pkl",
        threshold: float = 0.5,
        user_id: str = "default_user",
        learned_dict_dir: str = "learned_dicts",
    ):
        self.pipeline = joblib.load(model_path)
        self.threshold = threshold
        self.user_id = user_id
        self.learned_dict_dir = learned_dict_dir
        os.makedirs(self.learned_dict_dir, exist_ok=True)
        self.learned_path = os.path.join(self.learned_dict_dir, f"{user_id}.json")
        self.learned_dict = self._load_learned_dict()

    def _load_learned_dict(self) -> dict:
        if os.path.exists(self.learned_path):
            with open(self.learned_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return {}

    def _save_learned_dict(self):
        with open(self.learned_path, "w", encoding="utf-8") as f:
            json.dump(self.learned_dict, f, ensure_ascii=False, indent=2)

    def record_correction(self, teks_transaksi: str, kategori_benar: str):
        """
        Simpan koreksi user. Key yang dipakai adalah teks yang sudah di-clean,
        jadi variasi kapitalisasi/spasi tetap match ke entry yang sama.
        """
        clean = clean_text(teks_transaksi)
        self.learned_dict[clean] = kategori_benar
        self._save_learned_dict()

    def predict(self, teks_baru: str):
        clean = clean_text(teks_baru)

        # 1. Cek rule statis dulu -> paling cepat & akurat untuk merchant yang sudah dikenal
        hasil_rule = rule_based_categorize(clean)
        if hasil_rule:
            return hasil_rule, "rule", 1.0

        # 2. Cek learned dictionary user -> hasil koreksi manual sebelumnya
        if clean in self.learned_dict:
            return self.learned_dict[clean], "user_learned", 1.0

        # 3. Fallback ke model ML untuk merchant yang belum pernah dilihat
        proba_arr = self.pipeline.predict_proba([clean])[0]
        idx_max = proba_arr.argmax()
        hasil_ml = self.pipeline.classes_[idx_max]
        conf = float(proba_arr[idx_max])

        # 4. Kalau confidence rendah, jangan tebak sembarangan -> tandai perlu review
        if conf < self.threshold:
            return "Lain2", "low_confidence_need_review", conf

        return hasil_ml, "ml", conf

    def export_learned_dict_for_retraining(self) -> pd.DataFrame:
        """
        Ubah learned dictionary jadi DataFrame (Transaksi_clean, Kategori)
        supaya bisa digabung ke data training dan model di-retrain berkala.
        Panggil ini secara periodik (misal cron job mingguan/bulanan) untuk
        semua user, gabungkan semua hasilnya, lalu jalankan ulang train_model().
        """
        if not self.learned_dict:
            return pd.DataFrame(columns=["Transaksi_clean", "Kategori"])
        return pd.DataFrame(
            [{"Transaksi_clean": k, "Kategori": v} for k, v in self.learned_dict.items()]
        )


# ============================================================
# MAIN: jalankan seluruh pipeline dari nol
# ============================================================

if __name__ == "__main__":
    CSV_PATH = "/mnt/user-data/uploads/Data_-ML_xlsx_-_Sheet1.csv"

    print(">>> STEP 1-2: Load data & kategorisasi rule-based (bootstrap label)")
    df = build_labeled_dataset(CSV_PATH)

    total = len(df)
    covered = (df["Sumber"] == "rule").sum()
    print(f"Total baris: {total}")
    print(f"Ke-cover rule spesifik: {covered} ({covered/total*100:.1f}%)")
    print(f"Fallback ke Lain2: {total-covered} ({(total-covered)/total*100:.1f}%)")
    print(df["Kategori"].value_counts())

    df.to_csv("hasil_kategorisasi.csv", index=False)
    print("\n>>> Hasil kategorisasi disimpan ke hasil_kategorisasi.csv")

    print("\n>>> STEP 3: Training model Naive Bayes")
    model = train_model(df)
    joblib.dump(model, "model_nb_kategori.pkl")
    print(">>> Model disimpan ke model_nb_kategori.pkl")

    print("\n>>> STEP 4: Test prediksi merchant baru (belum ada di dictionary)")
    kat = Kategorizer(model_path="model_nb_kategori.pkl", user_id="demo_user")
    test_cases = [
        "gojek 5000",
        "J.CO Donuts Galaxy Mall",
        "Kopi Kenangan Delta Sinar",
        "Zara Tunjungan Plaza",
        "MRT Jakarta",
        "Transfer ke Budi Santoso",
        "beli baju di pasar turi",
    ]
    for t in test_cases:
        hasil, sumber, conf = kat.predict(t)
        print(f"  [{sumber}, conf={conf:.2f}] '{t}' -> {hasil}")

    print("\n>>> STEP 5: Simulasi feedback loop - user mengoreksi hasil yang salah")
    print("  User koreksi: 'beli baju di pasar turi' seharusnya 'Belanja', bukan 'Lain2'")
    kat.record_correction("beli baju di pasar turi", "Belanja")

    print("  Prediksi ulang setelah koreksi disimpan:")
    hasil, sumber, conf = kat.predict("beli baju di pasar turi")
    print(f"  [{sumber}, conf={conf:.2f}] 'beli baju di pasar turi' -> {hasil}")

    print(f"\n  Learned dictionary user 'demo_user' disimpan di: {kat.learned_path}")
    print(f"  Isinya: {kat.learned_dict}")
