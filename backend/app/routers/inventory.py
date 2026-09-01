from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import InventoryItem, Expense, User
from app.schemas.schemas import (
    InventoryItemCreate, InventoryItemUpdate, InventoryItemOut,
    InventoryAdjust, InventoryRestock,
)
from app.services.auth import get_current_user
from app.services.groups import user_group_ids, can_access

router = APIRouter()


def _require_item(item_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> InventoryItem:
    item = db.query(InventoryItem).filter_by(id=item_id).first()
    if not item or not can_access(item, user.id, user_group_ids(db, user.id)):
        raise HTTPException(404, "Inventory item not found")
    return item


def _validate_group_id(db: Session, user: User, group_id: str | None) -> None:
    if group_id is not None and group_id not in user_group_ids(db, user.id):
        raise HTTPException(404, "Group not found")


@router.get("/", response_model=list[InventoryItemOut])
def list_inventory(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    group_ids = user_group_ids(db, user.id)
    q = db.query(InventoryItem).filter(
        (InventoryItem.owner_id == user.id) | (InventoryItem.group_id.in_(group_ids) if group_ids else False)
    )
    return q.order_by(InventoryItem.category, InventoryItem.name).all()


@router.post("/", status_code=201, response_model=InventoryItemOut)
def create_item(body: InventoryItemCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _validate_group_id(db, user, body.group_id)
    row = InventoryItem(**body.model_dump(), owner_id=user.id)
    db.add(row)
    db.commit(); db.refresh(row)
    return row


@router.patch("/{item_id}", response_model=InventoryItemOut)
def update_item(body: InventoryItemUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user), row: InventoryItem = Depends(_require_item)):
    data = body.model_dump(exclude_none=True)
    if "group_id" in data:
        _validate_group_id(db, user, data["group_id"])
    for field, value in data.items():
        setattr(row, field, value)
    db.commit(); db.refresh(row)
    return row


@router.delete("/{item_id}", status_code=204)
def delete_item(db: Session = Depends(get_db), row: InventoryItem = Depends(_require_item)):
    db.delete(row); db.commit()


@router.patch("/{item_id}/adjust", response_model=InventoryItemOut)
def adjust_item(body: InventoryAdjust, db: Session = Depends(get_db), row: InventoryItem = Depends(_require_item)):
    row.quantity = max(0, row.quantity + body.delta)
    db.commit(); db.refresh(row)
    return row


@router.post("/{item_id}/restock", response_model=InventoryItemOut)
def restock_item(body: InventoryRestock, db: Session = Depends(get_db), user: User = Depends(get_current_user), row: InventoryItem = Depends(_require_item)):
    if body.quantity <= 0:
        raise HTTPException(422, "Restock quantity must be positive")
    row.quantity += body.quantity
    if body.amount is not None:
        db.add(Expense(
            inventory_item_id=row.id,
            amount=body.amount,
            category=row.category,
            description=row.name,
            purchase_date=body.purchase_date or date.today().isoformat(),
            owner_id=user.id,
            group_id=row.group_id,
        ))
    db.commit(); db.refresh(row)
    return row
