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




from ..models.operation import Operation

