"""Additional auth_scope tests."""

import pytest
from fastapi import HTTPException
from unittest.mock import MagicMock, patch

from app.auth_scope import assert_report_owned


def test_assert_report_owned_404_when_missing():
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = None
    with pytest.raises(HTTPException) as exc:
        assert_report_owned(db, 999, "user@test.com")
    assert exc.value.status_code == 404


@patch("app.auth_scope.get_well_for_user")
def test_assert_report_owned_returns_report(mock_gw):
    db = MagicMock()
    report = MagicMock()
    report.report_id = 42
    report.well_id = "WELL-01"
    db.query.return_value.filter.return_value.first.return_value = report
    mock_gw.return_value = MagicMock()

    out = assert_report_owned(db, 42, "user@test.com")
    assert out is report
    mock_gw.assert_called_once_with(db, "WELL-01", "user@test.com")
