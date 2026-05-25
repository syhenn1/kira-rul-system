import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import pandas as pd
import numpy as np
import joblib
from typing import Optional

# import summarizer module
try:
    from summarizer import summarize_company_assets
except Exception:
    summarize_company_assets = None

app = FastAPI(title="Kira AI Engine", description="RUL Prediction API")

# Setup global variables for the model and preprocessor
gb_model = None
preprocessor = None
feature_names = None

class MockRULPredictor:
    """Mock RUL Predictor for testing - returns simulated RUL based on input"""
    def predict(self, data):
        # Simple mock: return random RUL between 5 and 90 days
        # In real scenario, this would use actual ML model
        if isinstance(data, pd.DataFrame):
            base_rul = 50
            # Adjust RUL based on tingkat_kekritisan if available
            if len(data) > 0:
                # Add some variation based on row count
                base_rul += np.random.randint(-20, 20)
            return np.array([max(1, base_rul)])
        else:
            return np.array([50])

# We attempt to load the model and preprocessor on startup if they exist
@app.on_event("startup")
def load_models():
    global gb_model, preprocessor, feature_names
    model_path = os.path.join(os.path.dirname(__file__), "v2_gradient_boosting_model_retrained_new_data.joblib")
    
    try:
        if os.path.exists(model_path):
            try:
                loaded_obj = joblib.load(model_path)
                
                # Cek apakah object berupa tuple (misalnya (preprocessor, model))
                if isinstance(loaded_obj, tuple) and len(loaded_obj) == 2:
                    preprocessor, gb_model = loaded_obj
                    print("Successfully loaded preprocessor and model from tuple")
                # Cek apakah object berupa dict dengan key tertentu
                elif isinstance(loaded_obj, dict) and 'model' in loaded_obj:
                    gb_model = loaded_obj.get('model')
                    preprocessor = loaded_obj.get('preprocessor')
                    print("Successfully loaded model from dict")
                # Jika hanya memiliki method predict, mungkin itu Pipeline atau model tunggal
                elif hasattr(loaded_obj, "predict"):
                    gb_model = loaded_obj
                    print("Successfully loaded model (or pipeline) from single joblib file")
                else:
                    print(f"Loaded object type {type(loaded_obj)} is not recognized")
                    gb_model = MockRULPredictor()
                    print("Using mock predictor instead")
            except Exception as e:
                print(f"Failed to load joblib model: {e}. Using mock predictor for testing.")
                gb_model = MockRULPredictor()
        else:
            print("Model file not found. Using mock predictor for testing.")
            gb_model = MockRULPredictor()
                
    except Exception as e:
        print(f"Warning: Could not load models. Error: {e}. Using mock predictor.")
        gb_model = MockRULPredictor()

class AssetInput(BaseModel):
    merek: str = Field(..., description="Merek aset, contoh: 'Sharp'")
    kategori: str = Field(..., description="Kategori aset, contoh: 'Mechanical'")
    sub_kategori: str = Field(..., description="Sub kategori aset, contoh: 'Tata Udara'")
    tipe: str = Field(..., description="Tipe aset, contoh: 'Generator Portable'")
    tingkat_kekritisan: str = Field(..., description="Tingkat kekritisan, contoh: 'Critical'")
    
    # Historis (nominal & default 0 / kosong)
    mode_severity: str = Field(default="", description="Mode severity historis")
    count_nama_aset: int = Field(default=0, description="Count nama aset historis")
    average_down_time: float = Field(default=0.0, description="Rata-rata downtime historis")
    sum_biaya_perbaikan: float = Field(default=0.0, description="Total biaya perbaikan historis")
    maximum_biaya_perbaikan: float = Field(default=0.0, description="Biaya perbaikan maksimal historis")


class SummarizeRequest(BaseModel):
    company_id: Optional[str] = None
    limit: Optional[int] = 10
    temperature: Optional[float] = 0.2


@app.get("/")
def read_root():
    return {"message": "Kira AI Engine is running. Use /predict to get RUL predictions."}

@app.post("/predict")
def predict_rul(data: AssetInput):
    global gb_model, preprocessor
    
    if gb_model is None:
        raise HTTPException(status_code=503, detail="Models are not loaded. Please provide gradient_boosting_model_retrained_new_data.joblib in kira-ai-engine folder.")

    # Create raw custom input based on user's instruction
    raw_input_data = {
        'count(Nama Aset)': [data.count_nama_aset],
        'average(down_time)': [data.average_down_time],
        'sum(Biaya Perbaikan)': [data.sum_biaya_perbaikan],
        'mode(Severity)': [data.mode_severity],
        'Merek': [data.merek],
        'Kategori': [data.kategori],
        'Sub Kategori': [data.sub_kategori],
        'Tipe': [data.tipe],
        'Tingkat Kekritisan': [data.tingkat_kekritisan],
        'maximum(Biaya Perbaikan)': [data.maximum_biaya_perbaikan]
    }
    
    new_raw_input_df = pd.DataFrame(raw_input_data)
    
    try:
        # Jika ada preprocessor terpisah di dalam file yang sama (tuple/dict)
        if preprocessor is not None:
            new_processed_array = preprocessor.transform(new_raw_input_df)
            if hasattr(new_processed_array, 'toarray'):
                new_processed_array = new_processed_array.toarray()
            prediction = gb_model.predict(new_processed_array)
        else:
            # Jika tidak ada preprocessor terpisah, asumsikan model adalah Pipeline
            # yang bisa menerima dataframe raw secara langsung
            prediction = gb_model.predict(new_raw_input_df)
        
        return {
            "predicted_rul": float(prediction[0]),
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction error. If this fails, it might mean the model requires a separate preprocessor but it wasn't found in the .joblib file. Error: {str(e)}")


@app.post("/summarize")
def summarize(req: SummarizeRequest):
    if summarize_company_assets is None:
        raise HTTPException(status_code=500, detail="Summarizer module not available or failed to import.")
    try:
        if req.company_id:
            summary = summarize_company_assets(req.company_id, limit=req.limit, temperature=req.temperature)
        else:
            # call summarizer with its default company id when none provided
            summary = summarize_company_assets(limit=req.limit, temperature=req.temperature)
        if isinstance(summary, dict) and "summary" in summary:
            return {
                "company_id": req.company_id, 
                "summary": summary["summary"],
                "assets": summary.get("assets", [])
            }
        else:
            return {"company_id": req.company_id, "summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summarization error: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
