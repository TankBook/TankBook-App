from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.models import Tank, TankShare, User
from app.schemas.schemas import TankCreate, TankOut, TankShareCreate, TankShareOut
from app.services.auth import get_current_user
from app.services.ownership import require_owned_tank, require_tank_view, require_tank_edit

router = APIRouter()


def _attach_access(tank: Tank, viewer_id: str, db: Session) -> Tank:
    if tank.owner_id == viewer_id:
        tank.my_access = "owner"
    else:
        share = db.query(TankShare).filter_by(tank_id=tank.id, user_id=viewer_id).first()
        tank.my_access = share.level if share else "view"
    return tank


@router.get("/", response_model=list[TankOut])
def list_tanks(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    owned = db.query(Tank).filter_by(owner_id=user.id).all()
    shared_ids = [r[0] for r in db.query(TankShare.tank_id).filter_by(user_id=user.id).all()]
    shared = db.query(Tank).filter(Tank.id.in_(shared_ids)).all() if shared_ids else []
    tanks = owned + shared
    tanks.sort(key=lambda t: (t.sort_order, t.created_at))
    return [_attach_access(t, user.id, db) for t in tanks]


@router.patch("/reorder")
def reorder_tanks(order: list[dict], db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    # Deliberately owner-only — sort_order is a single field on the tank row, not
    # per-viewer, so a shared collaborator reordering it would move it for the owner too.
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
    tank.my_access = "owner"
    return tank


@router.get("/{tank_id}", response_model=TankOut)
def get_tank(tank_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user), tank: Tank = Depends(require_tank_view)):
    return _attach_access(tank, user.id, db)


@router.patch("/{tank_id}", response_model=TankOut)
def update_tank(body: TankCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user), tank: Tank = Depends(require_tank_edit)):
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(tank, k, v)
    db.commit()
    db.refresh(tank)
    return _attach_access(tank, user.id, db)


@router.delete("/{tank_id}", status_code=204)
def delete_tank(db: Session = Depends(get_db), tank: Tank = Depends(require_owned_tank)):
    db.delete(tank)
    db.commit()


# ── Sharing ──────────────────────────────────────────────────────────────────
# Owner-only throughout (require_owned_tank, not require_tank_edit) — an edit
# collaborator can change tank content but not who else has access to it.

@router.get("/{tank_id}/shares", response_model=list[TankShareOut])
def list_shares(tank_id: str, db: Session = Depends(get_db), _tank: Tank = Depends(require_owned_tank)):
    shares = db.query(TankShare).filter_by(tank_id=tank_id).all()
    return [
        TankShareOut(user_id=s.user_id, email=s.user.email, display_name=s.user.display_name, level=s.level)
        for s in shares
    ]


@router.post("/{tank_id}/shares", response_model=TankShareOut, status_code=201)
def add_share(tank_id: str, body: TankShareCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user), _tank: Tank = Depends(require_owned_tank)):
    email = body.email.strip().lower()
    target = db.query(User).filter_by(email=email).first()
    if not target:
        raise HTTPException(404, "No account found with that email")
    if target.id == user.id:
        raise HTTPException(400, "You already own this tank")

    share = db.query(TankShare).filter_by(tank_id=tank_id, user_id=target.id).first()
    if share:
        share.level = body.level
    else:
        share = TankShare(tank_id=tank_id, user_id=target.id, level=body.level)
        db.add(share)
    db.commit()
    db.refresh(share)
    return TankShareOut(user_id=target.id, email=target.email, display_name=target.display_name, level=share.level)


@router.delete("/{tank_id}/shares/{user_id}", status_code=204)
def remove_share(tank_id: str, user_id: str, db: Session = Depends(get_db), _tank: Tank = Depends(require_owned_tank)):
    share = db.query(TankShare).filter_by(tank_id=tank_id, user_id=user_id).first()
    if not share:
        raise HTTPException(404, "Share not found")
    db.delete(share)
    db.commit()
