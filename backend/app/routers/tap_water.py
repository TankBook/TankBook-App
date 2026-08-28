from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import TapWaterTest
from app.schemas.schemas import TapWaterTestCreate, TapWaterTestOut

router = APIRouter()


@router.get("/", response_model=list[TapWaterTestOut])
def list_tap_water_tests(limit: int = 50, db: Session = Depends(get_db)):
    return (db.query(TapWaterTest)
            .order_by(TapWaterTest.recorded_at.desc()).limit(limit).all())


@router.post("/", response_model=TapWaterTestOut, status_code=201)
def log_tap_water_test(body: TapWaterTestCreate, db: Session = Depends(get_db)):
    test = TapWaterTest(**body.model_dump())
    db.add(test)
    db.commit(); db.refresh(test)
    return test
