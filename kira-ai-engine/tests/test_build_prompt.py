"""Tests for build_prompt() (summarizer.py:110-189) — pins down the exact
"is_kritis" bucketing logic (line 145) and the resulting prompt structure.

    is_kritis = (
        (pred_rul is not None and pred_rul < 730)
        or (str(status).lower() in ['scrap', 'maintenance'])
        or (str(mode_severity).lower() in ['critical', 'high'])
    )

This is the single highest-value file for pinning down boundary values that
are easy to get subtly wrong (strict "<" vs "<=", case sensitivity, None
handling, independent OR clauses).
"""
from datetime import datetime

import pytest

from summarizer import build_prompt
from tests.fixtures.asset_rows import make_row

pytestmark = pytest.mark.unit


def _is_critical(rows, target_id):
    """Helper: returns True if the row with the given id ended up in the
    [PRIORITAS TINGGI — ...] block of the rendered prompt.

    NOTE: the instruction text earlier in the same message also mentions the
    bare phrase "[PRIORITAS TINGGI]" (no em-dash/suffix), so we must split on
    the full section-header text (with " — ") to land on the actual data
    block rather than that unrelated instructional mention.
    """
    messages, _ = build_prompt(rows)
    content = messages[1]["content"]
    prioritas_section = content.split("[PRIORITAS TINGGI — ")[1].split("[KONDISI NORMAL — ")[0]
    target_row = next(r for r in rows if r[0] == target_id)
    return target_row[1] in prioritas_section  # asset name appears in its block


class TestRulBoundary:
    """The bucketing condition is strictly `pred_rul < 730` — NOT `<= 730`."""

    def test_rul_exactly_730_is_normal_bucket_not_critical(self):
        row = make_row(id="x", pred_rul=730, status="Active", mode_severity="normal")
        assert _is_critical([row], "x") is False

    def test_rul_729_is_critical_bucket(self):
        row = make_row(id="x", pred_rul=729, status="Active", mode_severity="normal")
        assert _is_critical([row], "x") is True

    def test_rul_731_with_benign_status_and_severity_is_normal(self):
        row = make_row(id="x", pred_rul=731, status="Active", mode_severity="normal")
        assert _is_critical([row], "x") is False

    def test_rul_none_with_benign_status_and_severity_is_normal_bucket(self):
        # `pred_rul is not None and pred_rul < 730` short-circuits to False on None
        row = make_row(id="x", pred_rul=None, status="Active", mode_severity="normal")
        assert _is_critical([row], "x") is False

    def test_rul_none_with_scrap_status_is_still_critical_via_or_clause(self):
        # Proves the three OR clauses are evaluated independently
        row = make_row(id="x", pred_rul=None, status="Scrap", mode_severity="normal")
        assert _is_critical([row], "x") is True


class TestStatusMatching:
    """`str(status).lower() in ['scrap', 'maintenance']` — case-insensitive."""

    def test_status_scrap_uppercase_is_critical(self):
        row = make_row(id="x", pred_rul=2000, status="SCRAP", mode_severity="normal")
        assert _is_critical([row], "x") is True

    def test_status_maintenance_mixed_case_is_critical(self):
        row = make_row(id="x", pred_rul=2000, status="Maintenance", mode_severity="normal")
        assert _is_critical([row], "x") is True

    def test_status_active_alone_is_not_critical(self):
        row = make_row(id="x", pred_rul=2000, status="Active", mode_severity="normal")
        assert _is_critical([row], "x") is False

    def test_status_none_does_not_raise(self):
        row = make_row(id="x", pred_rul=2000, status=None, mode_severity="normal")
        # str(None).lower() == "none" — does not match scrap/maintenance
        assert _is_critical([row], "x") is False


class TestSeverityMatching:
    """`str(mode_severity).lower() in ['critical', 'high']` — case-insensitive.

    NOTE: this list ('critical'/'high') is a *different* vocabulary than the
    `tingkat_kekritisan` enum used by /predict ('Critical'|'Major'|'Minor') —
    a pre-existing terminology mismatch in the codebase. These tests pin the
    *current* behavior; they do not silently "fix" it.
    """

    def test_severity_critical_lowercase_triggers_priority(self):
        row = make_row(id="x", pred_rul=2000, status="Active", mode_severity="critical")
        assert _is_critical([row], "x") is True

    def test_severity_high_uppercase_triggers_priority(self):
        row = make_row(id="x", pred_rul=2000, status="Active", mode_severity="HIGH")
        assert _is_critical([row], "x") is True

    def test_severity_major_does_not_trigger(self):
        # 'Major' is part of the AssetInput.tingkat_kekritisan enum but is
        # NOT in summarizer.py's ['critical', 'high'] list.
        row = make_row(id="x", pred_rul=2000, status="Active", mode_severity="Major")
        assert _is_critical([row], "x") is False

    def test_severity_none_does_not_raise(self):
        row = make_row(id="x", pred_rul=2000, status="Active", mode_severity=None)
        assert _is_critical([row], "x") is False


class TestBucketAssembly:
    def test_mixed_rows_split_correctly_between_buckets(self):
        rows = [
            make_row(id="c1", name="Panel A", pred_rul=100, status="Active", mode_severity="normal"),
            make_row(id="c2", name="Panel B", pred_rul=2000, status="Scrap", mode_severity="normal"),
            make_row(id="n1", name="AC A", pred_rul=1000, status="Active", mode_severity="normal"),
            make_row(id="n2", name="AC B", pred_rul=900, status="Active", mode_severity="low"),
            make_row(id="n3", name="CCTV A", pred_rul=800, status="Active", mode_severity="normal"),
        ]
        messages, _ = build_prompt(rows)
        content = messages[1]["content"]
        prioritas = content.split("[PRIORITAS TINGGI — ")[1].split("[KONDISI NORMAL — ")[0]
        normal = content.split("[KONDISI NORMAL — ")[1]

        assert "Panel A" in prioritas and "Panel B" in prioritas
        assert "AC A" in normal and "AC B" in normal and "CCTV A" in normal
        assert "Panel A" not in normal and "Panel B" not in normal
        assert "AC A" not in prioritas

    def test_all_critical_shows_normal_placeholder_text(self):
        rows = [make_row(id="x", pred_rul=10, status="Scrap")]
        messages, _ = build_prompt(rows)
        assert "Tidak ada aset normal saat ini." in messages[1]["content"]

    def test_all_normal_shows_critical_placeholder_text(self):
        rows = [make_row(id="x", pred_rul=2000, status="Active", mode_severity="normal")]
        messages, _ = build_prompt(rows)
        assert "Tidak ada aset kritis saat ini." in messages[1]["content"]

    def test_empty_rows_list(self):
        messages, extracted_assets = build_prompt([])
        content = messages[1]["content"]
        assert "Tidak ada aset normal saat ini." in content
        assert "Tidak ada aset kritis saat ini." in content
        assert extracted_assets == []
        assert "[Top Keywords dari data aset]: \n" in content


class TestExtractedAssetsShape:
    def test_contains_exactly_expected_keys(self):
        rows = [make_row(id="x")]
        _, extracted_assets = build_prompt(rows)
        assert len(extracted_assets) == 1
        assert set(extracted_assets[0].keys()) == {"id", "name", "brand", "category", "status", "pred_rul"}

    def test_recorded_at_datetime_is_converted_to_isoformat_in_block_text(self):
        recorded = datetime(2026, 3, 1, 9, 30, 0)
        row = make_row(id="x", recorded_at=recorded)
        messages, _ = build_prompt([row])
        assert recorded.isoformat() in messages[1]["content"]

    def test_recorded_at_non_datetime_passes_through_unchanged(self):
        row = make_row(id="x", recorded_at="2026-03-01")
        messages, _ = build_prompt([row])  # should not raise
        assert "2026-03-01" in messages[1]["content"]


class TestPromptStructure:
    def test_returns_two_messages_system_and_user(self):
        messages, _ = build_prompt([make_row()])
        assert [m["role"] for m in messages] == ["system", "user"]

    def test_system_message_describes_indonesian_asset_manager_persona(self):
        messages, _ = build_prompt([make_row()])
        assert "manajer aset" in messages[0]["content"].lower()
        assert "bahasa indonesia" in messages[0]["content"].lower()

    def test_user_message_documents_all_four_threshold_tiers(self):
        messages, _ = build_prompt([make_row()])
        content = messages[1]["content"]
        assert "CRITICAL: RUL ≤ 180" in content
        assert "HIGH: RUL ≤ 365" in content
        assert "WATCH: RUL ≤ 730" in content
        assert "OK: RUL > 730" in content

    def test_keywords_section_present_with_expected_format(self):
        rows = [make_row(id="x", name="AC Split Lobby", brand="Sharp",
                         category="Mechanical", status="Active", mode_severity="normal")]
        messages, _ = build_prompt(rows)
        content = messages[1]["content"]
        assert "[Top Keywords dari data aset]:" in content
        import re
        assert re.search(r"'\w+' \(muncul \d+x\)", content)


# NOTE (pre-existing semantic inconsistency, intentionally NOT "fixed" here):
# `is_kritis` collapses the three documented tiers (CRITICAL<=180, HIGH<=365,
# WATCH<=730) into a single `prioritas_tinggi` bucket using one `< 730` test,
# while the prompt instruction text built by this same function tells the LLM
# there are four distinct tiers. The tests above pin *current* behavior; the
# discrepancy is left for the team to decide whether to reconcile.
