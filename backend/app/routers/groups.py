from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Group, GroupMembership, User
from app.schemas.schemas import GroupOut, GroupCreate, GroupUpdate, GroupMemberOut, GroupMemberAdd
from app.services.auth import get_current_user
from app.services.groups import require_group_member, require_group_owner

router = APIRouter()


def _to_out(db: Session, group: Group, viewer_id: str) -> GroupOut:
    memberships = db.query(GroupMembership).filter_by(group_id=group.id).all()
    my_role = next((m.role for m in memberships if m.user_id == viewer_id), "member")
    members = [
        GroupMemberOut(user_id=m.user_id, email=m.user.email, display_name=m.user.display_name, role=m.role)
        for m in memberships
    ]
    return GroupOut(id=group.id, name=group.name, my_role=my_role, members=members)


@router.get("/", response_model=list[GroupOut])
def list_groups(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    memberships = db.query(GroupMembership).filter_by(user_id=user.id).all()
    return [_to_out(db, m.group, user.id) for m in memberships]


@router.post("/", response_model=GroupOut, status_code=201)
def create_group(body: GroupCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    group = Group(name=body.name)
    db.add(group)
    db.commit()
    db.refresh(group)
    db.add(GroupMembership(group_id=group.id, user_id=user.id, role="owner"))
    db.commit()
    return _to_out(db, group, user.id)


@router.patch("/{group_id}", response_model=GroupOut)
def rename_group(group_id: str, body: GroupUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user), group: Group = Depends(require_group_owner)):
    group.name = body.name
    db.commit()
    db.refresh(group)
    return _to_out(db, group, user.id)


@router.delete("/{group_id}", status_code=204)
def delete_group(db: Session = Depends(get_db), group: Group = Depends(require_group_owner)):
    db.delete(group)
    db.commit()


@router.post("/{group_id}/members", response_model=GroupOut, status_code=201)
def add_member(group_id: str, body: GroupMemberAdd, db: Session = Depends(get_db), user: User = Depends(get_current_user), group: Group = Depends(require_group_owner)):
    email = body.email.strip().lower()
    target = db.query(User).filter_by(email=email).first()
    if not target:
        raise HTTPException(404, "No account found with that email")
    if db.query(GroupMembership).filter_by(group_id=group_id, user_id=target.id).first():
        raise HTTPException(400, "That user is already a member of this group")
    db.add(GroupMembership(group_id=group_id, user_id=target.id, role="member"))
    db.commit()
    return _to_out(db, group, user.id)


@router.delete("/{group_id}/members/{user_id}", status_code=204)
def remove_member(group_id: str, user_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user), _group: Group = Depends(require_group_member)):
    actor = db.query(GroupMembership).filter_by(group_id=group_id, user_id=user.id).first()
    target = db.query(GroupMembership).filter_by(group_id=group_id, user_id=user_id).first()
    if not target:
        raise HTTPException(404, "Membership not found")
    if user.id != user_id and actor.role != "owner":
        raise HTTPException(403, "Only the group owner can remove other members")
    if target.role == "owner":
        raise HTTPException(400, "The group owner can't be removed — delete the group instead")
    db.delete(target)
    db.commit()
