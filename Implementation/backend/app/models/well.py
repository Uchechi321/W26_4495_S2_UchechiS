from sqlalchemy import Column, Integer, String, Float, Date
from ..database import Base

class Well(Base):
    __tablename__ = "wells"

    well_id = Column(Integer, primary_key=True, index=True)
    well_name = Column(String)
    location = Column(String)
    total_depth = Column(Float)
    spud_date = Column(Date)
    well_status = Column(String)
