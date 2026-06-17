from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import WaterParameter
from app.schemas.schemas import WaterParameterCreate, WaterParameterOut
from app.services import alerts as alert_service

router = APIRouter()

@router.get("/{tank_id}/parameters", response_model=list[WaterParameterOut])
def list_parameters(tank_id: str, limit: int = 50, db: Session = Depends(get_db)):
    return (db.query(WaterParameter).filter_by(tank_id=tank_id)
            .order_by(WaterParameter.recorded_at.desc()).limit(limit).all())

@router.post("/{tank_id}/parameters", response_model=WaterParameterOut, status_code=201)
def log_parameters(tank_id: str, body: WaterParameterCreate, db: Session = Depends(get_db)):
    log = WaterParameter(tank_id=tank_id, **body.model_dump())
    db.add(log); db.flush()
    alert_service.check_and_create_alerts(db, tank_id, log)
    db.commit(); db.refresh(log)
    return log
