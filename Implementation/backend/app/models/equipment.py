from sqlalchemy import Column, Integer, Float, String, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base

class Equipment(Base):
    __tablename__ = "equipment"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("daily_reports.report_id"))

    component_type = Column(String)
    joints = Column(Float)
    length_ft = Column(Float)
    od_in = Column(Float)
    id_in = Column(Float)
    connection = Column(String)
    weight_ppf = Column(Float)
    grade = Column(String)
    pin_box = Column(String)
    serial_no = Column(String)
    spiral = Column(String)
    fish_neck_length_ft = Column(Float)
    fish_neck_od = Column(Float)

    report = relationship("DailyReport", back_populates="equipment")
