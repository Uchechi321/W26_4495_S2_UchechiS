from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from ..database import Base

class Operation(Base):
    __tablename__ = "operations"

    operation_id = Column(Integer, primary_key=True, index=True)
    well_id = Column(Integer, ForeignKey("wells.well_id"))
    depth_from = Column(Float)
    depth_to = Column(Float)
    operation_type = Column(String)
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    duration_hours = Column(Float)
    npt_hours = Column(Float)
