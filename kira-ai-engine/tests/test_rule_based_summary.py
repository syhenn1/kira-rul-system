"""Tests for _rule_based_summary() (summarizer.py:192-209) — the deterministic
fallback used when all LLM candidates fail.

Threshold here is `r[10] < 365` — note this is a DIFFERENT number than the
`< 730` threshold used by build_prompt()'s bucketing (summarizer.py:145).
That is a pre-existing inconsistency between the two functions; tests below
pin current behavior and flag it with a NOTE rather than "fixing" it.
"""
import pytest

from summarizer import _rule_based_summary
from tests.fixtures.asset_rows import make_row

pytestmark = pytest.mark.unit


class TestNoCriticalAssets:
    def test_all_assets_above_threshold_returns_positive_message(self):
        rows = [make_row(id="a", pred_rul=400), make_row(id="b", pred_rul=900)]
        msg = _rule_based_summary(rows)
        assert "terpantau baik" in msg
        assert "2 aset" in msg

    def test_rul_exactly_365_is_excluded_from_critical_count(self):
        # `r[10] < 365` is a strict less-than — 365 itself does NOT count.
        rows = [make_row(id="a", pred_rul=365), make_row(id="b", pred_rul=900)]
        msg = _rule_based_summary(rows)
        assert "terpantau baik" in msg  # no critical assets => positive branch

    def test_rul_none_rows_never_counted_as_critical(self):
        rows = [make_row(id="a", pred_rul=None), make_row(id="b", pred_rul=900)]
        msg = _rule_based_summary(rows)
        assert "terpantau baik" in msg


class TestWithCriticalAssets:
    def test_rul_364_is_counted_as_critical(self):
        rows = [make_row(id="a", pred_rul=364, category="Mechanical"),
                make_row(id="b", pred_rul=900, category="Electrical")]
        msg = _rule_based_summary(rows)
        assert "terpantau baik" not in msg
        assert "1 unit aset" in msg
        assert "di bawah 365 hari" in msg
        assert "Mechanical" in msg
        # 1 critical out of 2 total => 1 normal
        assert "Dari total 2 aset" in msg
        assert "1 unit lainnya" in msg

    def test_message_mentions_critical_count_and_normal_count(self):
        rows = [
            make_row(id="a", pred_rul=10, category="Mechanical"),
            make_row(id="b", pred_rul=50, category="Mechanical"),
            make_row(id="c", pred_rul=900, category="Electrical"),
        ]
        msg = _rule_based_summary(rows)
        assert "Terdapat 2 unit aset" in msg
        assert "Dari total 3 aset" in msg
        assert "1 unit lainnya" in msg

    def test_single_distinct_category_joins_without_dan(self):
        rows = [
            make_row(id="a", pred_rul=10, category="Mechanical"),
            make_row(id="b", pred_rul=50, category="Mechanical"),
        ]
        msg = _rule_based_summary(rows)
        assert "Mechanical" in msg
        # Only one distinct category among critical rows => cat_str has no " dan " separator
        assert " dan " not in msg

    def test_two_distinct_categories_joined_with_dan(self):
        rows = [
            make_row(id="a", pred_rul=10, category="Mechanical"),
            make_row(id="b", pred_rul=50, category="Electrical"),
        ]
        msg = _rule_based_summary(rows)
        # NOTE: `categories = list({r[3] for r in kritis})` builds from a
        # Python set — iteration order is NOT guaranteed across runs/
        # interpreters. Assert membership/either-order rather than exact text.
        assert ("Mechanical dan Electrical" in msg) or ("Electrical dan Mechanical" in msg)

    def test_more_than_two_categories_truncates_to_first_two(self):
        rows = [
            make_row(id="a", pred_rul=10, category="Mechanical"),
            make_row(id="b", pred_rul=20, category="Electrical"),
            make_row(id="c", pred_rul=30, category="Security"),
        ]
        msg = _rule_based_summary(rows)
        # categories[:2] => exactly 2 of the 3 distinct names appear, joined by " dan "
        assert msg.count(" dan ") == 1
        present = sum(1 for cat in ("Mechanical", "Electrical", "Security") if cat in msg)
        assert present == 2


class TestEmptyInput:
    def test_zero_rows_returns_positive_message_with_zero_total(self):
        msg = _rule_based_summary([])
        assert "terpantau baik" in msg
        assert "0 aset" in msg
