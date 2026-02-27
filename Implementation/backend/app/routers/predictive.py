# backend/routers/predictive.py
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Any
from services.risk_engine import run_predictive_maintenance

router = APIRouter()

class PredictiveRequest(BaseModel):
    operations: List[Dict[str, Any]]
    equipment: List[Dict[str, Any]]
    mud: Dict[str, Any]

@router.post("/predictive-maintenance")
def predictive_api(body: PredictiveRequest):
    result = run_predictive_maintenance(
        operations=body.operations,
        equipment=body.equipment,
        mud=body.mud
    )
    return result