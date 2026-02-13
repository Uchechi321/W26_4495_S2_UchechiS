from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import date
import logging
from ..models.well import Well

from ..database import SessionLocal
from ..services.ingestion_service import ingest_daily_report_pdf

router = APIRouter(prefix="/upload", tags=["Upload"])

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()



@router.post("/daily-report")
async def upload_daily_report(
    well_id: str,
    report_date: str,  # YYYY-MM-DD
    parser_type: str = "TBD",
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    logger.info(f"Upload started: {file.filename} | well_id={well_id} | report_date={report_date}")

    # Validate file type
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF daily drilling report.")

    # Parse date string
    try:
        y, m, d = map(int, report_date.split("-"))
        report_date_obj = date(y, m, d)
    except:
        raise HTTPException(status_code=400, detail="report_date must be in YYYY-MM-DD format.")

    pdf_bytes = await file.read()

    try:
        result = ingest_daily_report_pdf(
            db=db,
            well_id=well_id,
            report_date_obj=report_date_obj,
            filename=file.filename,
            pdf_bytes=pdf_bytes,
            parser_type=parser_type
        )
        return {"status": "success", **result}

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        logger.exception("Upload failed")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.post("/wells")
def create_well(
    well_id: str,
    well_name: str = None,
    location: str = None,
    db: Session = Depends(get_db)
):
    existing = db.query(Well).filter(Well.well_id == well_id).first()
    if existing:
        return {"status": "exists", "well_id": well_id}

    w = Well(
        well_id=well_id,
        well_name=well_name or well_id,
        location=location
    )
    db.add(w)
    db.commit()
    return {"status": "created", "well_id": well_id}


@router.get("/wells")
def list_wells(db: Session = Depends(get_db)):
    wells = db.query(Well).all()
    return [
        {
            "well_id": w.well_id,
            "well_name": w.well_name,
            "location": w.location,
            "total_depth": w.total_depth,
            "spud_date": str(w.spud_date) if w.spud_date else None,
            "well_status": w.well_status
        }
        for w in wells
    ]


from ..models.operation import Operation

@router.get("/wells/{well_id}/operations")
def get_well_operations(well_id: str, db: Session = Depends(get_db)):
    ops = (
        db.query(Operation)
        .filter(Operation.well_id == well_id)
        .order_by(Operation.depth_from.asc())
        .all()
    )

    return [
        {
            "operation_id": o.operation_id,
            "report_id": o.report_id,
            "depth_from": o.depth_from,
            "depth_to": o.depth_to,
            "operation_type": o.operation_type,
            "description": getattr(o, "description", None),
            "duration_hours": getattr(o, "duration_hours", None),
            "npt_hours": getattr(o, "npt_hours", None),
        }
        for o in ops
    ]

@router.get("/wells/{well_id}/segments")
def get_well_segments(well_id: str, db: Session = Depends(get_db)):
    ops = (
        db.query(Operation)
        .filter(Operation.well_id == well_id)
        .order_by(Operation.depth_from.asc())
        .all()
    )

    def level_for(text: str) -> str:
        t = (text or "").upper()
        critical_words = ["STUCK", "KICK", "WELL CONTROL", "LOSS CIRCULATION", "BOP FAILURE"]
        warning_words = ["WAIT", "NPT", "DELAY", "TROUBLE", "LOSS", "REPAIR", "LEAK"]

        if any(w in t for w in critical_words):
            return "critical"
        if any(w in t for w in warning_words):
            return "warning"
        return "normal"

    segments = []
    for o in ops:
        desc = getattr(o, "description", "") or ""
        segments.append({
            "from": o.depth_from,
            "to": o.depth_to,
            "level": level_for(desc),
            "eventType": o.operation_type,     # shown in modal as “Event Type”
            "operationType": o.operation_type,
            "whyItMatters": desc,
            "nptHours": getattr(o, "npt_hours", None),
            "recordedAt": None
        })

    return segments

