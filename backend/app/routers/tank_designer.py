import json
from datetime import datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import TankDesign

router = APIRouter()


class DesignSave(BaseModel):
    cells: list[dict]


@router.get("/{tank_id}/design")
def get_design(tank_id: str, db: Session = Depends(get_db)):
    d = db.query(TankDesign).filter_by(tank_id=tank_id).first()
    return {"cells": json.loads(d.cells) if d else []}


@router.put("/{tank_id}/design")
def save_design(tank_id: str, body: DesignSave, db: Session = Depends(get_db)):
    d = db.query(TankDesign).filter_by(tank_id=tank_id).first()
    cells_json = json.dumps(body.cells)
    if d:
        d.cells = cells_json
        d.updated_at = datetime.utcnow()
    else:
        d = TankDesign(tank_id=tank_id, cells=cells_json)
        db.add(d)
    db.commit()
    return {"ok": True}
