from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Tank
from app.schemas.schemas import TankCreate, TankOut

router = APIRouter()


@router.get("/", response_model=list[TankOut])
def list_tanks(db: Session = Depends(get_db)):
    return db.query(Tank).all()


@router.post("/", response_model=TankOut, status_code=201)
def create_tank(body: TankCreate, db: Session = Depends(get_db)):
    tank = Tank(**body.model_dump())
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
