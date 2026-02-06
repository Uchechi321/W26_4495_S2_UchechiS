from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
import pandas as pd
from io import BytesIO
import logging

from ..database import SessionLocal
from ..models import Well, Operation, Event
from ..utils.column_mapping import normalize_columns

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
def well_exists(db, well_id):
    return db.query(Well).filter(Well.well_id == well_id).first() is not None


def operation_exists(db, well_id, date, operation_type):
    return db.query(Operation).filter(
        Operation.well_id == well_id,
        Operation.date == date,
        Operation.operation_type == operation_type
    ).first() is not None


def event_exists(db, well_id, timestamp, event_type):
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

    # 1. Validate file type
    if not file.filename.endswith((".xlsx", ".xls")):
        logger.error("Invalid file type uploaded")
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Please upload an Excel file (.xlsx or .xls)."
        )

    # 2. Read Excel file
    contents = await file.read()
    df_dict = pd.read_excel(BytesIO(contents), sheet_name=None)
    logger.info(f"Detected sheets: {list(df_dict.keys())}")

    # 3. Validate required sheets
    required_sheets = ["wells", "operations", "events"]
    sheet_names = [name.lower() for name in df_dict.keys()]
    missing_sheets = [s for s in required_sheets if s not in sheet_names]

    if missing_sheets:
        logger.error(f"Missing required sheets: {missing_sheets}")
        raise HTTPException(
            status_code=400,
            detail=f"Missing required sheets: {', '.join(missing_sheets)}"
        )

    # 4. Normalize columns
    normalized = {}
    for sheet, df in df_dict.items():
        df.columns = normalize_columns(df.columns)
        normalized[sheet.lower()] = df
        logger.info(f"Normalized columns for sheet: {sheet}")

    # 5. Validate required columns
    required_columns = {
        "wells": ["well_id", "name", "location"],
        "operations": ["well_id", "date", "depth", "operation_type"],
        "events": ["well_id", "timestamp", "event_type", "description"]
    }

    for sheet_name, df in normalized.items():
        if sheet_name in required_columns:
            missing_cols = [col for col in required_columns[sheet_name] if col not in df.columns]
            if missing_cols:
                logger.error(f"Sheet '{sheet_name}' missing columns: {missing_cols}")
                raise HTTPException(
                    status_code=400,
                    detail=f"Sheet '{sheet_name}' is missing required columns: {', '.join(missing_cols)}"
                )

    # 6. Extract sheets
    wells_df = normalized.get("wells")
    operations_df = normalized.get("operations")
    events_df = normalized.get("events")

    # ---------------------------
    # Insert Wells
    # ---------------------------
    inserted_wells = 0
    skipped_wells = 0
    failed_wells = 0
    well_errors = []

    if wells_df is not None:
        for index, row in wells_df.iterrows():
            try:
                if well_exists(db, row["well_id"]):
                    skipped_wells += 1
                    logger.info(f"Skipping duplicate well: {row['well_id']}")
                    continue

                well = Well(
                    well_id=row["well_id"],
                    name=row["name"],
                    location=row["location"]
                )
                db.add(well)
                inserted_wells += 1

            except Exception as e:
                failed_wells += 1
                logger.error(f"Failed to insert well at row {index}: {e}")
                well_errors.append({"row": int(index), "error": str(e)})

        db.commit()

    # ---------------------------
    # Insert Operations
    # ---------------------------
    inserted_ops = 0
    skipped_ops = 0
    failed_ops = 0
    op_errors = []

    if operations_df is not None:
        for index, row in operations_df.iterrows():
            try:
                if operation_exists(db, row["well_id"], row["date"], row["operation_type"]):
                    skipped_ops += 1
                    logger.info(f"Skipping duplicate operation for well {row['well_id']}")
                    continue

                op = Operation(
                    well_id=row["well_id"],
                    date=row["date"],
                    depth=row["depth"],
                    operation_type=row["operation_type"]
                )
                db.add(op)
                inserted_ops += 1

            except Exception as e:
                failed_ops += 1
                logger.error(f"Failed to insert operation at row {index}: {e}")
                op_errors.append({"row": int(index), "error": str(e)})

        db.commit()

    # ---------------------------
    # Insert Events
    # ---------------------------
    inserted_events = 0
    skipped_events = 0
    failed_events = 0
    event_errors = []

    if events_df is not None:
        for index, row in events_df.iterrows():
            try:
                if event_exists(db, row["well_id"], row["timestamp"], row["event_type"]):
                    skipped_events += 1
                    logger.info(f"Skipping duplicate event for well {row['well_id']}")
                    continue

                event = Event(
                    well_id=row["well_id"],
                    timestamp=row["timestamp"],
                    event_type=row["event_type"],
                    description=row["description"]
                )
                db.add(event)
                inserted_events += 1

            except Exception as e:
                failed_events += 1
                logger.error(f"Failed to insert event at row {index}: {e}")
                event_errors.append({"row": int(index), "error": str(e)})

        db.commit()

    logger.info("Upload completed successfully")

    # ---------------------------
    # Final Response
    # ---------------------------
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
        "event_errors": event_errors
    }