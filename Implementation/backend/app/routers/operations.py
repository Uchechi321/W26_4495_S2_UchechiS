from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date
import logging

from ..database import SessionLocal
from ..models.operation import Operation

# DailyReport is optional (only used for date filtering & recordedAt)
try:
    from ..models.daily_report import DailyReport
except Exception:
    DailyReport = None

router = APIRouter(prefix="/wells", tags=["Operations"])

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _level_from_op(op: Operation) -> str:
    """
    Simple rules (prototype analytics):
    - critical if description contains strong keywords or npt_hours exists and is high
    - warning if long duration
    - else normal
    """
    desc = (getattr(op, "description", "") or "").upper()
    dur = getattr(op, "duration_hours", None)
    npt = getattr(op, "npt_hours", None)

    if npt is not None and npt >= 2:
        return "critical"
    if "NPT" in desc or "NO SUCCESS" in desc or "STUCK" in desc:
        return "critical"
    if dur is not None and dur >= 4:
        return "warning"
    return "normal"


@router.get("/{well_id}/operations")
def get_operations_for_well(
    well_id: str,
    start: date | None = Query(default=None, description="YYYY-MM-DD"),
    end: date | None = Query(default=None, description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    """
    Returns operations for a well.
    If DailyReport exists, you can filter by report_date using start/end.
    """
    # Base query
    q = db.query(Operation).filter(Operation.well_id == well_id)

    # Optional date filter (only works if DailyReport model exists)
    if (start or end) and DailyReport is not None:
        q = q.join(DailyReport, DailyReport.report_id == Operation.report_id)
        if start:
            q = q.filter(DailyReport.report_date >= start)
        if end:
            q = q.filter(DailyReport.report_date <= end)

    ops = q.order_by(Operation.operation_id.asc()).all()

    # Return as simple JSON dicts (no schema needed)
    results = []
    for op in ops:
        results.append({
            "operation_id": op.operation_id,
            "report_id": getattr(op, "report_id", None),
            "well_id": op.well_id,
            "depth_from": getattr(op, "depth_from", None),
            "depth_to": getattr(op, "depth_to", None),
            "operation_type": getattr(op, "operation_type", None),
            "description": getattr(op, "description", None),
            "duration_hours": getattr(op, "duration_hours", None),
            "npt_hours": getattr(op, "npt_hours", None),
        })

    return results


@router.get("/{well_id}/segments")
def get_segments_for_well(
    well_id: str,
    start: date | None = Query(default=None, description="YYYY-MM-DD"),
    end: date | None = Query(default=None, description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    """
    Converts operations into frontend-friendly segments for the Wellbore view.
    """
    # If DailyReport exists, we’ll join it to add recordedAt and allow date filtering.
    if DailyReport is not None:
        q = (
            db.query(Operation, DailyReport)
            .join(DailyReport, DailyReport.report_id == Operation.report_id)
            .filter(Operation.well_id == well_id)
        )
        if start:
            q = q.filter(DailyReport.report_date >= start)
        if end:
            q = q.filter(DailyReport.report_date <= end)

        rows = q.order_by(Operation.operation_id.asc()).all()

        segments = []
        depth_max = 0.0

        for (op, rep) in rows:
            d_from = getattr(op, "depth_from", None)
            d_to = getattr(op, "depth_to", None)

            # skip bad rows
            if d_from is None or d_to is None:
                continue

            depth_max = max(depth_max, float(d_from), float(d_to))

            level = _level_from_op(op)

            segments.append({
                "from": float(d_from),
                "to": float(d_to),
                "level": level,
                "eventType": getattr(op, "operation_type", "Other"),
                "operationType": getattr(op, "operation_type", "Other"),
                "whyItMatters": getattr(op, "description", None),
                "nptHours": getattr(op, "npt_hours", None),
                "recordedAt": str(getattr(rep, "report_date", "")) if getattr(rep, "report_date", None) else None,
            })

        return {
            "well_id": well_id,
            "depthMax": depth_max,
            "segments": segments,
        }

    # Fallback if DailyReport model is not available
    ops = (
        db.query(Operation)
        .filter(Operation.well_id == well_id)
        .order_by(Operation.operation_id.asc())
        .all()
    )

    segments = []
    depth_max = 0.0
    for op in ops:
        d_from = getattr(op, "depth_from", None)
        d_to = getattr(op, "depth_to", None)

        if d_from is None or d_to is None:
            continue

        depth_max = max(depth_max, float(d_from), float(d_to))

        level = _level_from_op(op)

        segments.append({
            "from": float(d_from),
            "to": float(d_to),
            "level": level,
            "eventType": getattr(op, "operation_type", "Other"),
            "operationType": getattr(op, "operation_type", "Other"),
            "whyItMatters": getattr(op, "description", None),
            "nptHours": getattr(op, "npt_hours", None),
            "recordedAt": None,
        })

    return {
        "well_id": well_id,
        "depthMax": depth_max,
        "segments": segments,
    }
