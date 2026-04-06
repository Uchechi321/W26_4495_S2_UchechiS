"""Tests for transform.clean_header (Excel pipeline)."""

import pytest


def test_clean_header_lowercase_underscores():
    pytest.importorskip("numpy")
    pytest.importorskip("pandas")
    from app.utils.transform import clean_header

    assert clean_header("  Depth (ft)  ") == "depth_ft"
    assert clean_header("Event Type!") == "event_type"


def test_clean_header_nbsp():
    pytest.importorskip("numpy")
    pytest.importorskip("pandas")
    from app.utils.transform import clean_header

    assert clean_header("col\u00a0name") == "col_name"
