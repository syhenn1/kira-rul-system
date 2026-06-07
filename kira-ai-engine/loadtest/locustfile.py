"""
Load/stress scenarios for the AI engine, focused on `/predict` (RUL prediction)
and `/summarize` (the NLP-generate pipeline — the system's heaviest endpoint).

Usage (see loadtest/README.md for the full setup sequence):
    locust -f loadtest/locustfile.py --host http://localhost:8000

`/summarize` is dominated by a DB query plus up to 4 sequential LLM calls
(worst case ~4x60s timeout = ~240s), so SummarizeUser uses a long client-side
timeout and a low spawn weight/wait_time — it's meant to probe how the system
behaves under sustained-but-sparse "generate" requests, not to flood it.
"""
import random

from locust import HttpUser, task, between

# Seeded by kira-backend/prisma/seed.ts — adjust if you reseed with a different ID.
SEED_COMPANY_ID = "c0a80101-1234-4567-89ab-cdef12345678"

# Representative AssetInput payloads spanning a few brand/category combos
# from BRAND_VALIDATION_MATRIX (kira-frontend/components/AddAssetModal.tsx),
# plus varying historical-maintenance figures so predictions aren't trivially cached.
_PREDICT_PAYLOADS = [
    {
        "merek": "Sharp", "kategori": "Mechanical", "sub_kategori": "Tata Udara", "tipe": "AC Split",
        "tingkat_kekritisan": "Major", "mode_severity": "normal",
        "count_nama_aset": 4, "average_down_time": 6.5, "average_selisih_maintenance": 90.0,
        "sum_biaya_perbaikan": 1_500_000.0, "maximum_biaya_perbaikan": 800_000.0,
        "lokasi_gedung": "Gedung A",
    },
    {
        "merek": "Daikin", "kategori": "Mechanical", "sub_kategori": "Tata Udara", "tipe": "AC Cassette",
        "tingkat_kekritisan": "Critical", "mode_severity": "high",
        "count_nama_aset": 9, "average_down_time": 14.0, "average_selisih_maintenance": 45.0,
        "sum_biaya_perbaikan": 5_200_000.0, "maximum_biaya_perbaikan": 2_100_000.0,
        "lokasi_gedung": "Gedung B",
    },
    {
        "merek": "Perkins", "kategori": "Mechanical", "sub_kategori": "Genset", "tipe": "Genset Diesel",
        "tingkat_kekritisan": "Minor", "mode_severity": "normal",
        "count_nama_aset": 1, "average_down_time": 2.0, "average_selisih_maintenance": 180.0,
        "sum_biaya_perbaikan": 250_000.0, "maximum_biaya_perbaikan": 250_000.0,
        "lokasi_gedung": "Gedung A",
    },
    {
        "merek": "Hikvision", "kategori": "Security Sistem", "sub_kategori": "Sistem Pengawasan", "tipe": "Kamera CCTV",
        "tingkat_kekritisan": "Major", "mode_severity": "normal",
        "count_nama_aset": 0, "average_down_time": 0.0, "average_selisih_maintenance": 0.0,
        "sum_biaya_perbaikan": 0.0, "maximum_biaya_perbaikan": 0.0,
        "lokasi_gedung": "Gedung C",
    },
]

_LIMIT_VARIANTS = [1, 10, 50]

# Markers that show up when summarize_company_assets() falls back to
# _rule_based_summary() (i.e. all 4 LLM candidates failed) — used to estimate
# the fallback-trigger rate from response bodies alone, without engine-side instrumentation.
_FALLBACK_MARKERS = ("terpantau baik", "di bawah 365 hari", "Tidak ada data aset untuk diringkas")


class PredictUser(HttpUser):
    """CPU-bound, single-row sklearn `.predict()` — should stay fast under load."""
    weight = 3
    wait_time = between(1, 3)

    @task
    def predict_rul(self):
        payload = random.choice(_PREDICT_PAYLOADS)
        with self.client.post("/predict", json=payload, catch_response=True, name="/predict") as resp:
            if resp.status_code == 503:
                resp.failure("model not loaded (503)")
            elif resp.status_code >= 400:
                resp.failure(f"unexpected status {resp.status_code}: {resp.text[:200]}")
            elif "predicted_rul" not in resp.json():
                resp.failure("response missing predicted_rul")
            else:
                resp.success()


class SummarizeUser(HttpUser):
    """
    Heavier "generate" path: DB aggregation + up to 4 sequential LLM calls.
    Long wait_time and a generous client timeout reflect that this is a
    sparse, expensive operation — not something users mash repeatedly.
    """
    weight = 1
    wait_time = between(3, 8)

    @task(3)
    def summarize_default(self):
        self._summarize({"company_id": SEED_COMPANY_ID})

    @task(1)
    def summarize_limit_variants(self):
        self._summarize({"company_id": SEED_COMPANY_ID, "limit": random.choice(_LIMIT_VARIANTS)})

    def _summarize(self, payload):
        # Must exceed the 4 x 60s worst-case retry/fallback loop in summarize_company_assets().
        with self.client.post(
            "/summarize", json=payload, catch_response=True, name="/summarize", timeout=270,
        ) as resp:
            if resp.status_code >= 400:
                resp.failure(f"unexpected status {resp.status_code}: {resp.text[:200]}")
                return
            body = resp.json()
            summary = (body.get("summary") or "").strip()
            if not summary:
                resp.failure("empty summary in response")
                return
            if any(marker in summary for marker in _FALLBACK_MARKERS):
                resp.success()  # graceful fallback — not a failure, but worth tracking (see README)
            else:
                resp.success()


class SummarizeBurstUser(HttpUser):
    """
    Optional extra scenario: fire `/summarize` with little/no wait, to exercise
    the 4-candidate retry storm under concurrent load. Disable by default —
    run explicitly with `-u <n> --tags burst` style filtering, or just don't
    spawn this class's weight by setting it to 0 in a custom run.
    """
    weight = 0
    wait_time = between(0, 1)

    @task
    def summarize_burst(self):
        with self.client.post(
            "/summarize", json={"company_id": SEED_COMPANY_ID, "limit": 10},
            catch_response=True, name="/summarize [burst]", timeout=270,
        ) as resp:
            if resp.status_code >= 400:
                resp.failure(f"unexpected status {resp.status_code}: {resp.text[:200]}")
            elif not (resp.json().get("summary") or "").strip():
                resp.failure("empty summary in response")
            else:
                resp.success()
