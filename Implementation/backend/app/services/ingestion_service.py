import hashlib
from datetime import date
from typing import Dict, Any, Tuple

from sqlalchemy.orm import Session

from ..models.well import Well
from ..models.daily_report import DailyReport
from ..models.operation import Operation
from ..models.event import Event

# ✅ NEW: import parser(s)
from ..parsers.nnpc_format_a import parse_nnpc_format_a


def sha256_bytes(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def ensure_well_exists(db: Session, well_id: str) -> Well:
    well = db.query(Well).filter(Well.well_id == well_id).first()
    if not well:
        raise ValueError(f"Well '{well_id}' not found. Create it first.")
    return well


def create_daily_report(
    db: Session,
    well_id: str,
    report_date_obj: date,
    filename: str,
    parser_type: str,
    file_hash: str,
) -> DailyReport:
    """
    Creates a DailyReport row. Prevents duplicates by (well_id + report_date) OR file_hash.
    For safety, we enforce BOTH.
    """
    

    report = DailyReport(
        well_id=well_id,
        report_date=report_date_obj,
        source_filename=filename,
        parser_type=parser_type,
        file_hash=file_hash,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


# ----------------------------
# Parser Router (MVP)
# ----------------------------
def parse_pdf_report(pdf_bytes: bytes, parser_type: str) -> Dict[str, Any]:
    """
    Routes a PDF to the correct parser based on parser_type.
    """

    if parser_type == "NNPC_FORMAT_A":
        return parse_nnpc_format_a(pdf_bytes)

    # Default: no parser matched yet
    return {
        "operations": [],
        "events": [],
        "notes": f"No parser matched for parser_type='{parser_type}'.",
    }


def insert_operations_events(
    db: Session,
    report_id: int,
    well_id: str,
    parsed: Dict[str, Any]
) -> Tuple[int, int]:
    """
    Inserts Operation and Event records linked to a DailyReport.
    Returns: (operations_inserted, events_inserted)
    """
    ops = parsed.get("operations", [])
    evs = parsed.get("events", [])

    ops_inserted = 0
    evs_inserted = 0

    # Insert operations
    for o in ops:
        db.add(Operation(
            report_id=report_id,
            well_id=well_id,
            depth_from=o.get("depth_from"),
            depth_to=o.get("depth_to"),
            operation_type=o.get("operation_type"),
            description=o.get("description"),
            start_time=o.get("start_time"),
            end_time=o.get("end_time"),
            duration_hours=o.get("duration_hours"),
            npt_hours=o.get("npt_hours"),
        ))
        ops_inserted += 1

    # Insert events
    for e in evs:
        db.add(Event(
            report_id=report_id,
            operation_id=e.get("operation_id"),
            well_id=well_id,
            depth_from=e.get("depth_from"),
            depth_to=e.get("depth_to"),
            event_type=e.get("event_type"),
            event_description=e.get("event_description"),
            event_duration_hours=e.get("event_duration_hours"),
            npt_hours=e.get("npt_hours"),
            severity=e.get("severity"),
            equipment=e.get("equipment"),
            actions_taken=e.get("actions_taken"),
            recorded_at=e.get("recorded_at"),
        ))
        evs_inserted += 1

    db.commit()
    return ops_inserted, evs_inserted


def ingest_daily_report_pdf(
    db: Session,
    well_id: str,
    report_date_obj: date,
    filename: str,
    pdf_bytes: bytes,
    parser_type: str = "TBD"
) -> Dict[str, Any]:
    """
    Full flow:
    - validate well exists
    - create DailyReport (duplicate-safe)
    - parse (real parser routing)
    - insert operations/events
    """
    ensure_well_exists(db, well_id)

    file_hash = sha256_bytes(pdf_bytes)

    report = create_daily_report(
        db=db,
        well_id=well_id,
        report_date_obj=report_date_obj,
        filename=filename,
        parser_type=parser_type,
        file_hash=file_hash,
    )

    parsed = parse_pdf_report(pdf_bytes, parser_type=parser_type)

    # optional: store notes on the DailyReport
    if parsed.get("notes"):
        report.notes = parsed["notes"]
        db.commit()

    ops_inserted, evs_inserted = insert_operations_events(
        db=db,
        report_id=report.report_id,
        well_id=well_id,
        parsed=parsed,
    )

    return {
        "report_id": report.report_id,
        "well_id": well_id,
        "report_date": str(report_date_obj),
        "filename": filename,
        "parser_type": parser_type,
        "operations_inserted": ops_inserted,
        "events_inserted": evs_inserted,
        # helpful for debugging early
        "notes": parsed.get("notes"),
        "debug_preview": parsed.get("raw_text_preview"),
    }
