from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Permission, User
from app.services.auth import get_current_user

PERMISSION_KEYS = ["ai", "general", "users"]
DEFAULT_LEVELS = {"ai": "edit", "general": "edit", "users": "edit"}
LEVEL_RANK = {"none": 0, "use": 1, "edit": 2}


def get_level(db: Session, user_id: str, key: str) -> str:
    row = db.query(Permission).filter_by(user_id=user_id, key=key).first()
    return row.level if row else DEFAULT_LEVELS.get(key, "none")


def get_all_for_user(db: Session, user_id: str) -> dict[str, str]:
    rows = {r.key: r.level for r in db.query(Permission).filter_by(user_id=user_id).all()}
    return {key: rows.get(key, DEFAULT_LEVELS.get(key, "none")) for key in PERMISSION_KEYS}


def set_level(db: Session, user_id: str, key: str, level: str) -> None:
    row = db.query(Permission).filter_by(user_id=user_id, key=key).first()
    if not row:
        row = Permission(user_id=user_id, key=key, level=level)
        db.add(row)
    else:
        row.level = level
    db.commit()


def has_at_least(db: Session, user_id: str, key: str, required: str) -> bool:
    return LEVEL_RANK[get_level(db, user_id, key)] >= LEVEL_RANK[required]


def require_permission(key: str, required: str):
    """FastAPI dependency factory — 403s if the current user is below `required` for `key`."""
    def dependency(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
        if not has_at_least(db, user.id, key, required):
            raise HTTPException(403, f"You don't have permission to {required} {key}.")
        return user
    return dependency
