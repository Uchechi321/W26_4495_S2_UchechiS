from sqlalchemy import Column, String, Float, Date
from ..database import Base

class Well(Base):
    __tablename__ = "wells"

    # Use a string ID so it matches your frontend (WELL-01, WELL-02, etc.)
    well_id = Column(String, primary_key=True, index=True)   # e.g., "WELL-03"
    well_name = Column(String, nullable=False)               # e.g., "Okoloma 02"
    location = Column(String, nullable=True)                 # e.g., "Field C"
    total_depth = Column(Float, nullable=True)               # e.g., 2000.0
    spud_date = Column(Date, nullable=True)
    well_status = Column(String, nullable=True)              # Normal/Warning/Critical
