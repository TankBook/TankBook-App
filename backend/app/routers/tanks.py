from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.models import Tank
from app.schemas.schemas import TankCreate, TankOut

router = APIRouter()


@router.get("/", response_model=list[TankOut])
def list_tanks(db: Session = Depends(get_db)):
    return db.query(Tank).order_by(Tank.sort_order, Tank.created_at).all()


@router.patch("/reorder")
def reorder_tanks(order: list[dict], db: Session = Depends(get_db)):
    for item in order:
        db.query(Tank).filter_by(id=item["id"]).update({"sort_order": item["sort_order"]})
    db.commit()
    return {"ok": True}


@router.post("/", response_model=TankOut, status_code=201)
def create_tank(body: TankCreate, db: Session = Depends(get_db)):
    count = db.query(func.count(Tank.id)).scalar() or 0
    tank = Tank(**body.model_dump(), sort_order=count)
    db.add(tank)
    db.commit()
    db.refresh(tank)
    return tank


@router.get("/{tank_id}", response_model=TankOut)
def get_tank(tank_id: str, db: Session = Depends(get_db)):
    tank = db.query(Tank).filter_by(id=tank_id).first()
    if not tank:
        raise HTTPException(404, "Tank not found")
    return tank


@router.patch("/{tank_id}", response_model=TankOut)
def update_tank(tank_id: str, body: TankCreate, db: Session = Depends(get_db)):
    tank = db.query(Tank).filter_by(id=tank_id).first()
    if not tank:
        raise HTTPException(404, "Tank not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(tank, k, v)
    db.commit()
    db.refresh(tank)
    return tank


@router.delete("/{tank_id}", status_code=204)
def delete_tank(tank_id: str, db: Session = Depends(get_db)):
    tank = db.query(Tank).filter_by(id=tank_id).first()
    if not tank:
        raise HTTPException(404, "Tank not found")
    db.delete(tank)
    db.commit()
