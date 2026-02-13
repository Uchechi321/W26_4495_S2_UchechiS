from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Text
from datetime import datetime
from ..database import Base

class DailyReport(Base):
    __tablename__ = "daily_reports"

    report_id = Column(Integer, primary_key=True, index=True)

    well_id = Column(String, ForeignKey("wells.well_id"), nullable=False, index=True)

    report_date = Column(Date, nullable=False, index=True)
    report_no = Column(String, nullable=True)

    source_filename = Column(String, nullable=True)
    parser_type = Column(String, nullable=True)     # e.g. "NNPC_FORMAT_A"
    file_hash = Column(String, nullable=True, index=True)

    uploaded_at = Column(DateTime, default=datetime.utcnow)

    notes = Column(Text, nullable=True)

