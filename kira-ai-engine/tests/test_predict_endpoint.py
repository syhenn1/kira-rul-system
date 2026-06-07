"""Tests for POST /predict (app.py:420-481) and its helper _build_input_df
(app.py:319-353), via FastAPI's TestClient.

IMPORTANT: `TestClient(app)` is instantiated WITHOUT the `with` context-manager
form on purpose — Starlette only triggers `@app.on_event("startup")` handlers
when the client is used as a context manager. Avoiding that means the real
`load_models()` startup hook (which loads multi-MB .joblib files from disk)
never runs; `gb_model` stays at its module-level `None`/`MockRULPredictor`-free
state and each test fully controls it via `monkeypatch.setattr`.
"""
from unittest.mock import MagicMock

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

import app as app_module
from app import app, AssetInput, MockRULPredictor, _build_input_df

pytestmark = pytest.mark.integration

client = TestClient(app)


def valid_asset_payload(**overrides):
    payload = {
        "merek": "Sharp",
        "kategori": "Mechanical",
        "sub_kategori": "Tata Udara",
        "tipe": "AC Split",
        "tingkat_kekritisan": "Major",
        "mode_severity": "normal",
        "count_nama_aset": 3,
        "average_down_time": 5.0,
        "average_selisih_maintenance": 30.0,
        "sum_biaya_perbaikan": 1_000_000.0,
        "maximum_biaya_perbaikan": 500_000.0,
        "lokasi_gedung": "Gedung A",
    }
    payload.update(overrides)
    return payload


class TestPredictEndpointStatusPaths:
    def test_returns_503_when_model_not_loaded(self, monkeypatch):
        monkeypatch.setattr(app_module, "gb_model", None)

        response = client.post("/predict", json=valid_asset_payload())

        assert response.status_code == 503
        assert "Model belum dimuat" in response.json()["detail"]

    def test_succeeds_with_mock_predictor(self, monkeypatch):
        monkeypatch.setattr(app_module, "gb_model", MockRULPredictor())
        monkeypatch.setattr(app_module, "_model_type", "mock")
        monkeypatch.setattr(app_module, "preprocessor", None)

        response = client.post("/predict", json=valid_asset_payload())

        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "success"
        assert body["model_type"] == "mock"
        assert isinstance(body["predicted_rul"], float)
        assert body["predicted_rul"] >= 1

    def test_succeeds_with_stub_estimator_and_known_feature_names(self, monkeypatch):
        feature_names = [
            "count(Nama Aset)", "average(down_time)", "sum(Biaya Perbaikan)",
            "maximum(Biaya Perbaikan)", "average(selisih_maintenance)",
            "Merek_Sharp", "Kategori_Mechanical",
        ]
        stub_model = MagicMock()
        stub_model.predict.return_value = np.array([542.0])

        monkeypatch.setattr(app_module, "gb_model", stub_model)
        monkeypatch.setattr(app_module, "_model_type", "pipeline-stub")
        monkeypatch.setattr(app_module, "preprocessor", None)
        monkeypatch.setattr(app_module, "_model_feature_names", feature_names)

        response = client.post("/predict", json=valid_asset_payload(merek="Sharp", kategori="Mechanical"))

        assert response.status_code == 200
        body = response.json()
        assert body["predicted_rul"] == 542.0
        assert body["model_type"] == "pipeline-stub"
        # the DataFrame passed to predict() must be reindexed to exactly these columns
        called_df = stub_model.predict.call_args[0][0]
        assert list(called_df.columns) == feature_names

    def test_returns_422_when_required_field_missing(self):
        payload = valid_asset_payload()
        del payload["merek"]

        response = client.post("/predict", json=payload)

        assert response.status_code == 422

    def test_unknown_categorical_value_still_succeeds_via_zero_filled_ohe(self, monkeypatch):
        feature_names = ["count(Nama Aset)", "Merek_Sharp", "Kategori_Mechanical"]
        stub_model = MagicMock()
        stub_model.predict.return_value = np.array([300.0])

        monkeypatch.setattr(app_module, "gb_model", stub_model)
        monkeypatch.setattr(app_module, "_model_type", "pipeline-stub")
        monkeypatch.setattr(app_module, "preprocessor", None)
        monkeypatch.setattr(app_module, "_model_feature_names", feature_names)

        # "Merek=Daikin" never appears in feature_names -> after reindex/get_dummies
        # all Merek_* columns end up 0; prediction should still succeed (200, not 400)
        response = client.post("/predict", json=valid_asset_payload(merek="Daikin"))

        assert response.status_code == 200
        assert response.json()["predicted_rul"] == 300.0

    def test_estimator_exception_returns_400_with_hint(self, monkeypatch):
        stub_model = MagicMock()
        stub_model.predict.side_effect = ValueError("feature mismatch")

        monkeypatch.setattr(app_module, "gb_model", stub_model)
        monkeypatch.setattr(app_module, "_model_type", "pipeline-stub")
        monkeypatch.setattr(app_module, "preprocessor", None)
        monkeypatch.setattr(app_module, "_model_feature_names", ["count(Nama Aset)"])

        response = client.post("/predict", json=valid_asset_payload())

        assert response.status_code == 400
        detail = response.json()["detail"]
        assert "error" in detail and "hint" in detail and "model_expected_features" in detail
        assert "feature mismatch" in detail["error"]

    def test_uses_preprocessor_transform_path_when_present(self, monkeypatch):
        stub_preprocessor = MagicMock()
        transformed = MagicMock()
        transformed.toarray.return_value = np.zeros((1, 3))
        stub_preprocessor.transform.return_value = transformed

        stub_model = MagicMock()
        stub_model.predict.return_value = np.array([777.0])

        monkeypatch.setattr(app_module, "gb_model", stub_model)
        monkeypatch.setattr(app_module, "_model_type", "tuple")
        monkeypatch.setattr(app_module, "preprocessor", stub_preprocessor)
        monkeypatch.setattr(app_module, "_model_feature_names", ["a", "b", "c"])

        response = client.post("/predict", json=valid_asset_payload())

        assert response.status_code == 200
        assert response.json()["predicted_rul"] == 777.0
        stub_preprocessor.transform.assert_called_once()
        transformed.toarray.assert_called_once()


class TestBuildInputDf:
    def test_produces_expected_raw_columns_before_reindex(self, monkeypatch):
        monkeypatch.setattr(app_module, "_model_feature_names", [])
        data = AssetInput(**valid_asset_payload())

        df = _build_input_df(data)

        # Raw numeric columns should survive get_dummies untouched
        for col in ("count(Nama Aset)", "average(down_time)", "sum(Biaya Perbaikan)",
                    "maximum(Biaya Perbaikan)", "average(selisih_maintenance)"):
            assert col in df.columns

    def test_reindexes_to_model_feature_names_filling_missing_with_zero(self, monkeypatch):
        monkeypatch.setattr(app_module, "_model_feature_names", ["A", "B", "C"])
        data = AssetInput(**valid_asset_payload())

        df = _build_input_df(data)

        assert list(df.columns) == ["A", "B", "C"]
        assert (df.iloc[0] == 0).all()

    def test_empty_mode_severity_defaults_to_normal(self, monkeypatch):
        monkeypatch.setattr(app_module, "_model_feature_names",
                            ["mode(Severity)_normal", "mode(Severity)_high"])
        data = AssetInput(**valid_asset_payload(mode_severity=""))

        df = _build_input_df(data)

        assert df.iloc[0]["mode(Severity)_normal"] == 1
        assert df.iloc[0]["mode(Severity)_high"] == 0
