from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Room, RoomTankPosition, Tank, TankShare, User
from app.schemas.schemas import RoomCreate, RoomUpdate, RoomOut, RoomTankPositionOut, RoomTankPositionUpsert
from app.services.auth import get_current_user
from app.services.ownership import require_tank_view, require_tank_edit
from app.services.groups import user_group_ids, can_access

router = APIRouter()


def _validate_group_id(db: Session, user: User, group_id: str | None) -> None:
    if group_id is not None and group_id not in user_group_ids(db, user.id):
        raise HTTPException(404, "Group not found")


def _require_room(room_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Room:
    room = db.query(Room).filter_by(id=room_id).first()
    if not room or not can_access(room, user.id, user_group_ids(db, user.id)):
        raise HTTPException(404, "Room not found")
    return room


def _accessible_tank_ids(db: Session, user: User) -> set[str]:
    owned = {t.id for t in db.query(Tank.id).filter_by(owner_id=user.id).all()}
    shared = {r.tank_id for r in db.query(TankShare.tank_id).filter_by(user_id=user.id).all()}
    group_ids = user_group_ids(db, user.id)
    grouped = {t.id for t in db.query(Tank.id).filter(Tank.group_id.in_(group_ids)).all()} if group_ids else set()
    return owned | shared | grouped


def _to_out(room: Room, accessible_tank_ids: set[str]) -> RoomOut:
    # Same room can hold tanks placed by different owners/groups — never show a position
    # for a tank the caller themselves can't access, even though they can see the room.
    return RoomOut(
        id=room.id, name=room.name, width_m=room.width_m, length_m=room.length_m,
        owner_id=room.owner_id, group_id=room.group_id,
        tank_positions=[p for p in room.tank_positions if p.tank_id in accessible_tank_ids],
    )


@router.get("/", response_model=list[RoomOut])
def list_rooms(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    group_ids = user_group_ids(db, user.id)
    accessible_tank_ids = _accessible_tank_ids(db, user)
    rooms = db.query(Room).filter(
        (Room.owner_id == user.id) | (Room.group_id.in_(group_ids) if group_ids else False)
    ).order_by(Room.created_at).all()
    return [_to_out(room, accessible_tank_ids) for room in rooms]


@router.post("/", status_code=201, response_model=RoomOut)
def create_room(body: RoomCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _validate_group_id(db, user, body.group_id)
    row = Room(**body.model_dump(), owner_id=user.id)
    db.add(row)
    db.commit(); db.refresh(row)
    return _to_out(row, _accessible_tank_ids(db, user))


@router.patch("/{room_id}", response_model=RoomOut)
def update_room(body: RoomUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user), row: Room = Depends(_require_room)):
    data = body.model_dump(exclude_none=True)
    if "group_id" in data:
        _validate_group_id(db, user, data["group_id"])
    for field, value in data.items():
        setattr(row, field, value)
    db.commit(); db.refresh(row)
    return _to_out(row, _accessible_tank_ids(db, user))


@router.delete("/{room_id}", status_code=204)
def delete_room(db: Session = Depends(get_db), row: Room = Depends(_require_room)):
    db.delete(row); db.commit()


@router.put("/tank-positions/{tank_id}", response_model=RoomTankPositionOut)
def set_tank_position(tank_id: str, body: RoomTankPositionUpsert, db: Session = Depends(get_db), user: User = Depends(get_current_user), _tank: Tank = Depends(require_tank_edit)):
    room = db.query(Room).filter_by(id=body.room_id).first()
    if not room or not can_access(room, user.id, user_group_ids(db, user.id)):
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
def unassign_tank(tank_id: str, db: Session = Depends(get_db), _tank: Tank = Depends(require_tank_edit)):
    row = db.query(RoomTankPosition).filter_by(tank_id=tank_id).first()
    if row:
        db.delete(row); db.commit()
