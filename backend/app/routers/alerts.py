from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Alert
from app.schemas.schemas import AlertOut

router = APIRouter()

@router.get("/{tank_id}/alerts", response_model=list[AlertOut])
def list_alerts(tank_id: str, unacknowledged_only: bool = False, db: Session = Depends(get_db)):
    q = db.query(Alert).filter_by(tank_id=tank_id)
    if unacknowledged_only:
        q = q.filter_by(acknowledged=False)
    return q.order_by(Alert.triggered_at.desc()).all()

@router.patch("/{tank_id}/alerts/{alert_id}/acknowledge", response_model=AlertOut)
def acknowledge_alert(tank_id: str, alert_id: str, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter_by(id=alert_id, tank_id=tank_id).first()
    if not alert: raise HTTPException(404, "Alert not found")
    alert.acknowledged = True
    db.commit(); db.refresh(alert)
    return alert
