"""Extra tests for daily_operations_flexible helpers."""

from app.parsers import daily_operations_flexible as dof


def test_infer_npt_explicit_cell_including_zero():
    assert dof._infer_npt_hours("0", 0.0, 2.0, "Drilling", "") == 0.0
    assert dof._infer_npt_hours("1.5", 1.5, 2.0, "Drilling", "") == 1.5


def test_infer_npt_from_rig_service_activity():
    n = dof._infer_npt_hours("", None, 0.5, "Rig Service", "adjust brakes")
    assert n == 0.5


def test_infer_npt_empty_cell_uses_activity_hint():
    n = dof._infer_npt_hours("", None, 1.0, "Rig Repairs", "pump work")
    assert n == 1.0


def test_build_one_operation_skips_header_like_row():
    col = dof._assign_columns(["FROM", "TO", "HRS", "ACTIVITY", "DEPTH", "HOURLY COMMENTS"])
    col = dof._ensure_description_column(["FROM", "TO", "HRS", "ACTIVITY", "DEPTH", "HOURLY COMMENTS"], col)
    row = ["FROM", "TO", "HRS", "ACTIVITY", "DEPTH", "HOURLY COMMENTS"]
    assert dof._build_one_operation(row, col) is None


def test_build_one_operation_minimal_row():
    col = dof._assign_columns(["FROM", "TO", "HRS", "ACTIVITY", "DEPTH", "COMMENTS"])
    col = dof._ensure_description_column(["FROM", "TO", "HRS", "ACTIVITY", "DEPTH", "COMMENTS"], col)
    row = ["6:00", "8:00", "2.0", "Drilling", "6148", "Drilled ahead."]
    op = dof._build_one_operation(row, col)
    assert op is not None
    assert op["operation_type"] == "Drilling"
    assert "Drilled" in op["description"]
