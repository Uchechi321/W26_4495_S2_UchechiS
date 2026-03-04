from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..database import SessionLocal
from ..models.mud import MudProperties
from ..models.equipment import Equipment

router = APIRouter(prefix="/report-details", tags=["Report Details"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/{report_id}/mud")
def add_or_update_mud(report_id: int, payload: dict, db: Session = Depends(get_db)):
    mud = db.query(MudProperties).filter_by(report_id=report_id).first()

    if mud:
        for key, value in payload.items():
            setattr(mud, key, value)
    else:
        mud = MudProperties(report_id=report_id, **payload)
        db.add(mud)

    db.commit()
    return {"status": "success", "mud": payload}


@router.post("/{report_id}/equipment")
def add_equipment(report_id: int, payload: dict, db: Session = Depends(get_db)):
    equipment = Equipment(report_id=report_id, **payload)
    db.add(equipment)
    db.commit()
    return {"status": "success", "equipment": payload}


@router.get("/{report_id}/equipment")
def get_equipment(report_id: int, db: Session = Depends(get_db)):
    items = db.query(Equipment).filter_by(report_id=report_id).all()
    return items


class EquipmentList(BaseModel):
    items: list[dict]


@router.put("/{report_id}/equipment")
def replace_equipment(report_id: int, payload: EquipmentList, db: Session = Depends(get_db)):
    # Simple replace-all strategy for this report's equipment
    db.query(Equipment).filter_by(report_id=report_id).delete()
    for eq_data in payload.items:
        equipment = Equipment(report_id=report_id, **eq_data)
        db.add(equipment)
    db.commit()
    return {"status": "success", "count": len(payload.items)}
