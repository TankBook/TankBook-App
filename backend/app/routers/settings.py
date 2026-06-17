from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import AppSettings
from app.schemas.schemas import AppSettingsOut, AppSettingsUpdate

router = APIRouter()

VALID_DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]
VALID_UNIT_SYSTEMS = ["mm", "cm", "m"]


def get_or_create_settings(db: Session) -> AppSettings:
    settings = db.query(AppSettings).filter_by(id="default").first()
    if not settings:
        settings = AppSettings(id="default")
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.get("/", response_model=AppSettingsOut)
def get_settings(db: Session = Depends(get_db)):
    return get_or_create_settings(db)


@router.patch("/", response_model=AppSettingsOut)
def update_settings(body: AppSettingsUpdate, db: Session = Depends(get_db)):
    settings = get_or_create_settings(db)
    data = body.model_dump(exclude_unset=True)
    if "date_format" in data and data["date_format"] not in VALID_DATE_FORMATS:
        data.pop("date_format")
    if "unit_system" in data and data["unit_system"] not in VALID_UNIT_SYSTEMS:
        data.pop("unit_system")
    for k, v in data.items():
        setattr(settings, k, v)
    db.commit()
    db.refresh(settings)
    return settings
