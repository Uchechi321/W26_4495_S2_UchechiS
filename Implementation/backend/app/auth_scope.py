"""
Per-user data scope using X-User-Email header (matches frontend localStorage "auth").
"""

import os
from typing import Optional

from fastapi import Header, HTTPException
from sqlalchemy.orm import Session

from .models.well import Well
from .models.daily_report import DailyReport


def normalize_email(email: Optional[str]) -> str:
    return (email or "").strip().lower()


def require_user_email(
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
) -> str:
    email = normalize_email(x_user_email)
    if not email:
        raise HTTPException(
            status_code=401,
            detail="Sign in required. Send X-User-Email header (use the same email you signed in with).",
        )
    return email


def get_well_for_user(db: Session, well_id: str, user_email: str) -> Well:
    """404 if missing well; 403 if well belongs to another user or is unowned."""
    well = db.query(Well).filter(Well.well_id == well_id).first()
    if not well:
        raise HTTPException(status_code=404, detail=f"Well '{well_id}' not found")

    owner = normalize_email(well.owner_email)
    me = normalize_email(user_email)

    if not owner:
        raise HTTPException(
            status_code=403,
            detail="This well is not linked to an account yet. Create it again from the Wells page while signed in to claim it.",
        )
    if owner != me:
        raise HTTPException(status_code=403, detail="You do not have access to this well.")

    return well


def assert_report_owned(db: Session, report_id: int, user_email: str) -> DailyReport:
    report = db.query(DailyReport).filter(DailyReport.report_id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    get_well_for_user(db, report.well_id, user_email)
    return report


def bootstrap_legacy_well_owners(engine) -> None:
    """
    If BOOTSTRAP_WELL_OWNER_EMAIL is set, assign NULL owner_email wells to that email (one-time dev convenience).
    """
    boot = os.getenv("BOOTSTRAP_WELL_OWNER_EMAIL", "").strip()
    if not boot:
        return
    from sqlalchemy import text

    e = normalize_email(boot)
    with engine.connect() as conn:
        conn.execute(
            text("UPDATE wells SET owner_email = :email WHERE owner_email IS NULL"),
            {"email": e},
        )
        conn.commit()
