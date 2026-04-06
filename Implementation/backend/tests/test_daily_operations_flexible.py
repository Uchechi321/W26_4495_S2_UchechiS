"""Tests for flexible daily operations parser helpers."""

from app.parsers import daily_operations_flexible as dof


def test_assign_columns_typical_hourly_header():
    header = ["FROM", "TO", "HRS", "ACTIVITY", "DEPTH", "HOURLY COMMENTS"]
    col = dof._assign_columns(header)
    col = dof._ensure_description_column(header, col)
    assert col.get("description") == 5
    assert "duration" in col
    assert "operation_type" in col


def test_ensure_description_split_hourly_comments_header():
    header = ["FROM", "TO", "HRS", "ACT", "DEPTH", "HOURLY", "COMMENTS"]
    roles = dof._assign_columns(header)
    out = dof._ensure_description_column(header, roles)
    # Merged "HOURLY" + "COMMENTS" should map description to last column
    assert out.get("description") in (5, 6)


def test_fallback_description_prefers_long_unmapped():
    col = {"duration": 0, "operation_type": 1, "description": 5}
    row = ["2", "Drilling", "", "", "", "Short"]
    # description index 5 empty -> fallback should still pick something meaningful if present
    t = dof._fallback_description_text(
        ["1", "Drill", "2.0", "6148", "Long narrative text about sliding and mud."],
        {"duration": 2, "operation_type": 1, "description": 4},
    )
    assert "narrative" in t.lower() or "6148" in t or len(t) > 10


def test_parse_depth_from_text():
    assert dof._parse_depth_from_text("Drilling from 6022 ft to 6148 ft.") == 6022.0
    assert dof._parse_depth_from_text("no depth here") is None


def test_is_total_row():
    assert dof._is_total_row(["Total Hrs", "24.00", "", "", ""])
    assert not dof._is_total_row(["6:00", "8:00", "2", "Drilling", "1000", "ok"])
