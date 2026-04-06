"""Unit tests for auth_scope helpers."""

import pytest
from fastapi import HTTPException
from unittest.mock import MagicMock

from app.auth_scope import normalize_email, get_well_for_user


def test_normalize_email_strips_and_lowercases():
    assert normalize_email("  User@Example.COM  ") == "user@example.com"
    assert normalize_email(None) == ""
    assert normalize_email("") == ""


def test_get_well_for_user_not_found():
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = None
    with pytest.raises(HTTPException) as exc:
        get_well_for_user(db, "WELL-X", "user@test.com")
    assert exc.value.status_code == 404


def test_get_well_for_user_wrong_owner():
    db = MagicMock()
    well = MagicMock()
    well.well_id = "WELL-1"
    well.owner_email = "other@test.com"
    db.query.return_value.filter.return_value.first.return_value = well
    with pytest.raises(HTTPException) as exc:
        get_well_for_user(db, "WELL-1", "me@test.com")
    assert exc.value.status_code == 403


def test_get_well_for_user_success():
    db = MagicMock()
    well = MagicMock()
    well.well_id = "WELL-1"
    well.owner_email = "me@test.com"
    db.query.return_value.filter.return_value.first.return_value = well
    out = get_well_for_user(db, "WELL-1", "Me@Test.com")
    assert out is well
