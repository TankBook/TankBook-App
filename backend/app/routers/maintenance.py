from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import MaintenanceTask
from app.schemas.schemas import MaintenanceTaskCreate, MaintenanceTaskOut

router = APIRouter()

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def next_occurrence(from_date: datetime, day_of_week: int, every_weeks: int) -> datetime:
    """Calculate the next due date for a recurring task."""
    days_ahead = day_of_week - from_date.weekday()
    if days_ahead <= 0:
        days_ahead += 7
    next_date = from_date + timedelta(days=days_ahead)
    # If more than 1 week interval, add the extra weeks
    if every_weeks > 1:
        next_date += timedelta(weeks=every_weeks - 1)
    return next_date.replace(hour=0, minute=0, second=0, microsecond=0)


@router.get("/{tank_id}/maintenance", response_model=list[MaintenanceTaskOut])
def list_tasks(tank_id: str, db: Session = Depends(get_db)):
    return (db.query(MaintenanceTask).filter_by(tank_id=tank_id)
            .order_by(MaintenanceTask.due_at.asc()).all())


@router.post("/{tank_id}/maintenance", response_model=MaintenanceTaskOut, status_code=201)
def create_task(tank_id: str, body: MaintenanceTaskCreate, db: Session = Depends(get_db)):
    data = body.model_dump()
    # If recurring, calculate first due date based on day_of_week
    if data.get('is_recurring') and data.get('recur_day_of_week') is not None:
        data['due_at'] = next_occurrence(
            datetime.utcnow(),
            data['recur_day_of_week'],
            data.get('recur_every_weeks') or 1
        )
    task = MaintenanceTask(tank_id=tank_id, **data)
    db.add(task); db.commit(); db.refresh(task)
    return task


@router.patch("/{tank_id}/maintenance/{task_id}/complete", response_model=MaintenanceTaskOut)
def complete_task(tank_id: str, task_id: str, db: Session = Depends(get_db)):
    task = db.query(MaintenanceTask).filter_by(id=task_id, tank_id=tank_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    task.completed_at = datetime.utcnow()
    task.status = "done"

    # Spawn next occurrence if recurring
    if task.is_recurring and task.recur_day_of_week is not None:
        next_due = next_occurrence(
            datetime.utcnow(),
            task.recur_day_of_week,
            task.recur_every_weeks or 1
        )
        next_task = MaintenanceTask(
            tank_id=tank_id,
            task_type=task.task_type,
            description=task.description,
            due_at=next_due,
            is_recurring=True,
            recur_every_weeks=task.recur_every_weeks,
            recur_day_of_week=task.recur_day_of_week,
            parent_task_id=task.id,
        )
        db.add(next_task)

    db.commit(); db.refresh(task)
    return task


@router.delete("/{tank_id}/maintenance/{task_id}", status_code=204)
def delete_task(tank_id: str, task_id: str, db: Session = Depends(get_db)):
    task = db.query(MaintenanceTask).filter_by(id=task_id, tank_id=tank_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    db.delete(task); db.commit()
