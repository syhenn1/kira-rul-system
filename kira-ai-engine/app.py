import os
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

# Global model state
gb_model = None
preprocessor = None
_model_type: str = "none"
_model_feature_names: List[str] = []


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
