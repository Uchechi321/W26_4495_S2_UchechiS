"""Tests for column_mapping header cleaning and DataFrame normalization."""

import pytest


def test_clean_header_removes_brackets_and_nbsp():
    pytest.importorskip("numpy")
    pytest.importorskip("pandas")
    from app.utils.column_mapping import _clean_header

    assert _clean_header("Depth (ft)") == "depth_ft"
    assert _clean_header("Well\u00a0ID") == "well_id"


def test_normalize_columns_maps_well_name():
    pytest.importorskip("numpy")
    pd = pytest.importorskip("pandas")
    from app.utils.column_mapping import normalize_columns

    df = pd.DataFrame([{"Well Name": "A", "Depth (ft)": 100}])
    out = normalize_columns(df)
    assert "well_name" in out.columns
    assert "depth_ft" in out.columns


def test_normalize_columns_maps_operation_variants():
    pytest.importorskip("numpy")
    pd = pytest.importorskip("pandas")
    from app.utils.column_mapping import normalize_columns

    df = pd.DataFrame([{"Operation Type": "drilling"}])
    out = normalize_columns(df)
    assert "operation_type" in out.columns
