from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class Well(Base):
    __tablename__ = "wells"

    well_id = Column(Integer, primary_key=True, index=True)
    well_name = Column(String)
    location = Column(String)
    total_depth = Column(Float)
    spud_date = Column(Date)
    well_status = Column(String)

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

class Event(Base):
    __tablename__ = "events"

    event_id = Column(Integer, primary_key=True, index=True)
    operation_id = Column(Integer, ForeignKey("operations.operation_id"))
    well_id = Column(Integer, ForeignKey("wells.well_id"))
    depth = Column(Float)
    event_type = Column(String)
    event_description = Column(String)
    event_duration_hours = Column(Float)