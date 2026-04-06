"""Tests for insert_operations_events and related ingestion helpers."""

import pytest
from unittest.mock import MagicMock

from app.services.ingestion_service import insert_operations_events, ensure_well_exists


def test_insert_operations_events_inserts_and_counts():
    db = MagicMock()
    parsed = {
        "operations": [
            {
                "depth_from": 100.0,
                "depth_to": 200.0,
                "operation_type": "Drilling",
                "description": "Slide",
                "duration_hours": 2.0,
                "npt_hours": 0.5,
            },
            {
                "depth_from": None,
                "depth_to": 300.0,
                "operation_type": "Trip",
                "description": "",
                "duration_hours": 1.0,
                "npt_hours": None,
            },
        ],
        "events": [],
    }
    oi, ei = insert_operations_events(db, report_id=7, well_id="W-1", parsed=parsed)
    assert oi == 2
    assert ei == 0
    assert db.add.call_count == 2
    db.commit.assert_called()


def test_insert_operations_events_empty():
    db = MagicMock()
    oi, ei = insert_operations_events(db, 1, "W", {"operations": [], "events": []})
    assert oi == 0
    assert ei == 0


def test_ensure_well_exists_raises():
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = None
    with pytest.raises(ValueError) as exc:
        ensure_well_exists(db, "MISSING")
    assert "MISSING" in str(exc.value)


def test_ensure_well_exists_returns_well():
    db = MagicMock()
    well = MagicMock()
    well.well_id = "W1"
    db.query.return_value.filter.return_value.first.return_value = well
    assert ensure_well_exists(db, "W1") is well
