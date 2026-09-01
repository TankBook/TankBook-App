from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Tank, TankShare, User
from app.services.auth import get_current_user

TANK_LEVEL_RANK = {"view": 1, "edit": 2}


def require_owned_tank(tank_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Tank:
    """FastAPI dependency — 404s (not 403, so we don't confirm another user's tank
    exists) unless `tank_id` belongs to the current user. FastAPI resolves `tank_id`
    from the enclosing route's path param automatically. Deliberately ignores shares —
    for actions that must stay owner-only (delete, managing who has access)."""
    tank = db.query(Tank).filter_by(id=tank_id, owner_id=user.id).first()
    if not tank:
        raise HTTPException(404, "Tank not found")
    return tank


def require_tank_access(min_level: str):
    """FastAPI dependency factory — like require_owned_tank, but also accepts a
    tank shared with the current user at `min_level` or above."""
    def dependency(tank_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Tank:
        tank = db.query(Tank).filter_by(id=tank_id).first()
        if tank and tank.owner_id != user.id:
            share = db.query(TankShare).filter_by(tank_id=tank_id, user_id=user.id).first()
            if not share or TANK_LEVEL_RANK.get(share.level, 0) < TANK_LEVEL_RANK[min_level]:
                tank = None
        if not tank:
            raise HTTPException(404, "Tank not found")
        return tank
    return dependency


require_tank_view = require_tank_access("view")
require_tank_edit = require_tank_access("edit")
