"""Rule-based segment classification (no LLM)."""

from app.services.ai_engine import _rule_based_segment_level, classify_segment_level


def test_rule_based_critical_high_npt():
    assert _rule_based_segment_level({"nptHours": 3, "whyItMatters": ""}) == "critical"


def test_rule_based_critical_stuck_in_description():
    assert (
        _rule_based_segment_level({"nptHours": 0, "whyItMatters": "STUCK PIPE while drilling"})
        == "critical"
    )


def test_rule_based_warning_small_npt():
    assert _rule_based_segment_level({"nptHours": 0.5, "whyItMatters": "minor"}) == "warning"


def test_rule_based_warning_lost_circulation():
    assert (
        _rule_based_segment_level({"nptHours": 0, "whyItMatters": "LOST CIRCULATION observed"})
        == "warning"
    )


def test_rule_based_normal():
    assert _rule_based_segment_level({"nptHours": 0, "whyItMatters": "Routine drilling"}) == "normal"


def test_classify_segment_level_falls_back_to_rules(monkeypatch):
    monkeypatch.setattr(
        "app.services.ai_engine._try_llm_segment_level",
        lambda _segment: None,
    )
    assert classify_segment_level({"nptHours": 2.5, "whyItMatters": ""}) == "critical"
