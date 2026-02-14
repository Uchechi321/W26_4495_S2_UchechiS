from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..models.well import Well

router = APIRouter(prefix="/wells", tags=["Wells"])


# ---------------------------
# Database Dependency
# ---------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------
# Create Well
# ---------------------------
@router.post("/")
def create_well(
    well_id: str,
    well_name: str = None,
    location: str = None,
    db: Session = Depends(get_db)
):
    existing = db.query(Well).filter(Well.well_id == well_id).first()
    if existing:
        return {"status": "exists", "well_id": well_id}

    well = Well(
        well_id=well_id,
        well_name=well_name or well_id,
        location=location
    )

    db.add(well)
    db.commit()

    return {
        "status": "created",
        "well_id": well_id
    }


# ---------------------------
# List Wells
# ---------------------------
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
