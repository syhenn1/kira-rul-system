import os
import re
import sys
import importlib.metadata
import traceback
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import pandas as pd
import numpy as np
import joblib
from typing import Optional, List

# Force UTF-8 output so Windows cp1252 terminal does not crash on non-ASCII
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# import summarizer module
try:
    from summarizer import summarize_company_assets
except Exception:
    summarize_company_assets = None

app = FastAPI(title="Kira AI Engine", description="RUL Prediction API")

# Global model state — RUL
gb_model = None
preprocessor = None
_model_type: str = "none"
_model_feature_names: List[str] = []

# Label mapping: Indonesian (training) → English (API response)
_SEVERITY_LABEL_MAP = {
    "Ringan": "Low",
    "Sedang": "Medium",
    "Berat":  "High",
    "Fatal":  "Critical",
}


class MockRULPredictor:
    """Fallback: hanya aktif jika model asli gagal dimuat."""
    def predict(self, data):
        base_rul = 50
        if isinstance(data, pd.DataFrame) and len(data) > 0:
            base_rul += np.random.randint(-20, 20)
        return np.array([max(1, base_rul)])


def _extract_feature_names(obj) -> List[str]:
    """Ekstrak nama fitur dari Pipeline / ColumnTransformer / estimator."""
    if hasattr(obj, "feature_names_in_"):
        return list(obj.feature_names_in_)
    if hasattr(obj, "steps"):
        for _, step in obj.steps:
            names = _extract_feature_names(step)
            if names:
                return names
    if hasattr(obj, "transformers"):
        cols = []
        for _, _, c in obj.transformers:
            if isinstance(c, list):
                cols.extend(c)
        return cols
    return []


def _clean_text(s: str) -> str:
    """Preprocessing teks sama persis dengan notebook training severity."""
    s = str(s).lower()
    s = re.sub(r'[^a-z0-9\s]', ' ', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s


# ── Rule-Based Severity Engine ────────────────────────────────────────────────
#
# Menggunakan fitur yang SAMA dengan model TF-IDF di notebook training:
#   - teks  : Jenis Kerusakan + Penyebab + Spare Part  (tokenisasi unigram+bigram)
#   - Kategori / Sub Kategori / Tipe                   (rule penyesuai risiko)
#   - Biaya Perbaikan                                  (threshold scoring)
#
# Bobot per kelas didasarkan pada distribusi crosstab EDA notebook:
# 20 nilai unik Jenis Kerusakan × 4 kelas severity
# 12 nilai unik Penyebab        × 4 kelas severity
# ─────────────────────────────────────────────────────────────────────────────

# Jenis Kerusakan (20 nilai unik dari dataset) → bobot per kelas
_JENIS_KERUSAKAN_SCORES: dict = {
    # Fatal dominant — kegagalan total / risiko keselamatan
    "korsleting":             {"Fatal": 9.0, "Berat": 2.0, "Sedang": 0.5, "Ringan": 0.0},
    "kompresor rusak":        {"Fatal": 8.5, "Berat": 2.5, "Sedang": 0.5, "Ringan": 0.0},
    "mati mendadak":          {"Fatal": 8.0, "Berat": 3.0, "Sedang": 1.0, "Ringan": 0.0},
    "koneksi terputus":       {"Fatal": 7.5, "Berat": 3.5, "Sedang": 1.0, "Ringan": 0.0},
    "panel trip":             {"Fatal": 7.5, "Berat": 3.0, "Sedang": 1.0, "Ringan": 0.0},
    "tidak berfungsi":        {"Fatal": 7.0, "Berat": 4.0, "Sedang": 1.0, "Ringan": 0.0},
    # Berat dominant — kerusakan signifikan tapi tidak total
    "bocor refrigeran":       {"Fatal": 3.0, "Berat": 8.0, "Sedang": 1.5, "Ringan": 0.0},
    "overheating":            {"Fatal": 3.5, "Berat": 7.5, "Sedang": 1.5, "Ringan": 0.0},
    "getaran berlebihan":     {"Fatal": 2.0, "Berat": 7.5, "Sedang": 2.5, "Ringan": 0.0},
    "pompa tidak bekerja":    {"Fatal": 3.0, "Berat": 7.0, "Sedang": 2.0, "Ringan": 0.0},
    "daya tidak stabil":      {"Fatal": 3.5, "Berat": 7.0, "Sedang": 2.0, "Ringan": 0.0},
    "kebocoran pipa":         {"Fatal": 2.5, "Berat": 7.0, "Sedang": 2.5, "Ringan": 0.5},
    # Sedang dominant — kerusakan moderat
    "retak pecah":            {"Fatal": 1.0, "Berat": 3.5, "Sedang": 7.0, "Ringan": 1.5},
    "suara berisik":          {"Fatal": 0.5, "Berat": 2.5, "Sedang": 7.0, "Ringan": 2.0},
    "filter tersumbat":       {"Fatal": 0.5, "Berat": 2.0, "Sedang": 7.0, "Ringan": 2.5},
    "layar mati":             {"Fatal": 1.0, "Berat": 3.0, "Sedang": 6.5, "Ringan": 1.5},
    "baterai lemah":          {"Fatal": 0.5, "Berat": 2.0, "Sedang": 6.5, "Ringan": 2.5},
    "sensor tidak responsif": {"Fatal": 1.0, "Berat": 3.0, "Sedang": 6.5, "Ringan": 1.5},
    "aus abrasi":             {"Fatal": 0.5, "Berat": 3.0, "Sedang": 6.5, "Ringan": 2.0},
    # Ringan-Sedang — kerusakan minor / ambigu
    "kebocoran":              {"Fatal": 1.5, "Berat": 3.5, "Sedang": 5.0, "Ringan": 3.0},
}

# Penyebab (12 nilai unik dari dataset) → bobot per kelas
_PENYEBAB_SCORES: dict = {
    # Fatal/Berat leaning — penyebab berisiko tinggi
    "overload":               {"Fatal": 6.0, "Berat": 4.0, "Sedang": 1.5, "Ringan": 0.5},
    "kabel putus":            {"Fatal": 6.0, "Berat": 3.5, "Sedang": 1.0, "Ringan": 0.0},
    "beban berlebih":         {"Fatal": 5.5, "Berat": 4.0, "Sedang": 1.5, "Ringan": 0.5},
    "tegangan tidak stabil":  {"Fatal": 5.0, "Berat": 4.5, "Sedang": 1.5, "Ringan": 0.0},
    # Berat/Sedang leaning — penyebab menengah
    "kelembaban tinggi":      {"Fatal": 2.5, "Berat": 5.5, "Sedang": 3.0, "Ringan": 1.0},
    "korosi":                 {"Fatal": 2.0, "Berat": 5.0, "Sedang": 3.5, "Ringan": 1.5},
    "getaran mekanis":        {"Fatal": 2.0, "Berat": 5.0, "Sedang": 3.5, "Ringan": 1.5},
    "human error":            {"Fatal": 2.5, "Berat": 4.0, "Sedang": 4.0, "Ringan": 1.5},
    # Sedang/Ringan leaning — penyebab rendah risiko
    "usia pakai":             {"Fatal": 1.0, "Berat": 2.5, "Sedang": 4.5, "Ringan": 4.0},
    "faktor lingkungan":      {"Fatal": 1.0, "Berat": 2.0, "Sedang": 4.5, "Ringan": 4.5},
    "kurang pelumasan":       {"Fatal": 0.5, "Berat": 2.5, "Sedang": 4.5, "Ringan": 4.5},
    "debu dan kotoran":       {"Fatal": 0.0, "Berat": 1.0, "Sedang": 3.5, "Ringan": 6.5},
}

# Biaya perbaikan (Rp) → bobot kelas
# Dari EDA notebook: biaya adalah fitur PALING DISKRIMINATIF.
# Threshold mengikuti distribusi biaya dataset (min 446rb, max 18.4jt).
_BIAYA_RULES: list = [
    # (batas_bawah_Rp, bobot_per_kelas)  — urut tertinggi ke terendah
    (15_000_000, {"Fatal": 30.0, "Berat": 10.0, "Sedang":  3.0, "Ringan":  0.0}),
    ( 8_000_000, {"Fatal": 15.0, "Berat": 25.0, "Sedang":  5.0, "Ringan":  0.0}),
    ( 3_000_000, {"Fatal":  4.0, "Berat": 12.0, "Sedang": 20.0, "Ringan":  4.0}),
    ( 1_000_000, {"Fatal":  1.0, "Berat":  5.0, "Sedang": 15.0, "Ringan": 10.0}),
    (         0, {"Fatal":  0.0, "Berat":  2.0, "Sedang":  8.0, "Ringan": 20.0}),
]

# Kategori berisiko tinggi → skor Fatal/Berat dinaikkan sedikit
_HIGH_RISK_KATEGORI = {
    "mechanical", "electrical", "sistem pemadam kebakaran",
    "sistem proteksi kebakaran aktif", "sistem energi",
    "distribusi air", "sistem transportasi gedung",
}


def _tokenize(teks_bersih: str) -> list:
    """
    Tokenisasi teks menjadi unigram + bigram.
    Identik dengan TfidfVectorizer(ngram_range=(1,2)) di notebook training:
      - unigram : setiap kata tunggal
      - bigram  : setiap pasangan kata berurutan
    Input  : teks yang sudah melalui _clean_text()
    Output : list token string (duplikat diizinkan, mencerminkan frekuensi)
    """
    words = teks_bersih.split()
    bigrams = [f"{words[i]} {words[i + 1]}" for i in range(len(words) - 1)]
    return words + bigrams


def _compute_severity_scores(
    jenis_kerusakan: str,
    penyebab: str,
    spare_part: str,
    kategori: str,
    biaya_perbaikan: float,
) -> dict:
    """
    Hitung skor rule-based per kelas severity dengan fitur yang sama
    dengan model TF-IDF training.

    Tahapan perhitungan:
      1. Gabung teks (Jenis Kerusakan + Penyebab + Spare Part) → clean_text
      2. Tokenisasi → unigram + bigram  (sama dengan TF-IDF ngram_range=(1,2))
      3. Match token ke tabel _JENIS_KERUSAKAN_SCORES → akumulasi skor
      4. Match token ke tabel _PENYEBAB_SCORES        → akumulasi skor
      5. Biaya Perbaikan → tambah bobot dari _BIAYA_RULES
      6. Kategori berisiko tinggi → skor Fatal/Berat +1.5/+1.0

    Return: dict {kelas: skor_float}
    """
    KELAS = ["Fatal", "Berat", "Sedang", "Ringan"]
    scores = {k: 0.0 for k in KELAS}

    # 1 & 2 — Tokenisasi
    teks_gabung = f"{jenis_kerusakan} {penyebab} {spare_part}"
    teks_bersih = _clean_text(teks_gabung)
    token_set   = set(_tokenize(teks_bersih))   # set untuk lookup O(1)

    # 3 — Matching Jenis Kerusakan
    for term, bobot_kelas in _JENIS_KERUSAKAN_SCORES.items():
        if term in token_set:
            for kls, bobot in bobot_kelas.items():
                scores[kls] += bobot

    # 4 — Matching Penyebab
    for term, bobot_kelas in _PENYEBAB_SCORES.items():
        if term in token_set:
            for kls, bobot in bobot_kelas.items():
                scores[kls] += bobot

    # 5 — Bobot Biaya Perbaikan (ambil tier pertama yang sesuai)
    for batas, bobot_kelas in _BIAYA_RULES:
        if biaya_perbaikan >= batas:
            for kls, bobot in bobot_kelas.items():
                scores[kls] += bobot
            break

    # 6 — Penyesuai Kategori Risiko Tinggi
    if _clean_text(kategori) in _HIGH_RISK_KATEGORI:
        scores["Fatal"] += 1.5
        scores["Berat"] += 1.0

    return scores


@app.on_event("startup")
def load_models():
    global gb_model, preprocessor, _model_type, _model_feature_names

    sklearn_ver = importlib.metadata.version('scikit-learn')
    print(f"[Startup] scikit-learn version: {sklearn_ver}")
    print(f"[Startup] pandas    version: {pd.__version__}")

    model_path = os.path.join(os.path.dirname(__file__), "random_forest_model_5years.joblib")

    try:
        if not os.path.exists(model_path):
            print(f"[Startup] [MISS] File tidak ditemukan: {model_path}")
            gb_model = MockRULPredictor()
            _model_type = "mock"
            return

        print(f"[Startup] [OK] File ditemukan ({os.path.getsize(model_path):,} bytes). Memuat...")

        try:
            loaded_obj = joblib.load(model_path)
            print(f"[Startup] Tipe object: {type(loaded_obj)}")

            if isinstance(loaded_obj, tuple) and len(loaded_obj) == 2:
                preprocessor, gb_model = loaded_obj
                _model_type = "tuple"
                print(f"[Startup] [OK] Tuple -- preprocessor={type(preprocessor).__name__}, model={type(gb_model).__name__}")
                _model_feature_names = _extract_feature_names(preprocessor)

            elif isinstance(loaded_obj, dict) and 'model' in loaded_obj:
                gb_model = loaded_obj.get('model')
                preprocessor = loaded_obj.get('preprocessor')
                _model_type = "dict"
                print(f"[Startup] [OK] Dict -- model={type(gb_model).__name__}")
                _model_feature_names = _extract_feature_names(preprocessor or gb_model)

            elif hasattr(loaded_obj, "predict"):
                gb_model = loaded_obj
                _model_type = "pipeline"
                print(f"[Startup] [OK] Pipeline/model -- type={type(gb_model).__name__}")
                _model_feature_names = _extract_feature_names(gb_model)

            else:
                print(f"[Startup] [WARN] Tipe tidak dikenali: {type(loaded_obj)}. Pakai mock.")
                gb_model = MockRULPredictor()
                _model_type = "mock"

            if _model_feature_names:
                print(f"[Startup] Fitur model ({len(_model_feature_names)}): {_model_feature_names[:10]} ... (total {len(_model_feature_names)})")
            else:
                print("[Startup] [WARN] Nama fitur tidak bisa dibaca dari model.")

        except Exception as e:
            print(f"[Startup] [ERR] Gagal load model: {e}")
            print("[Startup] Pakai MockRULPredictor sebagai fallback.")
            gb_model = MockRULPredictor()
            _model_type = "mock"

    except Exception as e:
        print(f"[Startup] [ERR] Error tidak terduga: {e}")
        gb_model = MockRULPredictor()
        _model_type = "mock"

    print("[Startup] [OK] Severity engine: rule-based (tidak memerlukan file model)")


# ── Input schema ──────────────────────────────────────────────────────────────

class AssetInput(BaseModel):
    merek: str = Field(..., description="Merek aset, contoh: 'Sharp'")
    kategori: str = Field(..., description="Kategori aset, contoh: 'Mechanical'")
    sub_kategori: str = Field(..., description="Sub kategori aset, contoh: 'Tata Udara'")
    tipe: str = Field(..., description="Tipe aset, contoh: 'AC Split'")
    tingkat_kekritisan: str = Field(..., description="'Critical' | 'Major' | 'Minor'")

    # Historis — default 0 / kosong untuk aset baru
    mode_severity: str = Field(default="", description="Mode severity historis")
    count_nama_aset: int = Field(default=0, description="Jumlah maintenance historis")
    average_down_time: float = Field(default=0.0, description="Rata-rata downtime historis (jam)")
    average_selisih_maintenance: float = Field(default=0.0, description="Rata-rata selisih antar maintenance (hari)")
    sum_biaya_perbaikan: float = Field(default=0.0, description="Total biaya perbaikan historis")
    maximum_biaya_perbaikan: float = Field(default=0.0, description="Biaya perbaikan maksimal historis")
    lokasi_gedung: str = Field(default="", description="Nama gedung, contoh: 'Gedung A'")


class SummarizeRequest(BaseModel):
    company_id: Optional[str] = None
    limit: Optional[int] = 10
    temperature: Optional[float] = 0.2


# ── Helpers ───────────────────────────────────────────────────────────────────

# Kolom kategorikal yang perlu di-OHE (urutan harus sama dengan training)
_CAT_COLS = ["mode(Severity)", "Merek", "Kategori", "Sub Kategori", "Tipe", "Lokasi Gedung", "Tingkat Kekritisan"]


def _build_input_df(data: AssetInput) -> pd.DataFrame:
    """
    Bangun DataFrame 1 baris dengan kolom OHE yang cocok dengan model.
    Strategi:
      1. Buat df raw dengan kolom asli (numerik + kategorikal)
      2. pd.get_dummies — hasilkan OHE kolom
      3. reindex dengan _model_feature_names, isi kolom baru dengan 0
    """
    raw = {
        "count(Nama Aset)":           data.count_nama_aset,
        "average(down_time)":         data.average_down_time,
        "sum(Biaya Perbaikan)":       data.sum_biaya_perbaikan,
        "maximum(Biaya Perbaikan)":   data.maximum_biaya_perbaikan,
        "average(selisih_maintenance)": data.average_selisih_maintenance,
        # Kategorikal — akan di-OHE
        "mode(Severity)":             data.mode_severity if data.mode_severity else "normal",
        "Merek":                      data.merek,
        "Kategori":                   data.kategori,
        "Sub Kategori":               data.sub_kategori,
        "Tipe":                       data.tipe,
        "Lokasi Gedung":              data.lokasi_gedung,
        "Tingkat Kekritisan":         data.tingkat_kekritisan,
    }
    df_raw = pd.DataFrame([raw])

    # One-hot encode semua kolom kategorikal sekaligus
    df_ohe = pd.get_dummies(df_raw, columns=_CAT_COLS)

    # Sejajarkan dengan 202 fitur yang diharapkan model
    if _model_feature_names:
        df_aligned = df_ohe.reindex(columns=_model_feature_names, fill_value=0)
    else:
        df_aligned = df_ohe

    return df_aligned


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/")
def read_root():
    return {
        "message": "Kira AI Engine is running.",
        "model_type": _model_type,
        "feature_count": len(_model_feature_names),
    }


@app.get("/model-info")
def model_info():
    """Diagnostik: tipe model, fitur yang diharapkan, versi library."""
    return {
        "model_type": _model_type,
        "model_class": type(gb_model).__name__ if gb_model else None,
        "preprocessor_class": type(preprocessor).__name__ if preprocessor else None,
        "expected_features": _model_feature_names,
        "expected_feature_count": len(_model_feature_names),
        "sklearn_version": importlib.metadata.version("scikit-learn"),
        "pandas_version": pd.__version__,
        "numpy_version": np.__version__,
    }


@app.post("/predict")
def predict_rul(data: AssetInput):
    global gb_model, preprocessor

    if gb_model is None:
        raise HTTPException(status_code=503, detail="Model belum dimuat.")

    print(f"[Predict] model_type={_model_type}  merek={data.merek!r} "
          f"kategori={data.kategori!r} sub={data.sub_kategori!r} "
          f"tipe={data.tipe!r} kekritisan={data.tingkat_kekritisan!r}")

    try:
        if isinstance(gb_model, MockRULPredictor):
            # Mock path — tidak perlu OHE
            prediction = gb_model.predict(pd.DataFrame([{}]))
        elif preprocessor is not None:
            # Model disimpan sebagai (preprocessor, estimator) tuple/dict
            # Kirim raw DataFrame ke preprocessor
            raw_input = {
                "count(Nama Aset)":           data.count_nama_aset,
                "average(down_time)":         data.average_down_time,
                "sum(Biaya Perbaikan)":       data.sum_biaya_perbaikan,
                "maximum(Biaya Perbaikan)":   data.maximum_biaya_perbaikan,
                "average(selisih_maintenance)": data.average_selisih_maintenance,
                "mode(Severity)":             data.mode_severity if data.mode_severity else "normal",
                "Merek":                      data.merek,
                "Kategori":                   data.kategori,
                "Sub Kategori":               data.sub_kategori,
                "Tipe":                       data.tipe,
                "Lokasi Gedung":              data.lokasi_gedung,
                "Tingkat Kekritisan":         data.tingkat_kekritisan,
            }
            df_raw = pd.DataFrame([raw_input])
            processed = preprocessor.transform(df_raw)
            if hasattr(processed, "toarray"):
                processed = processed.toarray()
            prediction = gb_model.predict(processed)
        else:
            # Model berupa RandomForestRegressor tanpa Pipeline —
            # perlu OHE manual sesuai 202 fitur training
            df_input = _build_input_df(data)
            print(f"[Predict] Input shape setelah OHE: {df_input.shape}  (expected {len(_model_feature_names)})")
            prediction = gb_model.predict(df_input)

        result = float(prediction[0])
        print(f"[Predict] [OK] predicted_rul = {result:.2f}")
        return {"predicted_rul": result, "status": "success"}

    except Exception as e:
        print(f"[Predict] [ERR] {e}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=400,
            detail={
                "error": str(e),
                "hint": (
                    "Kemungkinan penyebab: nilai kategorikal tidak ada di data training "
                    "sehingga kolom OHE-nya kosong semua, atau fitur numerik di luar rentang."
                ),
                "model_expected_features": _model_feature_names[:20],
            }
        )


class SeverityInput(BaseModel):
    jenis_kerusakan: str = Field(..., description="Jenis kerusakan, contoh: 'Mati mendadak'")
    penyebab: str = Field(..., description="Penyebab kerusakan, contoh: 'Kelembaban tinggi'")
    spare_part: str = Field(default="", description="Spare part digunakan (opsional)")
    kategori: str = Field(..., description="Kategori aset, contoh: 'Mechanical'")
    sub_kategori: str = Field(..., description="Sub kategori aset, contoh: 'Tata Udara'")
    tipe: str = Field(..., description="Tipe aset, contoh: 'AC Split'")
    biaya_perbaikan: float = Field(default=0.0, description="Estimasi biaya perbaikan (Rp)")


@app.post("/predict-severity")
def predict_severity(data: SeverityInput):
    try:
        # ── Hitung skor rule-based (tokenisasi + keyword matching + biaya) ──
        scores = _compute_severity_scores(
            jenis_kerusakan=data.jenis_kerusakan,
            penyebab=data.penyebab,
            spare_part=data.spare_part,
            kategori=data.kategori,
            biaya_perbaikan=data.biaya_perbaikan,
        )

        # ── Pilih kelas dengan skor tertinggi ──────────────────────────────
        label_id = max(scores, key=scores.__getitem__)
        label_en = _SEVERITY_LABEL_MAP.get(label_id, label_id)

        # ── Normalisasi skor → probabilitas (proporsional linear) ──────────
        total = sum(scores.values())
        if total <= 0:
            # Fallback jika tidak ada keyword yang cocok sama sekali
            proba_id = {"Fatal": 0.05, "Berat": 0.15, "Sedang": 0.55, "Ringan": 0.25}
        else:
            proba_id = {k: round(v / total, 3) for k, v in scores.items()}

        proba_en   = {_SEVERITY_LABEL_MAP.get(k, k): v for k, v in proba_id.items()}
        confidence = round(max(proba_en.values()), 3)

        print(
            f"[Severity] label={label_en!r} confidence={confidence:.2f} "
            f"biaya={data.biaya_perbaikan:,.0f} scores={scores}"
        )
        return {
            "predicted_severity":    label_en,
            "predicted_severity_id": label_id,
            "confidence":            confidence,
            "probabilities":         proba_en,
            "scores":                scores,     # transparansi skor mentah
            "status":                "success",
        }
    except Exception as e:
        print(f"[Severity] [ERR] {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=400, detail={"error": str(e)})


@app.post("/summarize")
def summarize(req: SummarizeRequest):
    if summarize_company_assets is None:
        raise HTTPException(status_code=500, detail="Summarizer module tidak tersedia.")
    try:
        summary = (
            summarize_company_assets(req.company_id, limit=req.limit, temperature=req.temperature)
            if req.company_id
            else summarize_company_assets(limit=req.limit, temperature=req.temperature)
        )
        if isinstance(summary, dict) and "summary" in summary:
            return {
                "company_id": req.company_id,
                "summary": summary["summary"],
                "assets": summary.get("assets", []),
            }
        return {"company_id": req.company_id, "summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summarization error: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
