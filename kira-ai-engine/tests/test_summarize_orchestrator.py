"""Tests for summarize_company_assets() (summarizer.py:221-263) — the
orchestrator that ties together DB fetch -> prompt build -> multi-model LLM
retry loop -> rule-based fallback.

This is the highest-value NLP test file: it pins down the retry/fallback
behavior across the 4-candidate chain in `_MODEL_CANDIDATES`, which is the
part of the "generate" feature most likely to misbehave under real-world
conditions (timeouts, rate limits, malformed responses).

Mocking strategy: patch `fetch_asset_aggregates` directly (isolating this file
from DB-mocking concerns, which belong to test_fetch_asset_aggregates.py) and
patch `requests.post` with an ordered `side_effect` list (one entry per call),
which gives precise control over the multi-candidate retry sequence.
"""
from unittest.mock import MagicMock

import requests
import pytest

import summarizer
from summarizer import summarize_company_assets, _MODEL_CANDIDATES, _rule_based_summary
from tests.fixtures.asset_rows import make_row

pytestmark = pytest.mark.unit


def _ok_response(content="Ringkasan kondisi aset dari LLM."):
    resp = MagicMock()
    resp.raise_for_status.return_value = None
    resp.json.return_value = {"choices": [{"message": {"content": content}}]}
    return resp


def _http_error_response(status_code=503):
    resp = MagicMock()
    resp.raise_for_status.side_effect = requests.exceptions.HTTPError(f"{status_code} error")
    return resp


def _malformed_json_response():
    resp = MagicMock()
    resp.raise_for_status.return_value = None
    resp.json.return_value = {"unexpected": "shape"}  # missing "choices" -> KeyError
    return resp


@pytest.fixture
def rows(mocker):
    fixture_rows = [make_row(id="a1", pred_rul=100, status="Active", category="Mechanical")]
    mocker.patch("summarizer.fetch_asset_aggregates", return_value=fixture_rows)
    return fixture_rows


class TestPreconditions:
    def test_raises_when_hf_token_missing(self, monkeypatch, mocker):
        monkeypatch.delenv("HF_TOKEN", raising=False)
        mocker.patch("summarizer.fetch_asset_aggregates", return_value=[make_row()])
        with pytest.raises(RuntimeError, match="HF_TOKEN not set"):
            summarize_company_assets("company-1")

    def test_empty_rows_short_circuits_without_calling_llm(self, mock_hf_token, mocker):
        mocker.patch("summarizer.fetch_asset_aggregates", return_value=[])
        post_mock = mocker.patch("summarizer.requests.post")

        result = summarize_company_assets("company-1")

        assert result == {"summary": "Tidak ada data aset untuk diringkas.", "assets": []}
        post_mock.assert_not_called()


class TestRetryAndFallbackChain:
    def test_first_model_succeeds_immediately(self, mock_hf_token, rows, mocker):
        post_mock = mocker.patch("summarizer.requests.post", side_effect=[_ok_response("Hasil model pertama")])

        result = summarize_company_assets("company-1")

        assert result["summary"] == "Hasil model pertama"
        assert post_mock.call_count == 1

    def test_first_fails_second_succeeds_in_correct_order(self, mock_hf_token, rows, mocker):
        post_mock = mocker.patch(
            "summarizer.requests.post",
            side_effect=[requests.exceptions.Timeout("timed out"), _ok_response("Hasil model kedua")],
        )

        result = summarize_company_assets("company-1")

        assert result["summary"] == "Hasil model kedua"
        assert post_mock.call_count == 2
        first_payload = post_mock.call_args_list[0].kwargs["json"]
        second_payload = post_mock.call_args_list[1].kwargs["json"]
        assert first_payload["model"] == _MODEL_CANDIDATES[0][0]
        assert second_payload["model"] == _MODEL_CANDIDATES[1][0]

    def test_three_fail_fourth_succeeds_exercises_full_loop(self, mock_hf_token, rows, mocker):
        post_mock = mocker.patch(
            "summarizer.requests.post",
            side_effect=[
                requests.exceptions.Timeout("t1"),
                _http_error_response(503),
                _malformed_json_response(),
                _ok_response("Hasil model keempat"),
            ],
        )

        result = summarize_company_assets("company-1")

        assert result["summary"] == "Hasil model keempat"
        assert post_mock.call_count == 4

    def test_all_four_fail_returns_rule_based_fallback(self, mock_hf_token, rows, mocker):
        post_mock = mocker.patch(
            "summarizer.requests.post",
            side_effect=[
                requests.exceptions.Timeout("t1"),
                requests.exceptions.Timeout("t2"),
                requests.exceptions.ConnectionError("refused"),
                _http_error_response(429),
            ],
        )

        result = summarize_company_assets("company-1")

        assert post_mock.call_count == 4
        assert result["summary"] == _rule_based_summary(rows)
        assert result["assets"] == [
            {"id": "a1", "name": rows[0][1], "brand": rows[0][2], "category": "Mechanical",
             "status": "Active", "pred_rul": 100}
        ]

    def test_malformed_json_response_is_caught_and_loop_continues(self, mock_hf_token, rows, mocker):
        post_mock = mocker.patch(
            "summarizer.requests.post",
            side_effect=[_malformed_json_response(), _ok_response("Pulih di model kedua")],
        )

        result = summarize_company_assets("company-1")

        assert result["summary"] == "Pulih di model kedua"
        assert post_mock.call_count == 2

    def test_timeout_exception_is_caught_and_loop_continues(self, mock_hf_token, rows, mocker):
        post_mock = mocker.patch(
            "summarizer.requests.post",
            side_effect=[requests.exceptions.Timeout("timed out after 60s"), _ok_response("ok")],
        )
        result = summarize_company_assets("company-1")
        assert result["summary"] == "ok"
        assert post_mock.call_count == 2

    def test_http_error_status_is_caught_and_loop_continues(self, mock_hf_token, rows, mocker):
        post_mock = mocker.patch(
            "summarizer.requests.post",
            side_effect=[_http_error_response(429), _ok_response("ok setelah rate limit")],
        )
        result = summarize_company_assets("company-1")
        assert result["summary"] == "ok setelah rate limit"
        assert post_mock.call_count == 2


class TestRequestPayloadAndHeaders:
    def test_passes_company_id_and_limit_to_fetch(self, mock_hf_token, mocker):
        fetch_mock = mocker.patch("summarizer.fetch_asset_aggregates", return_value=[make_row()])
        mocker.patch("summarizer.requests.post", return_value=_ok_response())

        summarize_company_assets("company-42", limit=7)

        fetch_mock.assert_called_once_with("company-42", 7)

    def test_payload_includes_provider_only_when_candidate_specifies_it(self, mock_hf_token, rows, mocker):
        post_mock = mocker.patch("summarizer.requests.post", side_effect=[_ok_response()])

        summarize_company_assets("company-1")

        payload = post_mock.call_args.kwargs["json"]
        assert payload["model"] == _MODEL_CANDIDATES[0][0]
        assert payload["provider"] == _MODEL_CANDIDATES[0][1] == "novita"

    def test_payload_omits_provider_key_when_candidate_has_none(self, mock_hf_token, rows, mocker):
        post_mock = mocker.patch(
            "summarizer.requests.post",
            side_effect=[
                requests.exceptions.Timeout("t1"),
                requests.exceptions.Timeout("t2"),
                _ok_response("from third candidate"),
            ],
        )

        summarize_company_assets("company-1")

        # _MODEL_CANDIDATES[2] == ("Qwen/Qwen2.5-7B-Instruct", None)
        third_payload = post_mock.call_args_list[2].kwargs["json"]
        assert third_payload["model"] == _MODEL_CANDIDATES[2][0]
        assert "provider" not in third_payload

    def test_strips_whitespace_from_llm_content(self, mock_hf_token, rows, mocker):
        mocker.patch("summarizer.requests.post", side_effect=[_ok_response("  ringkasan dengan spasi  \n")])

        result = summarize_company_assets("company-1")

        assert result["summary"] == "ringkasan dengan spasi"

    def test_authorization_header_uses_hf_token(self, mock_hf_token, rows, mocker):
        post_mock = mocker.patch("summarizer.requests.post", side_effect=[_ok_response()])

        summarize_company_assets("company-1")

        headers = post_mock.call_args.kwargs["headers"]
        assert headers["Authorization"] == "Bearer test-hf-token-123"

    def test_temperature_and_max_tokens_in_payload(self, mock_hf_token, rows, mocker):
        post_mock = mocker.patch("summarizer.requests.post", side_effect=[_ok_response()])

        summarize_company_assets("company-1", temperature=0.9)

        payload = post_mock.call_args.kwargs["json"]
        assert payload["temperature"] == 0.9
        assert payload["max_tokens"] == 300

    def test_request_uses_60_second_timeout(self, mock_hf_token, rows, mocker):
        post_mock = mocker.patch("summarizer.requests.post", side_effect=[_ok_response()])

        summarize_company_assets("company-1")

        assert post_mock.call_args.kwargs["timeout"] == 60
