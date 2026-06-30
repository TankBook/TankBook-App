from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import InventoryItem, Expense
from app.schemas.schemas import (
    InventoryItemCreate, InventoryItemUpdate, InventoryItemOut,
    InventoryAdjust, InventoryRestock,
)

router = APIRouter()


@router.get("/", response_model=list[InventoryItemOut])
def list_inventory(db: Session = Depends(get_db)):
    return db.query(InventoryItem).order_by(InventoryItem.category, InventoryItem.name).all()


@router.post("/", status_code=201, response_model=InventoryItemOut)
def create_item(body: InventoryItemCreate, db: Session = Depends(get_db)):
    row = InventoryItem(**body.model_dump())
    db.add(row)
    db.commit(); db.refresh(row)
    return row


@router.patch("/{item_id}", response_model=InventoryItemOut)
def update_item(item_id: str, body: InventoryItemUpdate, db: Session = Depends(get_db)):
    row = db.query(InventoryItem).filter_by(id=item_id).first()
    if not row:
        raise HTTPException(404, "Inventory item not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(row, field, value)
    db.commit(); db.refresh(row)
    return row


@router.delete("/{item_id}", status_code=204)
def delete_item(item_id: str, db: Session = Depends(get_db)):
    row = db.query(InventoryItem).filter_by(id=item_id).first()
    if not row:
        raise HTTPException(404, "Inventory item not found")
    db.delete(row); db.commit()


@router.patch("/{item_id}/adjust", response_model=InventoryItemOut)
def adjust_item(item_id: str, body: InventoryAdjust, db: Session = Depends(get_db)):
    row = db.query(InventoryItem).filter_by(id=item_id).first()
    if not row:
        raise HTTPException(404, "Inventory item not found")
    row.quantity = max(0, row.quantity + body.delta)
    db.commit(); db.refresh(row)
    return row


@router.post("/{item_id}/restock", response_model=InventoryItemOut)
def restock_item(item_id: str, body: InventoryRestock, db: Session = Depends(get_db)):
    row = db.query(InventoryItem).filter_by(id=item_id).first()
    if not row:
        raise HTTPException(404, "Inventory item not found")
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
        ))
    db.commit(); db.refresh(row)
    return row
