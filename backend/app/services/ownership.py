from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Tank, User
from app.services.auth import get_current_user


def require_owned_tank(tank_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Tank:
    """FastAPI dependency — 404s (not 403, so we don't confirm another user's tank
    exists) unless `tank_id` belongs to the current user. FastAPI resolves `tank_id`
    from the enclosing route's path param automatically."""
    tank = db.query(Tank).filter_by(id=tank_id, owner_id=user.id).first()
    if not tank:
        raise HTTPException(404, "Tank not found")
    return tank
