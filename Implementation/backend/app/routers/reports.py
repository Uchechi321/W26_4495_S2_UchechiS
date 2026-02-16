from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..models.daily_report import DailyReport
from ..models.operation import Operation

router = APIRouter(prefix="/reports", tags=["Reports"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ------------------------------------------
# GET /reports  → list all reports
# ------------------------------------------
@router.get("/")
def list_reports(db: Session = Depends(get_db)):
    reports = db.query(DailyReport).order_by(DailyReport.report_date.desc()).all()

    return [
        {
            "report_id": r.report_id,
            "well_id": r.well_id,
            "report_date": r.report_date,
            "report_no": r.report_no,
            "filename": r.source_filename,
            "parser_type": r.parser_type,
            "uploaded_at": r.uploaded_at,
        }
        for r in reports
    ]


# ------------------------------------------
# GET /reports/{id}  → report details + ops
# ------------------------------------------
@router.get("/{report_id}")
def get_report_details(report_id: int, db: Session = Depends(get_db)):
    report = db.query(DailyReport).filter(DailyReport.report_id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    ops = (
        db.query(Operation)
        .filter(Operation.report_id == report_id)
        .order_by(Operation.depth_from.asc())
        .all()
    )

    return {
        "report": {
            "report_id": report.report_id,
            "well_id": report.well_id,
            "report_date": report.report_date,
            "report_no": report.report_no,
            "filename": report.source_filename,
            "parser_type": report.parser_type,
            "uploaded_at": report.uploaded_at,
            "notes": report.notes,
        },
        "operations": [
            {
                "operation_id": o.operation_id,
                "depth_from": o.depth_from,
                "depth_to": o.depth_to,
                "operation_type": o.operation_type,
                "description": o.description,
                "duration_hours": o.duration_hours,
                "npt_hours": o.npt_hours,
            }
            for o in ops
        ],
    }
