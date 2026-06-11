"""Tests for the remaining FastAPI endpoints in app.py via TestClient:
GET /, GET /model-info, GET /training-status, POST /retrain, POST /summarize.

Same TestClient note as test_predict_endpoint.py: instantiated WITHOUT the
`with` context-manager form so `@app.on_event("startup")` (which loads real
.joblib files) never fires — globals stay at their pristine module-level
defaults and each test fully controls them via monkeypatch.
"""
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

import app as app_module
from app import app

pytestmark = pytest.mark.integration

client = TestClient(app)


class TestRootAndDiagnostics:
    def test_root_returns_status_info(self, monkeypatch):
        monkeypatch.setattr(app_module, "_model_type", "mock")
        monkeypatch.setattr(app_module, "_model_feature_names", ["a", "b"])

        response = client.get("/")

        assert response.status_code == 200
        body = response.json()
        assert body == {"message": "Kira AI Engine is running.", "model_type": "mock", "feature_count": 2}

    def test_model_info_returns_diagnostics(self, monkeypatch):
        stub_model = MagicMock(name="StubModel")
        monkeypatch.setattr(app_module, "gb_model", stub_model)
        monkeypatch.setattr(app_module, "preprocessor", None)
        monkeypatch.setattr(app_module, "_model_type", "pipeline-stub")
        monkeypatch.setattr(app_module, "_model_feature_names", ["x", "y", "z"])

        response = client.get("/model-info")

        assert response.status_code == 200
        body = response.json()
        assert body["model_type"] == "pipeline-stub"
        assert body["expected_feature_count"] == 3
        assert body["expected_features"] == ["x", "y", "z"]
        assert "sklearn_version" in body and "pandas_version" in body and "numpy_version" in body

    def test_training_status_returns_structure(self, monkeypatch):
        monkeypatch.setattr(app_module, "_scheduler", None)

        response = client.get("/training-status")

        assert response.status_code == 200
        body = response.json()
        for key in ("status", "active_model_type", "active_feature_count",
                    "trainer_available", "scheduler_running", "next_scheduled_run"):
            assert key in body


class TestRetrainEndpoint:
    def test_returns_503_when_trainer_unavailable(self, monkeypatch):
        monkeypatch.setattr(app_module, "_trainer_available", False)
        monkeypatch.setitem(app_module._training_state, "status", "idle")

        response = client.post("/retrain")

        assert response.status_code == 503
        assert "Trainer module tidak tersedia" in response.json()["detail"]

    def test_returns_409_when_already_running(self, monkeypatch):
        monkeypatch.setattr(app_module, "_trainer_available", True)
        monkeypatch.setitem(app_module._training_state, "status", "running")

        response = client.post("/retrain")

        assert response.status_code == 409
        assert "Retraining sedang berjalan" in response.json()["detail"]


class TestSummarizeEndpoint:
    def test_success_passes_through_summary_assets_and_critical_count(self, monkeypatch):
        fake_summary = {
            "summary": "Ringkasan kondisi aset terkini.",
            "assets": [{"id": "a1", "pred_rul": 100}],
            "critical_count": 3,
        }
        monkeypatch.setattr(app_module, "summarize_company_assets",
                            lambda *args, **kwargs: fake_summary)

        response = client.post("/summarize", json={
            "company_id": "company-1",
            "assets": [{"id": "a1", "name": "AC Split Lobby", "predicted_rul": 100}],
            "critical_count": 3,
            "limit": 5,
        })

        assert response.status_code == 200
        body = response.json()
        assert body == {
            "company_id": "company-1",
            "summary": fake_summary["summary"],
            "assets": fake_summary["assets"],
            "critical_count": fake_summary["critical_count"],
        }

    def test_forwards_dashboard_assets_critical_count_limit_and_temperature_as_kwargs(self, monkeypatch):
        captured = {}

        def fake_summarize(assets, **kwargs):
            captured["assets"] = assets
            captured.update(kwargs)
            return {"summary": "ok", "assets": [], "critical_count": 0}

        monkeypatch.setattr(app_module, "summarize_company_assets", fake_summarize)

        dashboard_assets = [{"id": "a1", "name": "AC Split Lobby", "predicted_rul": 120}]
        response = client.post("/summarize", json={
            "company_id": "company-1",
            "assets": dashboard_assets,
            "critical_count": 2,
            "limit": 7,
            "temperature": 0.5,
        })

        assert response.status_code == 200
        assert captured["assets"] == dashboard_assets
        assert captured["critical_count"] == 2
        assert captured["limit"] == 7
        assert captured["temperature"] == 0.5

    def test_defaults_assets_to_empty_list_and_critical_count_to_zero_when_omitted(self, monkeypatch):
        captured = {}

        def fake_summarize(assets, **kwargs):
            captured["assets"] = assets
            captured.update(kwargs)
            return {"summary": "ok", "assets": [], "critical_count": 0}

        monkeypatch.setattr(app_module, "summarize_company_assets", fake_summarize)

        response = client.post("/summarize", json={})

        assert response.status_code == 200
        assert captured["assets"] == []
        assert captured["critical_count"] == 0
        assert captured["limit"] == 10  # SummarizeRequest default
        assert captured["temperature"] == 0.2

    def test_returns_500_on_summarizer_exception(self, monkeypatch):
        def raising_summarize(**kwargs):
            raise RuntimeError("HF_TOKEN not set in environment")

        monkeypatch.setattr(app_module, "summarize_company_assets", raising_summarize)

        response = client.post("/summarize", json={"company_id": "company-1"})

        assert response.status_code == 500
        assert "Summarization error" in response.json()["detail"]

    def test_returns_500_when_summarizer_module_unavailable(self, monkeypatch):
        monkeypatch.setattr(app_module, "summarize_company_assets", None)

        response = client.post("/summarize", json={"company_id": "company-1"})

        assert response.status_code == 500
        assert "Summarizer module tidak tersedia" in response.json()["detail"]
