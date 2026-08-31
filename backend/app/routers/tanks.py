from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.models import Tank, User
from app.schemas.schemas import TankCreate, TankOut
from app.services.auth import get_current_user
from app.services.ownership import require_owned_tank

router = APIRouter()


@router.get("/", response_model=list[TankOut])
def list_tanks(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Tank).filter_by(owner_id=user.id).order_by(Tank.sort_order, Tank.created_at).all()


@router.patch("/reorder")
def reorder_tanks(order: list[dict], db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    for item in order:
        db.query(Tank).filter_by(id=item["id"], owner_id=user.id).update({"sort_order": item["sort_order"]})
    db.commit()
    return {"ok": True}


@router.post("/", response_model=TankOut, status_code=201)
def create_tank(body: TankCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    count = db.query(func.count(Tank.id)).filter_by(owner_id=user.id).scalar() or 0
    tank = Tank(**body.model_dump(), sort_order=count, owner_id=user.id)
    db.add(tank)
    db.commit()
    db.refresh(tank)
    return tank


@router.get("/{tank_id}", response_model=TankOut)
def get_tank(tank: Tank = Depends(require_owned_tank)):
    return tank


@router.patch("/{tank_id}", response_model=TankOut)
def update_tank(body: TankCreate, db: Session = Depends(get_db), tank: Tank = Depends(require_owned_tank)):
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(tank, k, v)
    db.commit()
    db.refresh(tank)
    return tank


@router.delete("/{tank_id}", status_code=204)
def delete_tank(db: Session = Depends(get_db), tank: Tank = Depends(require_owned_tank)):
    db.delete(tank)
    db.commit()
