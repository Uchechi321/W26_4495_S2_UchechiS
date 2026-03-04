from sqlalchemy import Column, Integer, Float, ForeignKey, String
from sqlalchemy.orm import relationship
from ..database import Base

class MudProperties(Base):
    __tablename__ = "mud_properties"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("daily_reports.report_id"))

    mud_desc = Column(String)
    density_ppg = Column(Float)
    viscosity_sqt = Column(Float)
    pv_cp = Column(Float)
    yp_lbf100ft2 = Column(Float)
    cl_ppm = Column(Float)
    ca_ppm = Column(Float)
    pH = Column(Float)
    pm_cc = Column(Float)
    pf_cc = Column(Float)
    mf_cc = Column(Float)

    report = relationship("DailyReport", back_populates="mud")
