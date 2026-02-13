from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from ..database import Base

class Operation(Base):
    __tablename__ = "operations"

    operation_id = Column(Integer, primary_key=True, index=True)

    # Link to daily report (Option 1: many days, keep history)
    report_id = Column(Integer, ForeignKey("daily_reports.report_id"), nullable=False, index=True)

    # Link to well (matches Well.well_id which is String)
    well_id = Column(String, ForeignKey("wells.well_id"), nullable=False, index=True)

    depth_from = Column(Float, nullable=True)
    depth_to = Column(Float, nullable=True)

    operation_type = Column(String, nullable=True)  # Drilling / Reaming / Circulating / etc.
    description = Column(Text, nullable=True)       # Free text from the report

    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)

    duration_hours = Column(Float, nullable=True)
    npt_hours = Column(Float, nullable=True)
