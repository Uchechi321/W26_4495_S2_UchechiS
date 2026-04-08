from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date
import logging

from ..database import SessionLocal
from ..models.operation import Operation
from ..auth_scope import require_user_email, get_well_for_user

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
    user_email: str = Depends(require_user_email),
):
    """
    Returns operations for a well.
    If DailyReport exists, you can filter by report_date using start/end.
    """
    get_well_for_user(db, well_id, user_email)
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


@router.get("/{well_id}/segments-basic")
def get_segments_for_well(
    well_id: str,
    start: date | None = Query(default=None, description="YYYY-MM-DD"),
    end: date | None = Query(default=None, description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    user_email: str = Depends(require_user_email),
):
    """
    Converts operations into frontend-friendly segments for the Wellbore view.
    """
    get_well_for_user(db, well_id, user_email)
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
                "level": level,   # ✅ FIXED
                "description": getattr(op, "description", None),  # ✅ FIXED
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
            "level": level,   # ✅ FIXED
            "description": getattr(op, "description", None),  # ✅ FIXED
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

@router.get("/{well_id}/dashboard")
def get_dashboard(
    well_id: str,
    db: Session = Depends(get_db),
    user_email: str = Depends(require_user_email),
):
    get_well_for_user(db, well_id, user_email)
    # Load all operations for this well (join DailyReport to include report_date for recordedAt)
    if DailyReport is not None:
        rows = (
            db.query(Operation, DailyReport.report_date)
            .join(DailyReport, DailyReport.report_id == Operation.report_id)
            .filter(Operation.well_id == well_id)
            .order_by(Operation.operation_id.asc())
            .all()
        )
        ops = [op for (op, _report_date) in rows]
    else:
        rows = None
        ops = (
            db.query(Operation)
            .filter(Operation.well_id == well_id)
            .order_by(Operation.operation_id.asc())
            .all()
        )

    if not ops:
        return {
            "kpis": {
                "depthMax": 0,
                "nptHours": 0,
                "eventCount": 0,
                "criticalEvents": 0,
                "highRiskZones": 0,
                "maintenanceRisk": "Low",
            },
            "segments": [],
        }

    # Compute KPIs
    depth_max = max(float(op.depth_to or 0) for op in ops)

    total_npt = sum(float(op.npt_hours or 0) for op in ops)

    event_count = len(ops)

    critical_events = sum(
        1 for op in ops
        if _level_from_op(op) == "critical"
    )

    high_risk_zones = critical_events  # or your own logic

    # Build segments (reuse your existing logic)
    segments = []
    if rows is not None:
        for op, report_date in rows:
            if op.depth_from is None or op.depth_to is None:
                continue

            segments.append({
                "from": float(op.depth_from),
                "to": float(op.depth_to),
                "level": _level_from_op(op),
                "description": op.description,
                "eventType": op.operation_type,
                "operationType": op.operation_type,
                "whyItMatters": op.description,
                "nptHours": op.npt_hours,
                "recordedAt": report_date.isoformat() if report_date else None,
            })
    else:
        for op in ops:
            if op.depth_from is None or op.depth_to is None:
                continue

            segments.append({
                "from": float(op.depth_from),
                "to": float(op.depth_to),
                "level": _level_from_op(op),
                "description": op.description,
                "eventType": op.operation_type,
                "operationType": op.operation_type,
                "whyItMatters": op.description,
                "nptHours": op.npt_hours,
                "recordedAt": None,
            })

    return {
        "kpis": {
            "depthMax": depth_max,
            "nptHours": total_npt,
            "eventCount": event_count,
            "criticalEvents": critical_events,
            "highRiskZones": high_risk_zones,
            "maintenanceRisk": "High" if critical_events > 0 else "Low",
        },
        "segments": segments,
    }
