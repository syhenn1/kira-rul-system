"""Shared fixtures for the kira-ai-engine test suite.

Ground rule for this whole suite: NOTHING here may reach a real Postgres
database, the real HuggingFace Router API, or load a real .joblib model file
from disk. Everything is mocked so the suite runs fully offline and
deterministically — see README note at the bottom of this file.

Note: the summarizer no longer queries Postgres directly — it consumes the
`asset_insights` records from the backend's aggregated dashboard payload (see
`rows_from_dashboard_assets` in summarizer.py), so there is no DB connection to
mock here anymore. `sample_assets`/`make_asset_dict_factory` provide that shape;
`sample_rows`/`make_row_factory` remain for the lower-level `build_prompt` /
`_rule_based_summary` tests that still operate on row-tuples directly.
"""
import os
import sys
from datetime import datetime

import pytest

# Make app.py / summarizer.py importable when pytest is run from the
# kira-ai-engine/ directory (matches how run_dev.py is invoked).
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tests.fixtures.asset_rows import make_row, make_rows, make_asset_dict, make_asset_dicts  # noqa: E402


@pytest.fixture
def sample_rows():
    """A small, varied set of asset-aggregate rows: a mix of critical and
    normal assets, matching the 12-tuple shape `build_prompt` consumes."""
    return make_rows(
        dict(id="a1", name="AC Split Lobby", brand="Sharp", category="Mechanical",
             status="Active", mode_severity="normal", pred_rul=900),
        dict(id="a2", name="Panel Listrik Utama", brand="Schneider", category="Electrical",
             status="Maintenance", mode_severity="high", pred_rul=120),
        dict(id="a3", name="CCTV Lantai 2", brand="Hikvision", category="Security",
             status="Active", mode_severity="normal", pred_rul=2000),
    )


@pytest.fixture
def sample_assets():
    """The `asset_insights`-shaped equivalent of `sample_rows` — what the
    summarizer actually receives over the wire from /api/summarize."""
    return make_asset_dicts(
        dict(id="a1", name="AC Split Lobby", brand="Sharp", category="Mechanical",
             status="Active", mode_severity="normal", pred_rul=900),
        dict(id="a2", name="Panel Listrik Utama", brand="Schneider", category="Electrical",
             status="Maintenance", mode_severity="high", pred_rul=120),
        dict(id="a3", name="CCTV Lantai 2", brand="Hikvision", category="Security",
             status="Active", mode_severity="normal", pred_rul=2000),
    )


@pytest.fixture
def make_row_factory():
    """Expose the make_row factory directly to tests that need bespoke rows."""
    return make_row


@pytest.fixture
def make_asset_dict_factory():
    """Expose the make_asset_dict factory to tests that need bespoke asset_insights records."""
    return make_asset_dict


@pytest.fixture
def mock_hf_token(monkeypatch):
    monkeypatch.setenv("HF_TOKEN", "test-hf-token-123")


# A fixed datetime used across tests that need to assert ISO-8601 conversion.
SAMPLE_RECORDED_AT = datetime(2026, 1, 15, 10, 30, 0)
