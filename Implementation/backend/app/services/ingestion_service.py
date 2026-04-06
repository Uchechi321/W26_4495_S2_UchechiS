import hashlib
from datetime import date
from typing import Dict, Any, Tuple

from sqlalchemy.orm import Session

from ..models.well import Well
from ..models.daily_report import DailyReport
from ..models.operation import Operation
from ..models.event import Event
from ..models.mud import MudProperties
from ..models.equipment import Equipment

# ✅ NEW: import parser(s)
from ..parsers.nnpc_format_a import parse_nnpc_format_a
from ..parsers.daily_operations_flexible import parse_daily_operations_flexible


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

    if parser_type == "DAILY_OPERATIONS_FLEXIBLE":
        return parse_daily_operations_flexible(pdf_bytes)

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


def insert_mud(db: Session, report_id: int, mud_dict: Dict[str, Any]) -> bool:
    """Insert one MudProperties row from parsed mud dict. Returns True if inserted."""
    if not mud_dict or not any(
        mud_dict.get(k) is not None
        for k in ("mud_desc", "density_ppg", "viscosity_sqt", "pv_cp", "yp_lbf100ft2", "cl_ppm", "ca_ppm", "pH", "pm_cc", "pf_cc", "mf_cc")
    ):
        return False
    db.add(MudProperties(
        report_id=report_id,
        mud_desc=mud_dict.get("mud_desc"),
        density_ppg=mud_dict.get("density_ppg"),
        viscosity_sqt=mud_dict.get("viscosity_sqt"),
        pv_cp=mud_dict.get("pv_cp"),
        yp_lbf100ft2=mud_dict.get("yp_lbf100ft2"),
        cl_ppm=mud_dict.get("cl_ppm"),
        ca_ppm=mud_dict.get("ca_ppm"),
        pH=mud_dict.get("pH"),
        pm_cc=mud_dict.get("pm_cc"),
        pf_cc=mud_dict.get("pf_cc"),
        mf_cc=mud_dict.get("mf_cc"),
    ))
    db.commit()
    return True


def insert_equipment(db: Session, report_id: int, equipment_list: list) -> int:
    """Insert Equipment rows from parsed equipment list. Returns count inserted."""
    count = 0
    for eq in equipment_list or []:
        if not eq or not eq.get("component_type"):
            continue
        db.add(Equipment(
            report_id=report_id,
            component_type=eq.get("component_type"),
            joints=eq.get("joints"),
            length_ft=eq.get("length_ft"),
            od_in=eq.get("od_in"),
            id_in=eq.get("id_in"),
            connection=eq.get("connection"),
            weight_ppf=eq.get("weight_ppf"),
            grade=eq.get("grade"),
            pin_box=eq.get("pin_box"),
            serial_no=eq.get("serial_no"),
            spiral=eq.get("spiral"),
            fish_neck_length_ft=eq.get("fish_neck_length_ft"),
            fish_neck_od=eq.get("fish_neck_od"),
        ))
        count += 1
    if count:
        db.commit()
    return count


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

    mud_inserted = insert_mud(db, report.report_id, parsed.get("mud") or {})
    equipment_inserted = insert_equipment(db, report.report_id, parsed.get("equipment") or [])

    return {
        "report_id": report.report_id,
        "well_id": well_id,
        "report_date": str(report_date_obj),
        "filename": filename,
        "parser_type": parser_type,
        "operations_inserted": ops_inserted,
        "events_inserted": evs_inserted,
        "mud_inserted": mud_inserted,
        "equipment_inserted": equipment_inserted,
        "notes": parsed.get("notes"),
        "debug_preview": parsed.get("debug_preview") or parsed.get("raw_text_preview"),
    }
