"""Tests for fetch_asset_aggregates() (summarizer.py:15-61) — the raw psycopg2
query that feeds the NLP summarization pipeline.

Postgres is fully mocked via `summarizer.psycopg2.connect` — no real DB
connection is ever made.
"""
import pytest

import summarizer
from summarizer import fetch_asset_aggregates

pytestmark = pytest.mark.unit


def test_raises_runtime_error_when_database_url_missing(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    with pytest.raises(RuntimeError, match="DATABASE_URL not set"):
        fetch_asset_aggregates("company-1")


def test_strips_surrounding_quotes_from_database_url(monkeypatch, mocker):
    monkeypatch.setenv("DATABASE_URL", '"postgresql://user:pass@dbhost:5432/mydb"')
    mock_connect = mocker.patch("summarizer.psycopg2.connect")
    mock_connect.return_value.cursor.return_value.fetchall.return_value = []

    fetch_asset_aggregates("company-1")

    _, kwargs = mock_connect.call_args
    assert kwargs["host"] == "dbhost"
    assert kwargs["dbname"] == "mydb"


def test_parses_url_components_and_passes_to_connect(monkeypatch, mocker):
    monkeypatch.setenv("DATABASE_URL", "postgresql://myuser:mypass@myhost:5433/mydb")
    mock_connect = mocker.patch("summarizer.psycopg2.connect")
    mock_connect.return_value.cursor.return_value.fetchall.return_value = []

    fetch_asset_aggregates("company-1")

    mock_connect.assert_called_once_with(
        dbname="mydb", user="myuser", password="mypass", host="myhost", port=5433
    )


def test_executes_query_with_company_id_and_limit_params(mock_database_url, mock_db_connection):
    fetch_asset_aggregates("company-xyz", limit=42)

    cursor = mock_db_connection.cursor.return_value
    args, _ = cursor.execute.call_args
    sql, params = args
    assert params == ("company-xyz", 42)
    assert "FROM" in sql and "asset_prediction_history" in sql


def test_returns_fetchall_result_unchanged(mock_database_url, mock_db_connection):
    fixture_rows = [("row1",), ("row2",)]
    mock_db_connection.cursor.return_value.fetchall.return_value = fixture_rows

    result = fetch_asset_aggregates("company-1")

    assert result == fixture_rows


def test_closes_cursor_and_connection(mock_database_url, mock_db_connection):
    fetch_asset_aggregates("company-1")

    cursor = mock_db_connection.cursor.return_value
    cursor.close.assert_called_once()
    mock_db_connection.close.assert_called_once()


def test_default_limit_is_twenty(mock_database_url, mock_db_connection):
    fetch_asset_aggregates("company-1")

    cursor = mock_db_connection.cursor.return_value
    _, params = cursor.execute.call_args[0]
    assert params == ("company-1", 20)
