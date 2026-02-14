from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..models.well import Well
from ..models.operation import Operation

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


@router.get("/{well_id}/dashboard")
def get_well_dashboard(well_id: str, db: Session = Depends(get_db)):
    well = db.query(Well).filter(Well.well_id == well_id).first()
    if not well:
        raise HTTPException(status_code=404, detail=f"Well '{well_id}' not found")

    ops = (
        db.query(Operation)
        .filter(Operation.well_id == well_id)
        .order_by(Operation.depth_from.asc())
        .all()
    )

    # Build "segments" from operations (simple MVP)
    segments = []
    for o in ops:
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
                "recordedAt": None,
            }
        )

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
    }
