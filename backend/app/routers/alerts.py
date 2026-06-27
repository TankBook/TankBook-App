from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Alert, AppSettings
from app.schemas.schemas import AlertOut

router = APIRouter()


def _purge_old_alerts(db: Session):
    row = db.query(AppSettings).filter_by(id="default").first()
    if not row or row.alert_retention_days is None:
        return
    cutoff = datetime.utcnow() - timedelta(days=row.alert_retention_days)
    db.query(Alert).filter(Alert.triggered_at < cutoff).delete()
    db.commit()


@router.get("/{tank_id}/alerts", response_model=list[AlertOut])
def list_alerts(tank_id: str, unacknowledged_only: bool = False, db: Session = Depends(get_db)):
    _purge_old_alerts(db)
    q = db.query(Alert).filter_by(tank_id=tank_id)
    if unacknowledged_only:
        q = q.filter_by(acknowledged=False)
    return q.order_by(Alert.triggered_at.desc()).all()


@router.patch("/{tank_id}/alerts/{alert_id}/acknowledge", response_model=AlertOut)
def acknowledge_alert(tank_id: str, alert_id: str, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter_by(id=alert_id, tank_id=tank_id).first()
    if not alert:
        raise HTTPException(404, "Alert not found")
    alert.acknowledged = True
    db.commit(); db.refresh(alert)
    return alert


@router.delete("/{tank_id}/alerts/{alert_id}", status_code=204)
def delete_alert(tank_id: str, alert_id: str, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter_by(id=alert_id, tank_id=tank_id).first()
    if not alert:
        raise HTTPException(404, "Alert not found")
    db.delete(alert); db.commit()
