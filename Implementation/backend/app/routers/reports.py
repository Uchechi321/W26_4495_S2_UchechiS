from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..models.daily_report import DailyReport
from ..models.operation import Operation
from ..models.event import Event
from ..models.mud import MudProperties
from ..models.equipment import Equipment


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
    mud = db.query(MudProperties).filter_by(report_id=report_id).first()
    equipment = db.query(Equipment).filter_by(report_id=report_id).all()

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
    "mud": mud,
    "equipment": equipment
}



# ------------------------------------------
# DELETE /reports/{report_id} → delete report and all related data
# ------------------------------------------
@router.delete("/{report_id}")
def delete_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(DailyReport).filter(DailyReport.report_id == report_id).first()

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Delete related records first (so dashboard eventCount and KPIs stay in sync)
    db.query(Event).filter(Event.report_id == report_id).delete(synchronize_session=False)
    db.query(Operation).filter(Operation.report_id == report_id).delete(synchronize_session=False)
    db.query(MudProperties).filter(MudProperties.report_id == report_id).delete(synchronize_session=False)
    db.query(Equipment).filter(Equipment.report_id == report_id).delete(synchronize_session=False)
    db.delete(report)
    db.commit()

    return {"status": "success", "message": "Report deleted"}

from pydantic import BaseModel

class OperationUpdate(BaseModel):
    operations: list

@router.put("/{report_id}/operations")
def update_operations(report_id: int, payload: OperationUpdate, db: Session = Depends(get_db)):

    for op_data in payload.operations:
        op_id = op_data.get("operation_id")

        if op_id:  
            # UPDATE existing operation
            op = db.query(Operation).filter(Operation.operation_id == op_id).first()
            if not op:
                continue

            op.depth_from = op_data["depth_from"]
            op.depth_to = op_data["depth_to"]
            op.operation_type = op_data["operation_type"]
            op.description = op_data["description"]
            op.duration_hours = op_data.get("duration_hours", 0)
            op.npt_hours = op_data.get("npt_hours", 0)

        else:
            # CREATE new operation
            new_op = Operation(
                report_id=report_id,
                depth_from=op_data["depth_from"],
                depth_to=op_data["depth_to"],
                operation_type=op_data["operation_type"],
                description=op_data["description"],
                duration_hours=op_data.get("duration_hours", 0),
                npt_hours=op_data.get("npt_hours", 0)
            )
            db.add(new_op)

    db.commit()
    return {"status": "success"}

@router.put("/operations/{op_id}")
def update_operation(op_id: int, payload: dict, db: Session = Depends(get_db)):
    op = db.query(Operation).filter(Operation.operation_id == op_id).first()
    if not op:
        raise HTTPException(404, "Operation not found")

    op.description = payload.get("description", op.description)
    op.operation_type = payload.get("operation_type", op.operation_type)
    op.depth_from = payload.get("depth_from", op.depth_from)
    op.depth_to = payload.get("depth_to", op.depth_to)
    op.npt_hours = payload.get("npt_hours", op.npt_hours)

    db.commit()
    db.refresh(op)
    return {"message": "Operation updated", "operation": op}
