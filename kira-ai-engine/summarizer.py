import os
from datetime import datetime
from dotenv import load_dotenv
import requests

load_dotenv()

# Overridable so load tests can point this at a local stub server instead of
# the real HuggingFace Router (default preserves existing behavior).
HF_ROUTER_URL = os.getenv("HF_ROUTER_URL", "https://router.huggingface.co/v1/chat/completions")

# Delayed initialization: read env and create client when function called so
# importing this module doesn't fail when environment isn't available at import time.


def rows_from_dashboard_assets(assets):
    """Convert the per-asset insight records from the backend's aggregated dashboard
    payload (`asset_insights`, see /api/dashboard and /api/summarize in kira-backend)
    into the 12-tuple row shape `build_prompt`/`_rule_based_summary` expect.

    The summarizer intentionally does NOT query Postgres on its own anymore — it
    analyzes the SAME aggregated business view the user already sees on the
    dashboard, so the AI's narrative can never drift from what's on screen.
    """
    rows = []
    for a in assets or []:
        rows.append((
            a.get("id"),
            a.get("name"),
            a.get("brand"),
            a.get("category"),
            a.get("status"),
            a.get("maintenance_count"),
            a.get("average_down_time"),
            a.get("total_maintenance_cost"),
            a.get("max_maintenance_cost"),
            a.get("mode_severity"),
            a.get("predicted_rul"),
            a.get("recorded_at"),
        ))
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

def build_prompt(rows, critical_count=0):
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

        # Rule-based priority: RUL < 730 hari (2 tahun), status Scrap/Maintenance, atau riwayat
        # severity tinggi. Setiap pemicu dicatat eksplisit sebagai "alasan" dan ditempelkan ke
        # block-nya — supaya LLM tidak salah atribusi, mis. mengutip nilai RUL yang sebenarnya
        # SEHAT (>730, kategori OK) sebagai "bukti urgensi" padahal aset itu masuk prioritas
        # karena status operasional atau riwayat keparahan, bukan karena RUL-nya.
        rul_is_concern = pred_rul is not None and pred_rul < 730
        reasons = []
        if rul_is_concern:
            reasons.append(f"RUL rendah ({pred_rul} hari)")
        if str(status).lower() in ['scrap', 'maintenance']:
            reasons.append(f"status operasional saat ini '{status}'")
        if str(mode_sev).lower() in ['critical', 'high']:
            reasons.append(f"riwayat tingkat keparahan kerusakan '{mode_sev}'")
        is_kritis = bool(reasons)

        rul_line = f"Predicted RUL (hari): {pred_rul}"
        if pred_rul is not None and not rul_is_concern:
            rul_line += " — KATEGORI OK/SEHAT (bukan alasan kekritisan; jangan dikutip sebagai masalah)"

        block = (
            f"Asset: {name}\nBrand: {brand}\nCategory: {category}\nStatus: {status}\n"
            f"Maintenance count: {mcount}\nAverage downtime: {avg_dt}\nTotal maintenance cost: {total_cost}\n"
            f"Max maintenance cost: {max_cost}\nMode severity: {mode_sev}\n{rul_line}\nRecorded at: {recorded_at}"
        )
        if is_kritis:
            block += f"\nAlasan masuk prioritas tinggi: {'; '.join(reasons)}"

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
        "Anda adalah manajer aset senior yang membaca data kondisi aset dan menuliskan ANALISIS-nya untuk eksekutif perusahaan — "
        "bukan sekadar membacakan ulang isi data.\n\n"
        "Tulis MAKSIMAL 3 kalimat PENDEK (idealnya 2), total tidak lebih dari sekitar 70 kata, dalam Bahasa Indonesia yang "
        "terdengar seperti ditulis oleh manusia — lugas, langsung ke inti, tanpa basa-basi. Tugas Anda adalah membaca pola di "
        "balik angka-angka (mengapa sesuatu terjadi, apa kaitannya, apa dampaknya ke depan) lalu menyampaikan KESIMPULAN dan "
        "IMPLIKASINYA secara ringkas — bukan menyebutkan ulang setiap angka satu per satu seolah membacakan formulir. "
        "PRIORITASKAN keringkasan: lebih baik 2 kalimat tajam dan utuh daripada 3 kalimat yang bertele-tele atau terpotong "
        "di tengah.\n\n"
        "Threshold RUL (Remaining Useful Life) yang berlaku dalam sistem (satuan HARI):\n"
        "- CRITICAL: RUL ≤ 180 hari — perlu penanganan segera\n"
        "- HIGH: RUL ≤ 365 hari — prioritas tinggi\n"
        "- WATCH: RUL ≤ 730 hari — perlu dipantau\n"
        "- OK: RUL > 730 hari — kondisi baik\n\n"
        "Aturan wajib:\n"
        "1. JANGAN sekadar mendaftar ulang nilai individual satu per satu (mis. 'aset A RUL sekian hari, aset B biaya sekian'). "
        "Sebaliknya, HUBUNGKAN beberapa data poin menjadi satu pemahaman: misalnya pola yang menjelaskan MENGAPA suatu kelompok "
        "aset masuk prioritas tinggi (kombinasi RUL rendah + riwayat keparahan + status operasional), atau apa arti dari "
        "perbandingan kondisi kritis vs normal terhadap beban kerja tim maintenance ke depan.\n"
        "2. Mulai langsung dengan insight terpenting dari blok [PRIORITAS TINGGI] — bukan dengan menyebut angka mentah duluan, "
        "tapi dengan apa MAKNA-nya. Jangan buka dengan frasa seperti 'Berdasarkan data', 'Berikut adalah', 'Ringkasan menunjukkan', atau sejenisnya.\n"
        "3. Gunakan kata ganti umum, bukan nama spesifik aset atau merek (contoh: 'sejumlah unit mekanikal', 'beberapa perangkat kategori electrical').\n"
        "4. Tutup dengan rekomendasi tindakan yang MENGALIR LOGIS dari analisis tersebut (akibat → tindakan), bukan saran generik "
        "seperti 'perlu dipantau' tanpa konteks.\n"
        "5. Jika tidak ada aset kritis, jelaskan secara analitis APA ARTI kondisi itu bagi perencanaan ke depan (mis. ruang untuk "
        "fokus ke maintenance preventif, bukan reaktif) — jangan hanya menyatakan 'kondisi baik-baik saja' secara datar.\n"
        "6. Jangan gunakan bullet point, angka berurutan, atau format markdown apapun.\n"
        "7. Gunakan satuan HARI (bukan bulan) saat menyebut nilai RUL — dan sebutkan secukupnya saja sebagai pendukung analisis, "
        "jangan jadikan deretan angka sebagai isi utama kalimat.\n"
        "8. PENTING — setiap aset di [PRIORITAS TINGGI] punya baris 'Alasan masuk prioritas tinggi:' yang menjelaskan "
        "pemicu SEBENARNYA (RUL rendah, status operasional, atau riwayat keparahan). Jika baris 'Predicted RUL' "
        "ditandai 'KATEGORI OK/SEHAT', JANGAN sebutkan angka RUL tersebut sebagai bukti masalah — RUL aset itu sehat. "
        "Sebutkan alasan aktualnya sesuai baris 'Alasan masuk prioritas tinggi'. Hanya kutip nilai RUL sebagai masalah "
        "untuk aset yang alasannya memang 'RUL rendah'.\n"
        "9. Jika menyebutkan ANGKA TOTAL aset berstatus CRITICAL (RUL ≤ 180 hari) di seluruh perusahaan, WAJIB gunakan "
        f"angka dari [FAKTA SISTEM] di bawah ({critical_count}) — JANGAN menghitung sendiri jumlah blok di "
        "[PRIORITAS TINGGI], karena daftar tersebut hanya sampel aset dengan RUL terendah, bukan jumlah total perusahaan.\n"
    )

    prompt_data = (
        f"[FAKTA SISTEM]\nJumlah total aset berstatus CRITICAL (RUL ≤ 180 hari) di seluruh perusahaan: {critical_count}\n\n"
        f"[Top Keywords dari data aset]: {top_keywords}\n\n"
        f"[PRIORITAS TINGGI — aset yang memerlukan perhatian segera]\n{teks_prioritas}\n\n"
        f"[KONDISI NORMAL — aset dengan performa baik]\n{teks_normal}"
    )

    messages = [
        {"role": "system", "content": "Kamu adalah manajer aset berpengalaman yang menganalisis data kondisi aset dan menuliskan insight singkatnya — bukan membacakan ulang data — dalam Bahasa Indonesia."},
        {"role": "user", "content": instruction + "\n\nData aset:\n\n" + prompt_data},
    ]
    return messages, extracted_assets


def _rule_based_summary(rows) -> str:
    """Fallback: generate a plain-text summary from the data without an LLM."""
    total = len(rows)
    kritis = [r for r in rows if r[10] is not None and r[10] < 365]
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
        f"dengan sisa umur di bawah 365 hari. "
        f"Dari total {total} aset yang dipantau, {normal} unit lainnya masih beroperasi dalam kondisi normal."
    )


# Models to try in order; format: (model_id, provider_or_None)
_MODEL_CANDIDATES = [
    ("meta-llama/Llama-3.1-8B-Instruct", "novita"),
    ("meta-llama/Llama-3.1-8B-Instruct", "sambanova"),
    ("Qwen/Qwen2.5-7B-Instruct", None),
    ("HuggingFaceH4/zephyr-7b-beta", None),
]


def summarize_company_assets(assets, critical_count: int = 0, limit: int = 20, temperature: float = 0.2):
    """Generate an executive summary from the company's aggregated dashboard data.

    `assets` is the `asset_insights` list from the backend's /api/dashboard payload
    (already ordered by predicted_rul ascending) — the same business-process view
    rendered on screen. We deliberately take this as input instead of querying
    Postgres ourselves, so the AI's narrative is always consistent with the dashboard.
    """
    HF_TOKEN = os.getenv("HF_TOKEN")
    if not HF_TOKEN:
        raise RuntimeError("HF_TOKEN not set in environment")

    rows = rows_from_dashboard_assets((assets or [])[:limit])
    if not rows:
        return {"summary": "Tidak ada data aset untuk diringkas.", "assets": [], "critical_count": 0}

    messages, assets_data = build_prompt(rows, critical_count=critical_count)
    url = HF_ROUTER_URL
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
            "max_tokens": 350,
        }
        if provider:
            payload["provider"] = provider

        try:
            response = requests.post(url, headers=headers, json=payload, timeout=60)
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"].strip()
            return {"summary": content, "assets": assets_data, "critical_count": critical_count}
        except Exception as e:
            last_error = e
            continue  # try next model

    # All models failed — return rule-based summary so the card still shows something
    print(f"All LLM candidates failed (last error: {last_error}). Falling back to rule-based summary.")
    return {
        "summary": _rule_based_summary(rows),
        "assets": assets_data,
        "critical_count": critical_count,
    }


if __name__ == "__main__":
    import argparse
    import json

    parser = argparse.ArgumentParser(
        description="Summarize a company's assets from a dashboard payload (JSON file with an `asset_insights` array, e.g. a saved /api/dashboard response)"
    )
    parser.add_argument("dashboard_json", help="Path to a JSON file containing the dashboard payload")
    parser.add_argument("--limit", type=int, default=10)
    args = parser.parse_args()

    with open(args.dashboard_json, "r", encoding="utf-8") as f:
        dashboard = json.load(f)

    assets = dashboard.get("asset_insights", [])
    critical_count = dashboard.get("alerts_summary", {}).get("critical", 0)
    summary = summarize_company_assets(assets, critical_count=critical_count, limit=args.limit)
    print(summary)
