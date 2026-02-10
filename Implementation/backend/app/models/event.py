from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from ..database import Base

class Event(Base):
    __tablename__ = "events"

    event_id = Column(Integer, primary_key=True, index=True)
    operation_id = Column(Integer, ForeignKey("operations.operation_id"))
    well_id = Column(Integer, ForeignKey("wells.well_id"))
    depth = Column(Float)
    event_type = Column(String)
    event_description = Column(String)
    event_duration_hours = Column(Float)