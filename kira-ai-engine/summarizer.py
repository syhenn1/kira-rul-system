import os
from datetime import datetime
from dotenv import load_dotenv
import psycopg2
from urllib.parse import urlsplit
import requests

load_dotenv()

# Delayed initialization: read env and create client when function called so
# importing this module doesn't fail when environment isn't available at import time.



def fetch_asset_aggregates(company_id: str, limit: int = 20):
    """Fetch recent asset aggregate records for a company from Postgres."""
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL not set in environment")
    
    # Strip any accidental quotes from the environment variable
    DATABASE_URL = DATABASE_URL.strip('"').strip("'")
    
    # Use urllib to parse the URL and pass explicit parameters to psycopg2
    # to avoid any libpq parsing issues with unsupported query parameters (like schema)
    parsed = urlsplit(DATABASE_URL)
    conn = psycopg2.connect(
        dbname=parsed.path.lstrip('/'),
        user=parsed.username,
        password=parsed.password,
        host=parsed.hostname,
        port=parsed.port
    )
    cur = conn.cursor()
    sql = """
    SELECT a.id, a.asset_name,
           COALESCE(m.nama, 'Generic') AS brand,
           COALESCE(k.nama, 'Mekanik') AS category,
           a.status,
           aph.maintenance_count, aph.average_down_time, aph.total_maintenance_cost,
           aph.max_maintenance_cost, aph.mode_severity, aph.predicted_rul, aph.recorded_at
    FROM asset_prediction_history aph
    JOIN assets a ON aph.id_asset = a.id
    JOIN companies c ON a.id_perusahaan = c.id
    LEFT JOIN merk m ON m.id = a.merk_id
    LEFT JOIN kategori k ON k.id = a.kategori_id
    WHERE c.id = %s
    ORDER BY aph.recorded_at DESC
    LIMIT %s
    """
    cur.execute(sql, (company_id, limit))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows


import re
from collections import Counter

class ExplicitNLPPipeline:
    """
    Implementasi eksplisit dari tahap-tahap NLP Pipeline sesuai syarat matkul.
    Walaupun LLM bisa melakukan ini secara implisit, kita mendefinisikan
    proses Tokenisasi, Normalisasi, Stopword Removal, dan Feature Extraction di sini.
    """
    def __init__(self):
        self.stopwords = {
            'dan', 'atau', 'yang', 'di', 'ke', 'dari', 'pada', 'dalam', 
            'untuk', 'dengan', 'ini', 'itu', 'adalah', 'sebagai', 'tersebut',
            'tipe', 'aset', 'kategori'
        }

    def normalize(self, text: str) -> str:
        # Lowercase and remove punctuation
        text = text.lower()
        return re.sub(r'[^\w\s]', ' ', text)

    def tokenize(self, text: str) -> list:
        # Split into tokens/words
        return text.split()

    def remove_stopwords(self, tokens: list) -> list:
        # Remove common Indonesian stopwords
        return [word for word in tokens if word not in self.stopwords and len(word) > 1]

    def extract_features(self, tokens: list, top_n: int = 5) -> dict:
        # Feature Extraction: Bag of Words / Term Frequency
        freq = Counter(tokens)
        return dict(freq.most_common(top_n))

    def process(self, raw_text: str) -> dict:
        # 1. Normalization
        normalized = self.normalize(raw_text)
        # 2. Tokenization
        tokens = self.tokenize(normalized)
        # 3. Stopword Removal
        filtered_tokens = self.remove_stopwords(tokens)
        # 4. Feature Extraction
        features = self.extract_features(filtered_tokens)
        
        return features

def build_prompt(rows):
    prioritas_tinggi = []
    normal = []
    
    raw_text_for_nlp = ""
    
    # Kumpulkan data aset
    extracted_assets = []
    
    for r in rows:
        (aid, name, brand, category, status, mcount, avg_dt, total_cost, max_cost, mode_sev, pred_rul, recorded_at) = r
        if isinstance(recorded_at, datetime):
            recorded_at = recorded_at.isoformat()
            
        # Simpan untuk frontend
        extracted_assets.append({
            "id": aid,
            "name": name,
            "brand": brand,
            "category": category,
            "status": status,
            "pred_rul": pred_rul
        })
            
        raw_text_for_nlp += f"{name} {brand} {category} {status} {mode_sev} "
        
        block = (
            f"Asset: {name}\nBrand: {brand}\nCategory: {category}\nStatus: {status}\n"
            f"Maintenance count: {mcount}\nAverage downtime: {avg_dt}\nTotal maintenance cost: {total_cost}\n"
            f"Max maintenance cost: {max_cost}\nMode severity: {mode_sev}\nPredicted RUL (months): {pred_rul}\nRecorded at: {recorded_at}"
        )
        
        # Rule-based priority: RUL < 24 bulan, status Scrap/Maintenance, atau severity tinggi
        is_kritis = False
        if (pred_rul is not None and pred_rul < 24) or (str(status).lower() in ['scrap', 'maintenance']) or (str(mode_sev).lower() in ['critical', 'high']):
            is_kritis = True
            
        if is_kritis:
            prioritas_tinggi.append(block)
        else:
            normal.append(block)
            
    # --- Eksekusi Explicit NLP Pipeline ---
    nlp_pipeline = ExplicitNLPPipeline()
    extracted_features = nlp_pipeline.process(raw_text_for_nlp)
    top_keywords = ", ".join([f"'{k}' (muncul {v}x)" for k, v in extracted_features.items()])
    # --------------------------------------

    teks_prioritas = "\n---\n".join(prioritas_tinggi) if prioritas_tinggi else "Tidak ada aset kritis saat ini."
    teks_normal = "\n---\n".join(normal) if normal else "Tidak ada aset normal saat ini."

    instruction = (
        "Anda adalah manajer aset senior yang menulis catatan harian kondisi aset untuk eksekutif perusahaan.\n\n"
        "Tulis 2 kalimat ringkasan dalam Bahasa Indonesia yang terdengar seperti ditulis oleh manusia — lugas, langsung ke inti masalah, tanpa basa-basi.\n\n"
        "Aturan wajib:\n"
        "1. Mulai langsung dengan kondisi yang paling mendesak dari blok [PRIORITAS TINGGI]. Jangan buka dengan frasa seperti 'Berdasarkan data', 'Berikut adalah', 'Ringkasan menunjukkan', atau sejenisnya.\n"
        "2. Gunakan kata ganti umum, bukan nama spesifik aset atau merek (contoh: 'sejumlah unit mekanikal', 'beberapa perangkat kategori electrical').\n"
        "3. Kalimat kedua boleh menyebut kondisi aset yang normal sebagai konteks perbandingan, atau langsung berisi rekomendasi tindakan.\n"
        "4. Jika tidak ada aset kritis, tulis secara singkat bahwa kondisi operasional aset perusahaan saat ini terpantau baik dan tidak ada tindakan mendesak yang diperlukan.\n"
        "5. Jangan gunakan bullet point, angka berurutan, atau format markdown apapun.\n"
    )

    prompt_data = (
        f"[Top Keywords dari data aset]: {top_keywords}\n\n"
        f"[PRIORITAS TINGGI — aset yang memerlukan perhatian segera]\n{teks_prioritas}\n\n"
        f"[KONDISI NORMAL — aset dengan performa baik]\n{teks_normal}"
    )

    messages = [
        {"role": "system", "content": "Kamu adalah manajer aset berpengalaman yang menulis laporan singkat kondisi aset dalam Bahasa Indonesia."},
        {"role": "user", "content": instruction + "\n\nData aset:\n\n" + prompt_data},
    ]
    return messages, extracted_assets


def _rule_based_summary(rows) -> str:
    """Fallback: generate a plain-text summary from the data without an LLM."""
    total = len(rows)
    kritis = [r for r in rows if r[10] is not None and r[10] < 12]
    normal = total - len(kritis)
    if not kritis:
        return (
            f"Kondisi operasional {total} aset perusahaan saat ini terpantau baik — "
            "tidak ada unit yang memerlukan tindakan mendesak. "
            "Lanjutkan program maintenance preventif sesuai jadwal yang telah ditetapkan."
        )
    categories = list({r[3] for r in kritis})
    cat_str = " dan ".join(categories[:2])
    return (
        f"Terdapat {len(kritis)} unit aset kategori {cat_str} yang memerlukan perhatian segera "
        f"dengan sisa umur di bawah 12 bulan. "
        f"Dari total {total} aset yang dipantau, {normal} unit lainnya masih beroperasi dalam kondisi normal."
    )


# Models to try in order; format: (model_id, provider_or_None)
_MODEL_CANDIDATES = [
    ("meta-llama/Llama-3.1-8B-Instruct", "novita"),
    ("meta-llama/Llama-3.1-8B-Instruct", "sambanova"),
    ("Qwen/Qwen2.5-7B-Instruct", None),
    ("HuggingFaceH4/zephyr-7b-beta", None),
]


def summarize_company_assets(company_id: str, limit: int = 20, temperature: float = 0.2):
    HF_TOKEN = os.getenv("HF_TOKEN")
    if not HF_TOKEN:
        raise RuntimeError("HF_TOKEN not set in environment")

    rows = fetch_asset_aggregates(company_id, limit)
    if not rows:
        return {"summary": "Tidak ada data aset untuk diringkas.", "assets": []}

    messages, assets_data = build_prompt(rows)
    url = "https://router.huggingface.co/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {HF_TOKEN}",
        "Content-Type": "application/json",
    }

    last_error = None
    for model_id, provider in _MODEL_CANDIDATES:
        payload = {
            "model": model_id,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": 300,
        }
        if provider:
            payload["provider"] = provider

        try:
            response = requests.post(url, headers=headers, json=payload, timeout=60)
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"].strip()
            return {"summary": content, "assets": assets_data}
        except Exception as e:
            last_error = e
            continue  # try next model

    # All models failed — return rule-based summary so the card still shows something
    print(f"All LLM candidates failed (last error: {last_error}). Falling back to rule-based summary.")
    return {
        "summary": _rule_based_summary(rows),
        "assets": assets_data,
    }


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Summarize company assets using HF model via OpenAI API")
    parser.add_argument("company_id", help="Company UUID to summarize")
    parser.add_argument("--limit", type=int, default=10)
    args = parser.parse_args()

    summary = summarize_company_assets(args.company_id, limit=args.limit)
    print(summary)
