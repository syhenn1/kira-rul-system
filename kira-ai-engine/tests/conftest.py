"""Shared fixtures for the kira-ai-engine test suite.

Ground rule for this whole suite: NOTHING here may reach a real Postgres
database, the real HuggingFace Router API, or load a real .joblib model file
from disk. Everything is mocked so the suite runs fully offline and
deterministically — see README note at the bottom of this file.
"""
import os
import sys
from datetime import datetime

import pytest

# Make app.py / summarizer.py importable when pytest is run from the
# kira-ai-engine/ directory (matches how run_dev.py is invoked).
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tests.fixtures.asset_rows import make_row, make_rows  # noqa: E402


@pytest.fixture
def sample_rows():
    """A small, varied set of asset-aggregate rows: a mix of critical and
    normal assets, matching the 12-tuple shape of fetch_asset_aggregates."""
    return make_rows(
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
def mock_hf_token(monkeypatch):
    monkeypatch.setenv("HF_TOKEN", "test-hf-token-123")


@pytest.fixture
def mock_database_url(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pass@localhost:5432/testdb")


@pytest.fixture
def mock_db_connection(mocker):
    """Patch psycopg2.connect (as imported in summarizer.py) to return a
    MagicMock chain whose cursor().fetchall() can be configured per-test via
    `conn.cursor.return_value.fetchall.return_value = [...]`."""
    mock_conn = mocker.MagicMock()
    mock_cursor = mocker.MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    mock_cursor.fetchall.return_value = []
    mocker.patch("summarizer.psycopg2.connect", return_value=mock_conn)
    return mock_conn


# A fixed datetime used across tests that need to assert ISO-8601 conversion.
SAMPLE_RECORDED_AT = datetime(2026, 1, 15, 10, 30, 0)
