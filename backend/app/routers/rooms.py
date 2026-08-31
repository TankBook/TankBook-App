from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Room, RoomTankPosition, Tank, User
from app.schemas.schemas import RoomCreate, RoomUpdate, RoomOut, RoomTankPositionOut, RoomTankPositionUpsert
from app.services.auth import get_current_user
from app.services.ownership import require_owned_tank

router = APIRouter()


@router.get("/", response_model=list[RoomOut])
def list_rooms(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    owned_tank_ids = {t.id for t in db.query(Tank.id).filter_by(owner_id=user.id).all()}
    rooms = db.query(Room).order_by(Room.created_at).all()
    return [
        RoomOut(
            id=room.id, name=room.name, width_m=room.width_m, length_m=room.length_m,
            tank_positions=[p for p in room.tank_positions if p.tank_id in owned_tank_ids],
        )
        for room in rooms
    ]


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
def set_tank_position(tank_id: str, body: RoomTankPositionUpsert, db: Session = Depends(get_db), _tank: Tank = Depends(require_owned_tank)):
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
def unassign_tank(tank_id: str, db: Session = Depends(get_db), _tank: Tank = Depends(require_owned_tank)):
    row = db.query(RoomTankPosition).filter_by(tank_id=tank_id).first()
    if row:
        db.delete(row); db.commit()
