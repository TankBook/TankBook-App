from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Expense, Tank, User
from app.schemas.schemas import ExpenseCreate, ExpenseOut, ExpenseUpdate
from app.services.auth import get_current_user
from app.services.groups import user_group_ids, can_access

router = APIRouter()


def _check_owns_tank(db: Session, user: User, tank_id: str | None) -> None:
    if tank_id and not db.query(Tank.id).filter_by(id=tank_id, owner_id=user.id).first():
        raise HTTPException(404, "Tank not found")


def _validate_group_id(db: Session, user: User, group_id: str | None) -> None:
    if group_id is not None and group_id not in user_group_ids(db, user.id):
        raise HTTPException(404, "Group not found")


def _require_expense(expense_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Expense:
    expense = db.query(Expense).filter_by(id=expense_id).first()
    if not expense or not can_access(expense, user.id, user_group_ids(db, user.id)):
        raise HTTPException(404, "Expense not found")
    return expense


@router.get("/expenses")
def list_expenses(tank_id: str | None = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    group_ids = user_group_ids(db, user.id)
    q = db.query(Expense).filter(
        (Expense.owner_id == user.id) | (Expense.group_id.in_(group_ids) if group_ids else False)
    )
    if tank_id:
        q = q.filter_by(tank_id=tank_id)
    return q.order_by(Expense.purchase_date.desc(), Expense.created_at.desc()).all()


@router.post("/expenses", status_code=201)
def add_expense(body: ExpenseCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _check_owns_tank(db, user, body.tank_id)
    _validate_group_id(db, user, body.group_id)
    row = Expense(**body.model_dump(), owner_id=user.id)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/expenses/{expense_id}")
def update_expense(body: ExpenseUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user), row: Expense = Depends(_require_expense)):
    data = body.model_dump(exclude_none=True)
    if "tank_id" in data:
        _check_owns_tank(db, user, data["tank_id"])
    if "group_id" in data:
        _validate_group_id(db, user, data["group_id"])
    for field, value in data.items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/expenses/{expense_id}", status_code=204)
def delete_expense(db: Session = Depends(get_db), row: Expense = Depends(_require_expense)):
    db.delete(row)
    db.commit()
