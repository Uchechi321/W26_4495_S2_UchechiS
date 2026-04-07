from typing import Optional
import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..auth_scope import require_user_email, get_well_for_user, normalize_email
from ..services.ai_engine import (
    analyze_segment,
    get_maintenance_analysis,
    classify_segment_level,
    classify_segment_level_rule_based,
)
from ..services.ml_model import predict_segment_risk
from ..models.well import Well
from ..models.operation import Operation
from ..models.daily_report import DailyReport
from ..models.equipment import Equipment
from ..models.event import Event
from ..models.mud import MudProperties

router = APIRouter(prefix="/wells", tags=["Wells"])


def _level_from_ml_severity(predicted_severity: str) -> str:
    sev = (predicted_severity or "").strip().lower()
    if sev == "high":
        return "critical"
    if sev == "medium":
        return "warning"
    return "normal"

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/")
def list_wells(
    db: Session = Depends(get_db),
    user_email: str = Depends(require_user_email),
):
    me = normalize_email(user_email)
    wells = (
        db.query(Well)
        .filter(func.lower(Well.owner_email) == me)
        .all()
    )
    return [
        {
            "well_id": w.well_id,
            "well_name": w.well_name,
            "location": w.location,
        }
        for w in wells
    ]


@router.post("/")
def create_well(
    well_id: str,
    well_name: str = None,
    location: str = None,
    db: Session = Depends(get_db),
    user_email: str = Depends(require_user_email),
):
    me = normalize_email(user_email)
    requested_id = (well_id or "").strip()
    requested_name = (well_name or "").strip()
    requested_location = (location or "").strip() or None

    def _sanitize_base_id(raw: str) -> str:
        token = re.sub(r"[^A-Za-z0-9-]+", "-", (raw or "").strip())
        token = re.sub(r"-{2,}", "-", token).strip("-")
        return (token or "WELL").upper()

    # If user leaves ID empty, derive from well name for a friendlier flow.
    base_id = _sanitize_base_id(requested_id or requested_name or "WELL")

    existing = db.query(Well).filter(Well.well_id == base_id).first()
    if existing:
        owner = normalize_email(existing.owner_email)
        if owner and owner != me:
            # Account isolation: auto-pick next free ID instead of blocking due to another account.
            suffix = 2
            candidate = f"{base_id}-{suffix}"
            while db.query(Well).filter(Well.well_id == candidate).first():
                suffix += 1
                candidate = f"{base_id}-{suffix}"
            base_id = candidate
            existing = None
        if not owner:
            existing.owner_email = me
            db.commit()
            return {"status": "claimed", "well_id": base_id}
        if existing:
            return {"status": "exists", "well_id": base_id}

    w = Well(
        well_id=base_id,
        well_name=requested_name or base_id,
        location=requested_location,
        owner_email=me,
    )
    db.add(w)
    db.commit()
    return {"status": "created", "well_id": base_id}


@router.put("/{well_id}")
def update_well(
    well_id: str,
    well_name: Optional[str] = None,
    location: Optional[str] = None,
    db: Session = Depends(get_db),
    user_email: str = Depends(require_user_email),
):
    well = get_well_for_user(db, well_id, user_email)
    if well_name is not None:
        clean_name = well_name.strip()
        if clean_name:
            well.well_name = clean_name
    if location is not None:
        clean_location = location.strip()
        well.location = clean_location or None
    db.commit()
    return {"status": "updated", "well_id": well.well_id}


@router.delete("/{well_id}")
def delete_well(
    well_id: str,
    db: Session = Depends(get_db),
    user_email: str = Depends(require_user_email),
):
    get_well_for_user(db, well_id, user_email)
    report_ids = [
        rid for (rid,) in db.query(DailyReport.report_id).filter(DailyReport.well_id == well_id).all()
    ]
    if report_ids:
        db.query(Event).filter(Event.report_id.in_(report_ids)).delete(synchronize_session=False)
        db.query(Operation).filter(Operation.report_id.in_(report_ids)).delete(synchronize_session=False)
        db.query(MudProperties).filter(MudProperties.report_id.in_(report_ids)).delete(synchronize_session=False)
        db.query(Equipment).filter(Equipment.report_id.in_(report_ids)).delete(synchronize_session=False)
        db.query(DailyReport).filter(DailyReport.report_id.in_(report_ids)).delete(synchronize_session=False)
    db.query(Operation).filter(Operation.well_id == well_id).delete(synchronize_session=False)
    db.query(Event).filter(Event.well_id == well_id).delete(synchronize_session=False)
    db.query(Well).filter(Well.well_id == well_id).delete(synchronize_session=False)
    db.commit()
    return {"status": "deleted", "well_id": well_id}


@router.get("/summary")
def get_wells_summary(
    db: Session = Depends(get_db),
    user_email: str = Depends(require_user_email),
):
    """Return per-well summary (KPIs + report count) for the Summary Reports page."""
    me = normalize_email(user_email)
    wells = db.query(Well).filter(func.lower(Well.owner_email) == me).all()
    result = []
    for w in wells:
        report_count = db.query(DailyReport).filter(DailyReport.well_id == w.well_id).count()
        ops = (
            db.query(Operation)
            .filter(Operation.well_id == w.well_id)
            .all()
        )
        total_npt = sum(o.npt_hours or 0 for o in ops)
        depth_max = max((o.depth_to or 0 for o in ops), default=0)
        critical = sum(1 for o in ops if (o.npt_hours or 0) >= 2)
        high_risk = sum(1 for o in ops if (o.npt_hours or 0) > 0)
        maintenance_risk = "Low" if total_npt == 0 else "Medium" if total_npt < 5 else "High"
        result.append({
            "well_id": w.well_id,
            "well_name": w.well_name,
            "location": w.location,
            "report_count": report_count,
            "kpis": {
                "depthMax": depth_max,
                "nptHours": round(total_npt, 2),
                "eventCount": len(ops),
                "criticalEvents": critical,
                "highRiskZones": high_risk,
                "maintenanceRisk": maintenance_risk,
            },
        })
    return result


@router.get("/{well_id}/dashboard")
def get_well_dashboard(
    well_id: str,
    include_equipment: bool = True,
    use_ai_level: bool = True,
    db: Session = Depends(get_db),
    user_email: str = Depends(require_user_email),
):
    well = get_well_for_user(db, well_id, user_email)

    # Join with DailyReport to get report_date per operation (for NPT-by-report chart)
    ops_with_dates = (
        db.query(Operation, DailyReport.report_date)
        .join(DailyReport, DailyReport.report_id == Operation.report_id)
        .filter(Operation.well_id == well_id)
        .order_by(Operation.depth_from.asc())
        .all()
    )

    # Build "segments" from operations. For fleet pages, use_ai_level=False avoids per-segment LLM calls.
    segments = []
    ops = []
    for o, report_date in ops_with_dates:
        ops.append(o)
        seg = {
            "from": o.depth_from,
            "to": o.depth_to,
            "eventType": o.operation_type,
            "operationType": o.operation_type,
            "whyItMatters": o.description,
            "nptHours": o.npt_hours,
            "recordedAt": report_date.isoformat() if report_date else None,
            "report_id": o.report_id,
        }
        # Use ML risk model as the single source for segment color/severity so
        # risk_score and displayed severity always align.
        ml_result = predict_segment_risk(seg)
        seg["riskScore"] = ml_result["riskScore"]
        seg["predictedSeverity"] = ml_result["predictedSeverity"]
        seg["level"] = _level_from_ml_severity(ml_result["predictedSeverity"])
        segments.append(seg)

    equipment_by_report = {}
    if include_equipment:
        # Equipment per report (for segment modal "Equipment Involved")
        report_ids = list({o.report_id for o in ops})
        for rid in report_ids:
            items = db.query(Equipment).filter_by(report_id=rid).order_by(Equipment.id).all()
            equipment_by_report[str(rid)] = [
                {
                    "component_type": e.component_type,
                    "joints": e.joints,
                    "length_ft": e.length_ft,
                    "od_in": e.od_in,
                    "id_in": e.id_in,
                    "connection": e.connection,
                    "weight_ppf": e.weight_ppf,
                    "grade": e.grade,
                    "pin_box": e.pin_box,
                    "serial_no": e.serial_no,
                    "spiral": e.spiral,
                    "fish_neck_length_ft": e.fish_neck_length_ft,
                    "fish_neck_od": e.fish_neck_od,
                }
                for e in items
            ]

    # KPIs (simple MVP)
    total_npt = sum([o.npt_hours or 0 for o in ops])
    depth_max = max([o.depth_to or 0 for o in ops], default=0)

    return {
        "well": {
            "well_id": well.well_id,
            "well_name": well.well_name,
            "location": well.location,
        },
        "kpis": {
            "depthMax": depth_max,
            "nptHours": round(total_npt, 2),
            "eventCount": len(ops),
            "criticalEvents": sum(1 for o in ops if (o.npt_hours or 0) >= 2),
            "highRiskZones": sum(1 for o in ops if (o.npt_hours or 0) > 0),
            "maintenanceRisk": "Low" if total_npt == 0 else "Medium" if total_npt < 5 else "High",
        },
        "segments": segments,
        "equipmentByReport": equipment_by_report,
    }


class SegmentAnalysisRequest(BaseModel):
    segment: dict
    equipment: list = []


class TextAnalysisRequest(BaseModel):
    text: str
    depth_from: Optional[float] = None
    depth_to: Optional[float] = None
    operation_type: Optional[str] = None
    npt_hours: Optional[float] = None
    level: Optional[str] = None


@router.post("/{well_id}/segment-analysis")
def get_segment_analysis(
    well_id: str,
    body: SegmentAnalysisRequest,
    db: Session = Depends(get_db),
    user_email: str = Depends(require_user_email),
):
    """Return AI-generated explanation for why a segment was flagged (e.g. red critical)."""
    get_well_for_user(db, well_id, user_email)
    context = {"well_id": well_id, "equipment": body.equipment or []}
    return analyze_segment(body.segment, context)


@router.post("/segment-text-analysis")
def analyze_segment_text(body: TextAnalysisRequest):
    """
    Analyze free-text from a segment description (e.g. the 'Description' section text)
    and return the same structured explanation used by SegmentModal:

    - How we determined this title        -> titleSource
    - Why was this flagged                -> flaggedReason
    - Contributing factors                -> contributingFactors
    - Similar events in well history      -> similarEventsInHistory
    - Technical factors identified        -> technicalFactors
    - Recommended prevention measures     -> preventionMeasures
    - Analysis methodology                -> methodology

    Optional depth_from, depth_to, operation_type, npt_hours, level allow the
    response title and depth range to show real segment context instead of 0m - 0m.
    """
    segment = {
        "from": body.depth_from,
        "to": body.depth_to,
        "operationType": body.operation_type,
        "eventType": body.operation_type,
        "nptHours": body.npt_hours,
        "level": body.level or "normal",
        "whyItMatters": body.text,
        "recordedAt": None,
    }
    # Fast rule-based analysis only — no LLM round-trip so the modal opens with full content immediately.
    return analyze_segment(segment, context={}, use_llm=False)


@router.get("/{well_id}/maintenance")
def get_well_maintenance(
    well_id: str,
    db: Session = Depends(get_db),
    user_email: str = Depends(require_user_email),
):
    """
    Predictive maintenance summary for the Maintenance page. Uses equipment from all
    uploaded reports for this well and (optionally) LLM to produce overallRisk,
    highRiskCount, mediumRiskCount, totalEquipment, and equipment cards. Same shape
    as frontend Maintenance.jsx expects.
    """
    get_well_for_user(db, well_id, user_email)

    reports = db.query(DailyReport).filter(DailyReport.well_id == well_id).all()
    report_ids = [r.report_id for r in reports]
    equipment_list = []
    if report_ids:
        items = db.query(Equipment).filter(Equipment.report_id.in_(report_ids)).order_by(Equipment.report_id, Equipment.id).all()
        raw = [
            {
                "component_type": e.component_type,
                "joints": e.joints,
                "length_ft": e.length_ft,
                "od_in": e.od_in,
                "id_in": e.id_in,
                "connection": e.connection,
                "weight_ppf": e.weight_ppf,
                "grade": e.grade,
                "pin_box": e.pin_box,
                "serial_no": e.serial_no,
                "spiral": e.spiral,
                "fish_neck_length_ft": e.fish_neck_length_ft,
                "fish_neck_od": e.fish_neck_od,
            }
            for e in items
        ]
        # One entry per equipment type: group by component_type (case-insensitive), accumulate joints/length
        by_type = {}
        for e in raw:
            key = (e.get("component_type") or "Equipment").strip().lower() or "equipment"
            if key not in by_type:
                by_type[key] = {
                    "component_type": (e.get("component_type") or "Equipment").strip() or "Equipment",
                    "joints": 0,
                    "length_ft": 0,
                    "od_in": e.get("od_in"),
                    "id_in": e.get("id_in"),
                    "connection": e.get("connection"),
                    "weight_ppf": e.get("weight_ppf"),
                    "grade": e.get("grade"),
                    "pin_box": e.get("pin_box"),
                    "serial_no": e.get("serial_no"),
                    "spiral": e.get("spiral"),
                    "fish_neck_length_ft": e.get("fish_neck_length_ft"),
                    "fish_neck_od": e.get("fish_neck_od"),
                    "_report_count": 0,
                }
            by_type[key]["joints"] = (by_type[key]["joints"] or 0) + (e.get("joints") or 0)
            by_type[key]["length_ft"] = (by_type[key]["length_ft"] or 0) + (e.get("length_ft") or 0)
            by_type[key]["_report_count"] = by_type[key]["_report_count"] + 1
        equipment_list = [v for v in by_type.values()]

    ops = db.query(Operation).filter(Operation.well_id == well_id).all()
    total_npt = sum(o.npt_hours or 0 for o in ops)
    critical_count = sum(1 for o in ops if (o.npt_hours or 0) >= 2)

    context = {"well_id": well_id, "total_npt": total_npt, "critical_count": critical_count}
    return get_maintenance_analysis(equipment_list, context)


@router.get("/{well_id}/reports")
def list_reports_for_well(
    well_id: str,
    db: Session = Depends(get_db),
    user_email: str = Depends(require_user_email),
):
    from ..models.daily_report import DailyReport

    get_well_for_user(db, well_id, user_email)

    reports = (
        db.query(DailyReport)
        .filter(DailyReport.well_id == well_id)
        .order_by(DailyReport.report_date.desc())
        .all()
    )

    return [
        {
            "report_id": r.report_id,
            "well_id": r.well_id,
            "filename": r.source_filename,
            "report_date": r.report_date.isoformat(),
            "parser_type": r.parser_type
        }
        for r in reports
    ]


@router.get("/{well_id}/report/{report_id}")
def get_report_detail(
    well_id: str,
    report_id: int,
    db: Session = Depends(get_db),
    user_email: str = Depends(require_user_email),
):
    get_well_for_user(db, well_id, user_email)

    report = (
        db.query(DailyReport)
        .filter(DailyReport.well_id == well_id, DailyReport.report_id == report_id)
        .first()
    )

    if not report:
        raise HTTPException(404, f"Report {report_id} not found for well {well_id}")

    operations = (
        db.query(Operation)
        .filter(Operation.report_id == report_id)
        .order_by(Operation.depth_from.asc())
        .all()
    )

    return {
        "report": {
            "report_id": report.report_id,
            "filename": report.source_filename,
            "parser_type": report.parser_type,
            "report_date": report.report_date,
        },
        "operations": [
            {
                "depth_from": o.depth_from,
                "depth_to": o.depth_to,
                "operation_type": o.operation_type,
                "description": o.description,
                "duration_hours": o.duration_hours,
                "npt_hours": o.npt_hours,
            }
            for o in operations
        ]
    }
