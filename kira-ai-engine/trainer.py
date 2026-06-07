"""
trainer.py — Self-training pipeline for Kira AI Engine.

Fetches live data from PostgreSQL, engineers features identical to what
the prediction endpoint expects, trains a GradientBoosting RUL model,
and saves it atomically so app.py can hot-swap the in-memory model.
"""
from __future__ import annotations

import os
from datetime import datetime, timezone, timedelta

TZ_WIB = timezone(timedelta(hours=7))

import joblib
import numpy as np
import pandas as pd
from sqlalchemy import create_engine
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

# ─── Constants ────────────────────────────────────────────────────────────────

_CAT_COLS = [
    "mode(Severity)",
    "Merek",
    "Kategori",
    "Sub Kategori",
    "Tipe",
    "Lokasi Gedung",
    "Tingkat Kekritisan",
]
_NUM_COLS = [
    "count(Nama Aset)",
    "average(down_time)",
    "sum(Biaya Perbaikan)",
    "maximum(Biaya Perbaikan)",
    "average(selisih_maintenance)",
]
_TARGET = "predicted_rul"

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RETRAINED_MODEL_PATH = os.path.join(_BASE_DIR, "auto_retrained_model.joblib")
TRAINING_LOG_PATH = os.path.join(_BASE_DIR, "training_log.txt")

# ─── SQL ──────────────────────────────────────────────────────────────────────
# CTE computes per-asset avg interval between maintenances (days).
# All feature columns mirror the AssetInput schema in app.py.

_SQL = """
WITH maint_intervals AS (
    SELECT
        id_asset,
        scheduled_date,
        LAG(scheduled_date) OVER (
            PARTITION BY id_asset ORDER BY scheduled_date
        ) AS prev_date
    FROM maintenances
),
maint_stats AS (
    SELECT
        id_asset,
        AVG(
            EXTRACT(EPOCH FROM (scheduled_date - prev_date)) / 86400.0
        ) AS avg_interval
    FROM maint_intervals
    WHERE prev_date IS NOT NULL
    GROUP BY id_asset
)
SELECT
    aph.predicted_rul,
    aph.maintenance_count                                         AS "count(Nama Aset)",
    aph.average_down_time                                         AS "average(down_time)",
    aph.total_maintenance_cost                                    AS "sum(Biaya Perbaikan)",
    aph.max_maintenance_cost                                      AS "maximum(Biaya Perbaikan)",
    COALESCE(NULLIF(TRIM(aph.mode_severity), ''), 'normal')       AS "mode(Severity)",
    COALESCE(mk.nama,  'Generic')                                  AS "Merek",
    COALESCE(k.nama,   'Mechanical')                               AS "Kategori",
    COALESCE(sk.nama,  'Tata Udara')                               AS "Sub Kategori",
    COALESCE(t.nama,   'AC Split')                                  AS "Tipe",
    COALESCE(g.nama,   'Gedung A')                                  AS "Lokasi Gedung",
    a.criticality_level                                            AS "Tingkat Kekritisan",
    COALESCE(ms.avg_interval, 30.0)                                AS "average(selisih_maintenance)"
FROM asset_prediction_history aph
JOIN  assets        a  ON a.id   = aph.id_asset
LEFT JOIN merk         mk ON mk.id  = a.merk_id
LEFT JOIN kategori     k  ON k.id   = a.kategori_id
LEFT JOIN sub_kategori sk ON sk.id  = a.sub_kategori_id
LEFT JOIN tipe          t  ON t.id   = a.tipe_id
LEFT JOIN gedung        g  ON g.id   = a.gedung_id
LEFT JOIN maint_stats  ms ON ms.id_asset = a.id
WHERE aph.predicted_rul > 0
"""

# ─── Database ─────────────────────────────────────────────────────────────────


def fetch_training_data() -> pd.DataFrame:
    raw = os.getenv("DATABASE_URL", "")
    # Strip Prisma-specific query params (e.g. ?schema=public) — psycopg2 rejects them
    url = raw.split("?")[0].replace("postgresql://", "postgresql+psycopg2://", 1)
    engine = create_engine(url)
    with engine.connect() as conn:
        return pd.read_sql(_SQL, conn)


# ─── Feature engineering ──────────────────────────────────────────────────────


def _build_matrix(df: pd.DataFrame) -> tuple[pd.DataFrame, np.ndarray]:
    """
    OHE categorical columns identically to _build_input_df() in app.py.
    Returns (X: DataFrame with OHE columns, y: float array).
    The DataFrame X retains column names so sklearn stores feature_names_in_.
    """
    df = df.copy()
    y = df[_TARGET].to_numpy(dtype=float)

    X_raw = df[_CAT_COLS + _NUM_COLS].copy()
    for col in _NUM_COLS:
        X_raw[col] = pd.to_numeric(X_raw[col], errors="coerce").fillna(0.0)

    # pd.get_dummies matches the OHE strategy used at inference time
    X_ohe = pd.get_dummies(X_raw, columns=_CAT_COLS, dtype=float)
    return X_ohe, y


# ─── Logging ──────────────────────────────────────────────────────────────────


def _write_log(meta: dict) -> None:
    m = meta["metrics"]
    line = (
        f"[{meta['finished_at']}] "
        f"rows={meta['row_count']} "
        f"train={meta['train_size']} test={meta['test_size']} "
        f"MAE={m['mae']:.4f} "
        f"RMSE={m['rmse']:.4f} "
        f"MAPE={m['mape']:.4f}% "
        f"R2={m['r2']:.4f} "
        f"duration={meta['duration_seconds']}s\n"
    )
    with open(TRAINING_LOG_PATH, "a", encoding="utf-8") as f:
        f.write(line)


# ─── Training pipeline ────────────────────────────────────────────────────────


def run_training() -> dict:
    """
    Full pipeline: fetch → features → train → atomic save.

    Returns a metadata dict (no model object — caller reloads from disk).
    Raises on any failure so the scheduler can log the error.
    """
    started_at = datetime.now(TZ_WIB)
    print(f"[Trainer] ▶ Started {started_at.isoformat()}")

    # 1. Fetch
    df = fetch_training_data()
    n_rows = len(df)
    print(f"[Trainer] Rows fetched: {n_rows}")

    if n_rows < 10:
        raise ValueError(f"Too few training rows ({n_rows}). Minimum: 10.")

    # 2. Features
    X, y = _build_matrix(df)
    print(f"[Trainer] Feature matrix shape: {X.shape}")

    # 3. Split — keep test set ≥10 rows but ≤25% of data
    test_frac = float(np.clip(20 / n_rows, 0.10, 0.25))
    X_tr, X_te, y_tr, y_te = train_test_split(
        X, y, test_size=test_frac, random_state=42
    )

    # 4. Train
    model = GradientBoostingRegressor(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.1,
        subsample=0.8,
        min_samples_leaf=2,
        random_state=42,
    )
    model.fit(X_tr, y_tr)

    # 5. Evaluate
    y_pred = model.predict(X_te)
    mae = float(mean_absolute_error(y_te, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_te, y_pred)))
    # MAPE: skip samples where actual == 0 to avoid division by zero
    nonzero = y_te != 0
    mape = float(np.mean(np.abs((y_te[nonzero] - y_pred[nonzero]) / y_te[nonzero])) * 100) if nonzero.any() else 0.0
    r2 = float(r2_score(y_te, y_pred))

    # 6. Atomic save: write .tmp → rename (safe even on Windows)
    tmp = RETRAINED_MODEL_PATH + ".tmp"
    joblib.dump(model, tmp)
    os.replace(tmp, RETRAINED_MODEL_PATH)

    finished_at = datetime.now(TZ_WIB)
    duration = (finished_at - started_at).total_seconds()
    print(
        f"[Trainer] ✓ Done in {duration:.1f}s  "
        f"MAE={mae:.3f}  RMSE={rmse:.3f}  MAPE={mape:.2f}%  R²={r2:.3f}  features={X.shape[1]}"
    )

    meta = {
        "row_count": n_rows,
        "feature_count": X.shape[1],
        "feature_names": list(X.columns),
        "train_size": len(X_tr),
        "test_size": len(X_te),
        "metrics": {
            "mae": round(mae, 4),
            "rmse": round(rmse, 4),
            "mape": round(mape, 4),
            "r2": round(r2, 4),
        },
        "model_path": RETRAINED_MODEL_PATH,
        "started_at": started_at.isoformat(),
        "finished_at": finished_at.isoformat(),
        "duration_seconds": round(duration, 2),
    }
    _write_log(meta)
    return meta
