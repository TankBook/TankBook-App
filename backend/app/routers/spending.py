from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Expense
from app.schemas.schemas import ExpenseCreate, ExpenseOut, ExpenseUpdate

router = APIRouter()


@router.get("/expenses")
def list_expenses(tank_id: str | None = None, db: Session = Depends(get_db)):
    q = db.query(Expense)
    if tank_id:
        q = q.filter_by(tank_id=tank_id)
    return q.order_by(Expense.purchase_date.desc(), Expense.created_at.desc()).all()


@router.post("/expenses", status_code=201)
def add_expense(body: ExpenseCreate, db: Session = Depends(get_db)):
    row = Expense(**body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/expenses/{expense_id}")
def update_expense(expense_id: str, body: ExpenseUpdate, db: Session = Depends(get_db)):
    row = db.query(Expense).filter_by(id=expense_id).first()
    if not row:
        raise HTTPException(404, "Expense not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/expenses/{expense_id}", status_code=204)
def delete_expense(expense_id: str, db: Session = Depends(get_db)):
    row = db.query(Expense).filter_by(id=expense_id).first()
    if not row:
        raise HTTPException(404, "Expense not found")
    db.delete(row)
    db.commit()
