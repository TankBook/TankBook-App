from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import TapWaterTest, User
from app.schemas.schemas import TapWaterTestCreate, TapWaterTestOut
from app.services.auth import get_current_user
from app.services.groups import user_group_ids

router = APIRouter()


@router.get("/", response_model=list[TapWaterTestOut])
def list_tap_water_tests(limit: int = 50, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    group_ids = user_group_ids(db, user.id)
    return (db.query(TapWaterTest)
            .filter((TapWaterTest.owner_id == user.id) | (TapWaterTest.group_id.in_(group_ids) if group_ids else False))
            .order_by(TapWaterTest.recorded_at.desc()).limit(limit).all())


@router.post("/", response_model=TapWaterTestOut, status_code=201)
def log_tap_water_test(body: TapWaterTestCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if body.group_id is not None and body.group_id not in user_group_ids(db, user.id):
        raise HTTPException(404, "Group not found")
    test = TapWaterTest(**body.model_dump(), owner_id=user.id)
    db.add(test)
    db.commit(); db.refresh(test)
    return test
