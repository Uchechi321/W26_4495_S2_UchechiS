

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

