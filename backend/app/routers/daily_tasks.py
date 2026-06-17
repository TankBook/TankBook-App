from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import DailyTask
from app.schemas.schemas import DailyTaskCreate, DailyTaskOut

router = APIRouter()


@router.get("/{tank_id}/daily", response_model=list[DailyTaskOut])
def list_daily_tasks(tank_id: str, db: Session = Depends(get_db)):
    return db.query(DailyTask).filter_by(tank_id=tank_id).order_by(DailyTask.hour, DailyTask.minute).all()


@router.post("/{tank_id}/daily", response_model=DailyTaskOut, status_code=201)
def create_daily_task(tank_id: str, body: DailyTaskCreate, db: Session = Depends(get_db)):
    task = DailyTask(tank_id=tank_id, **body.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{tank_id}/daily/{task_id}", status_code=204)
def delete_daily_task(tank_id: str, task_id: str, db: Session = Depends(get_db)):
    task = db.query(DailyTask).filter_by(id=task_id, tank_id=tank_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    db.delete(task)
    db.commit()
