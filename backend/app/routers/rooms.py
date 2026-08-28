from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Room, RoomTankPosition, Tank
from app.schemas.schemas import RoomCreate, RoomUpdate, RoomOut, RoomTankPositionOut, RoomTankPositionUpsert

router = APIRouter()


@router.get("/", response_model=list[RoomOut])
def list_rooms(db: Session = Depends(get_db)):
    return db.query(Room).order_by(Room.created_at).all()


@router.post("/", status_code=201, response_model=RoomOut)
def create_room(body: RoomCreate, db: Session = Depends(get_db)):
    row = Room(**body.model_dump())
    db.add(row)
    db.commit(); db.refresh(row)
    return row


@router.patch("/{room_id}", response_model=RoomOut)
def update_room(room_id: str, body: RoomUpdate, db: Session = Depends(get_db)):
    row = db.query(Room).filter_by(id=room_id).first()
    if not row:
        raise HTTPException(404, "Room not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(row, field, value)
    db.commit(); db.refresh(row)
    return row


@router.delete("/{room_id}", status_code=204)
def delete_room(room_id: str, db: Session = Depends(get_db)):
    row = db.query(Room).filter_by(id=room_id).first()
    if not row:
        raise HTTPException(404, "Room not found")
    db.delete(row); db.commit()


@router.put("/tank-positions/{tank_id}", response_model=RoomTankPositionOut)
def set_tank_position(tank_id: str, body: RoomTankPositionUpsert, db: Session = Depends(get_db)):
    if not db.query(Tank).filter_by(id=tank_id).first():
        raise HTTPException(404, "Tank not found")
    if not db.query(Room).filter_by(id=body.room_id).first():
        raise HTTPException(404, "Room not found")
    row = db.query(RoomTankPosition).filter_by(tank_id=tank_id).first()
    if row:
        row.room_id = body.room_id
        row.x = body.x
        row.y = body.y
    else:
        row = RoomTankPosition(tank_id=tank_id, room_id=body.room_id, x=body.x, y=body.y)
        db.add(row)
    db.commit(); db.refresh(row)
    return row


@router.delete("/tank-positions/{tank_id}", status_code=204)
def unassign_tank(tank_id: str, db: Session = Depends(get_db)):
    row = db.query(RoomTankPosition).filter_by(tank_id=tank_id).first()
    if row:
        db.delete(row); db.commit()
