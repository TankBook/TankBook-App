import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import AppSettings
from app.schemas.schemas import AppSettingsOut, AppSettingsUpdate, SettingsStatsOut
from app.routers.images import IMAGES_PATH
from app.services.species import species_service

router = APIRouter()


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
    if "feeding_amount_presets" in data:
        presets = data.pop("feeding_amount_presets")
        settings.feeding_amount_presets_json = json.dumps(presets) if presets else None
    for k, v in data.items():
        setattr(settings, k, v)
    db.commit()
    db.refresh(settings)
    return settings


@router.get("/stats", response_model=SettingsStatsOut)
def get_settings_stats():
    storage_bytes = 0
    if IMAGES_PATH.exists():
        for path in IMAGES_PATH.rglob("*"):
            if path.is_file():
                storage_bytes += path.stat().st_size

    # "Images saved" refers specifically to tank gallery photos, not the
    # species reference images under IMAGES_PATH/species.
    gallery_dir = IMAGES_PATH / "tanks"
    image_count = sum(1 for p in gallery_dir.rglob("*") if p.is_file()) if gallery_dir.exists() else 0

    return {
        "species_count": species_service.count(),
        "image_count": image_count,
        "storage_bytes": storage_bytes,
    }
