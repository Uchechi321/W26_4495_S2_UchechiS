from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..services.ai_engine import analyze_segment, get_maintenance_analysis
from ..models.well import Well
from ..models.operation import Operation
from ..models.daily_report import DailyReport
from ..models.equipment import Equipment

router = APIRouter(prefix="/wells", tags=["Wells"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/")
def list_wells(db: Session = Depends(get_db)):
    wells = db.query(Well).all()
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
):
    existing = db.query(Well).filter(Well.well_id == well_id).first()
    if existing:
        return {"status": "exists", "well_id": well_id}

    w = Well(
        well_id=well_id,
        well_name=well_name or well_id,
        location=location,
    )
    db.add(w)
    db.commit()
    return {"status": "created", "well_id": well_id}


@router.get("/summary")
def get_wells_summary(db: Session = Depends(get_db)):
    """Return per-well summary (KPIs + report count) for the Summary Reports page."""
    wells = db.query(Well).all()
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
def get_well_dashboard(well_id: str, db: Session = Depends(get_db)):
    well = db.query(Well).filter(Well.well_id == well_id).first()
    if not well:
        raise HTTPException(status_code=404, detail=f"Well '{well_id}' not found")

    # Join with DailyReport to get report_date per operation (for NPT-by-report chart)
    ops_with_dates = (
        db.query(Operation, DailyReport.report_date)
        .join(DailyReport, DailyReport.report_id == Operation.report_id)
        .filter(Operation.well_id == well_id)
        .order_by(Operation.depth_from.asc())
        .all()
    )

    # Build "segments" from operations (simple MVP)
    segments = []
    ops = []
    for o, report_date in ops_with_dates:
        ops.append(o)
        level = "normal"
        if o.npt_hours and o.npt_hours >= 2:
            level = "critical"
        elif o.npt_hours and o.npt_hours > 0:
            level = "warning"

        segments.append(
            {
                "from": o.depth_from,
                "to": o.depth_to,
                "level": level,
                "eventType": o.operation_type,
                "operationType": o.operation_type,
                "whyItMatters": o.description,
                "nptHours": o.npt_hours,
                "recordedAt": report_date.isoformat() if report_date else None,
                "report_id": o.report_id,
            }
        )

    # Equipment per report (for segment modal "Equipment Involved")
    report_ids = list({o.report_id for o in ops})
    equipment_by_report = {}
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
def get_segment_analysis(well_id: str, body: SegmentAnalysisRequest):
    """Return AI-generated explanation for why a segment was flagged (e.g. red critical)."""
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
    return analyze_segment(segment, context={})


@router.get("/{well_id}/maintenance")
def get_well_maintenance(well_id: str, db: Session = Depends(get_db)):
    """
    Predictive maintenance summary for the Maintenance page. Uses equipment from all
    uploaded reports for this well and (optionally) LLM to produce overallRisk,
    highRiskCount, mediumRiskCount, totalEquipment, and equipment cards. Same shape
    as frontend Maintenance.jsx expects.
    """
    well = db.query(Well).filter(Well.well_id == well_id).first()
    if not well:
        raise HTTPException(status_code=404, detail=f"Well '{well_id}' not found")

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
def list_reports_for_well(well_id: str, db: Session = Depends(get_db)):
    from ..models.daily_report import DailyReport
    
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
def get_report_detail(well_id: str, report_id: int, db: Session = Depends(get_db)):

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
