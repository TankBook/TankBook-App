from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Group, GroupMembership, User
from app.services.auth import get_current_user


def user_group_ids(db: Session, user_id: str) -> set[str]:
    return {r[0] for r in db.query(GroupMembership.group_id).filter_by(user_id=user_id).all()}


def can_access(resource, user_id: str, group_ids: set[str]) -> bool:
    """Shared access rule for every group-aware resource: owner_id, or the resource's
    group_id is one the caller belongs to. Group membership is uniform full access —
    no separate view/edit tier, unlike per-tank TankShare."""
    return resource.owner_id == user_id or (resource.group_id is not None and resource.group_id in group_ids)


def require_group_member(group_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Group:
    """FastAPI dependency — 404s (not 403, so we don't confirm another user's group exists)
    unless the current user belongs to `group_id`."""
    group = (
        db.query(Group)
        .join(GroupMembership, GroupMembership.group_id == Group.id)
        .filter(Group.id == group_id, GroupMembership.user_id == user.id)
        .first()
    )
    if not group:
        raise HTTPException(404, "Group not found")
    return group


def require_group_owner(group_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Group:
    """Like require_group_member, but only for the group's owner — renaming, deleting,
    and managing membership stay owner-only."""
    membership = db.query(GroupMembership).filter_by(group_id=group_id, user_id=user.id).first()
    if not membership or membership.role != "owner":
        raise HTTPException(404, "Group not found")
    group = db.query(Group).filter_by(id=group_id).first()
    if not group:
        raise HTTPException(404, "Group not found")
    return group
