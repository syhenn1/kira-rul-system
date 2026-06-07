"""Unit tests for ExplicitNLPPipeline (summarizer.py:67-108) — the four
explicit NLP stages: normalize, tokenize, remove_stopwords, extract_features.

These are pure functions with no I/O — they should run in milliseconds.
"""
import pytest

from summarizer import ExplicitNLPPipeline

pytestmark = pytest.mark.unit


@pytest.fixture
def pipeline():
    return ExplicitNLPPipeline()


class TestNormalize:
    def test_lowercases_text(self, pipeline):
        assert pipeline.normalize("AC SPLIT Sharp") == "ac split sharp"

    def test_strips_punctuation_to_spaces(self, pipeline):
        result = pipeline.normalize("AC-Split, Tipe: Sharp!")
        import re
        assert re.search(r"[^\w\s]", result) is None

    def test_empty_string_returns_empty_string(self, pipeline):
        assert pipeline.normalize("") == ""

    def test_preserves_word_characters_after_lowercasing(self, pipeline):
        assert pipeline.normalize("Mekanikal AC") == "mekanikal ac"


class TestTokenize:
    def test_splits_on_whitespace(self, pipeline):
        assert pipeline.tokenize("ac split unit") == ["ac", "split", "unit"]

    def test_empty_string_returns_empty_list(self, pipeline):
        assert pipeline.tokenize("") == []

    def test_collapses_multiple_spaces(self, pipeline):
        assert pipeline.tokenize("ac   split") == ["ac", "split"]


class TestRemoveStopwords:
    def test_filters_known_indonesian_stopwords(self, pipeline):
        tokens = ["unit", "dan", "yang", "di", "untuk", "perawatan"]
        assert pipeline.remove_stopwords(tokens) == ["unit", "perawatan"]

    def test_filters_single_character_tokens(self, pipeline):
        tokens = ["a", "x", "ac", "split"]
        assert pipeline.remove_stopwords(tokens) == ["ac", "split"]

    def test_keeps_non_stopword_domain_terms(self, pipeline):
        tokens = ["mekanikal", "kritis", "perawatan"]
        assert pipeline.remove_stopwords(tokens) == tokens

    def test_all_stopwords_returns_empty_list(self, pipeline):
        tokens = ["dan", "atau", "yang", "di"]
        assert pipeline.remove_stopwords(tokens) == []

    def test_filters_domain_specific_stopwords_tipe_aset_kategori(self, pipeline):
        # These three appear constantly in raw_text_for_nlp (built from
        # "name brand category status mode_sev"), so they are explicitly
        # added to the stopword set at summarizer.py:77.
        tokens = ["tipe", "aset", "kategori", "mekanikal"]
        assert pipeline.remove_stopwords(tokens) == ["mekanikal"]

    def test_stopword_set_has_exactly_eighteen_entries(self, pipeline):
        assert len(pipeline.stopwords) == 18


class TestExtractFeatures:
    def test_returns_top_n_by_frequency(self, pipeline):
        tokens = ["ac", "ac", "split", "split", "split", "unit"]
        assert pipeline.extract_features(tokens, top_n=2) == {"split": 3, "ac": 2}

    def test_default_top_n_is_five(self, pipeline):
        tokens = ["a", "b", "c", "d", "e", "f", "g"]
        assert len(pipeline.extract_features(tokens)) == 5

    def test_fewer_unique_tokens_than_top_n_returns_all(self, pipeline):
        tokens = ["ac", "ac", "split"]
        result = pipeline.extract_features(tokens, top_n=5)
        assert result == {"ac": 2, "split": 1}

    def test_empty_token_list_returns_empty_dict(self, pipeline):
        assert pipeline.extract_features([]) == {}


class TestProcessFullPipeline:
    def test_punctuation_heavy_mixed_case_input(self, pipeline):
        result = pipeline.process("AC-Split, Sharp! Mechanical: Critical-status.")
        assert isinstance(result, dict)
        assert all(isinstance(v, int) for v in result.values())

    def test_only_stopwords_input_returns_empty_features(self, pipeline):
        result = pipeline.process("dan atau yang di ke dari tipe aset kategori")
        assert result == {}

    def test_empty_string_returns_empty_dict(self, pipeline):
        assert pipeline.process("") == {}

    def test_case_variants_of_same_word_are_merged_after_normalization(self, pipeline):
        result = pipeline.process("AC ac Ac split")
        assert result["ac"] == 3
