from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from ..database import Base

class Event(Base):
    __tablename__ = "events"

    event_id = Column(Integer, primary_key=True, index=True)

    # Link to daily report (so events remain tied to the PDF/day)
    report_id = Column(Integer, ForeignKey("daily_reports.report_id"), nullable=False, index=True)

    # Optional link to an operation row (if we can match it)
    operation_id = Column(Integer, ForeignKey("operations.operation_id"), nullable=True, index=True)

    well_id = Column(String, ForeignKey("wells.well_id"), nullable=False, index=True)

    # Depth segment (important for your Wellbore visualization)
    depth_from = Column(Float, nullable=True)
    depth_to = Column(Float, nullable=True)

    event_type = Column(String, nullable=True)
    event_description = Column(Text, nullable=True)

    event_duration_hours = Column(Float, nullable=True)
    npt_hours = Column(Float, nullable=True)

    # For UI / analytics
    severity = Column(String, nullable=True)  # normal / warning / critical
    equipment = Column(Text, nullable=True)   # store as comma-separated or JSON later
    actions_taken = Column(Text, nullable=True)
    recorded_at = Column(DateTime, nullable=True)
