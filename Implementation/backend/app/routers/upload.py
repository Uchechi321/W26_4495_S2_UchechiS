from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
import pandas as pd
from io import BytesIO
import logging

from ..database import SessionLocal
from ..models import Well, Operation, Event
from ..utils.transform import transform_dataset

router = APIRouter(prefix="/upload", tags=["Upload"])

# ---------------------------
# Logging Configuration
# ---------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# ---------------------------
# Database Session Dependency
# ---------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---------------------------
# Duplicate Check Helpers
# ---------------------------
def well_exists(db: Session, well_id):
    return db.query(Well).filter(Well.well_id == well_id).first() is not None

def operation_exists(db: Session, well_id, date, operation_type):
    return db.query(Operation).filter(
        Operation.well_id == well_id,
        Operation.date == date,
        Operation.operation_type == operation_type
    ).first() is not None

def event_exists(db: Session, well_id, timestamp, event_type):
    return db.query(Event).filter(
        Event.well_id == well_id,
        Event.timestamp == timestamp,
        Event.event_type == event_type
    ).first() is not None

# ---------------------------
# Upload Endpoint
# ---------------------------
@router.post("/")
async def upload_dataset(file: UploadFile = File(...), db: Session = Depends(get_db)):
    logger.info(f"Upload started for file: {file.filename}")

    # 1) Validate file type
    if not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Please upload an Excel file (.xlsx or .xls)."
        )

    # 2) Read Excel file
    contents = await file.read()
    df_dict = pd.read_excel(BytesIO(contents), sheet_name=None)
    logger.info(f"Detected sheets: {list(df_dict.keys())}")

    # 3) Validate required sheets
    required_sheets = ["wells", "operations", "events"]
    sheet_map = {name.lower(): name for name in df_dict.keys()}  # lower -> original
    missing_sheets = [s for s in required_sheets if s not in sheet_map]
    if missing_sheets:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required sheets: {', '.join(missing_sheets)}"
        )

    # 4) Transform each sheet using the full pipeline
    transformed = {}
    for original_name, df in df_dict.items():
        sheet_lower = original_name.lower()
        logger.info(f"Transforming sheet: {original_name}")
        transformed[sheet_lower] = transform_dataset(df)

    # 5) Validate required columns AFTER transformation
    required_columns = {
        "wells": ["well_id", "well_name", "location"],
        "operations": ["well_id", "date", "depth_m", "operation_type"],
        "events": ["well_id", "timestamp", "event_type", "description"],
    }

    for sheet_name, cols in required_columns.items():
        df = transformed.get(sheet_name)
        missing_cols = [c for c in cols if c not in df.columns]
        if missing_cols:
            raise HTTPException(
                status_code=400,
                detail=f"Sheet '{sheet_name}' is missing required columns: {', '.join(missing_cols)}"
            )

    # 6) Extract sheets
    wells_df = transformed["wells"].copy()
    operations_df = transformed["operations"].copy()
    events_df = transformed["events"].copy()

    # ---------------------------
    # Insert Wells
    # ---------------------------
    inserted_wells = skipped_wells = failed_wells = 0
    well_errors = []

    # ✅ prevent duplicate well_id inside the file itself
    wells_df = wells_df.dropna(subset=["well_id"]).drop_duplicates(subset=["well_id"])

    try:
        for index, row in wells_df.iterrows():
            try:
                well_id = row["well_id"]

                if well_exists(db, well_id):
                    skipped_wells += 1
                    continue

                db.add(Well(
                    well_id=well_id,
                    well_name=row.get("well_name"),
                    location=row.get("location"),
                ))
                inserted_wells += 1

            except Exception as e:
                failed_wells += 1
                logger.error(f"Failed to insert well at row {index}: {e}")
                well_errors.append({"row": int(index), "error": str(e)})

        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed inserting wells: {str(e)}")

    # ---------------------------
    # Insert Operations
    # ---------------------------
    inserted_ops = skipped_ops = failed_ops = 0
    op_errors = []

    try:
        for index, row in operations_df.iterrows():
            try:
                well_id = row["well_id"]
                date = row["date"]
                operation_type = row["operation_type"]

                if operation_exists(db, well_id, date, operation_type):
                    skipped_ops += 1
                    continue

                db.add(Operation(
                    well_id=well_id,
                    date=date,
                    depth=row["depth_m"],          # standardized depth
                    operation_type=operation_type,
                ))
                inserted_ops += 1

            except Exception as e:
                failed_ops += 1
                logger.error(f"Failed to insert operation at row {index}: {e}")
                op_errors.append({"row": int(index), "error": str(e)})

        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed inserting operations: {str(e)}")

    # ---------------------------
    # Insert Events
    # ---------------------------
    inserted_events = skipped_events = failed_events = 0
    event_errors = []

    try:
        for index, row in events_df.iterrows():
            try:
                well_id = row["well_id"]
                ts = row["timestamp"]
                event_type = row["event_type"]

                if event_exists(db, well_id, ts, event_type):
                    skipped_events += 1
                    continue

                # ✅ IMPORTANT: use the actual model field name
                # If your Event model field is `timestamp`, use timestamp=...
                # If it's `event_time`, then change both event_exists() and this line to match.
                db.add(Event(
                    well_id=well_id,
                    timestamp=ts,
                    event_type=event_type,
                    description=row["description"],
                ))
                inserted_events += 1

            except Exception as e:
                failed_events += 1
                logger.error(f"Failed to insert event at row {index}: {e}")
                event_errors.append({"row": int(index), "error": str(e)})

        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed inserting events: {str(e)}")

    logger.info("Upload completed successfully")

    return {
        "status": "success",
        "wells_inserted": inserted_wells,
        "wells_skipped": skipped_wells,
        "wells_failed": failed_wells,
        "well_errors": well_errors,
        "operations_inserted": inserted_ops,
        "operations_skipped": skipped_ops,
        "operations_failed": failed_ops,
        "operation_errors": op_errors,
        "events_inserted": inserted_events,
        "events_skipped": skipped_events,
        "events_failed": failed_events,
        "event_errors": event_errors,
    }
