from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import TankFish
from app.schemas.schemas import TankFishCreate, TankFishOut, TankFishUpdate
from app.services.species import species_service

router = APIRouter()


def _enrich(row: TankFish) -> dict:
    species = species_service.get(row.species_slug) or {}
    return {
        "id": row.id,
        "tank_id": row.tank_id,
        "species_slug": row.species_slug,
        "quantity": row.quantity,
        "fish_status": row.fish_status,
        "health_status": row.health_status,
        "notes": row.notes,
        "added_at": row.added_at,
        "common_name": species.get("common_name"),
        "latin_name": species.get("latin_name"),
    }


@router.get("/{tank_id}/fish")
def list_fish(tank_id: str, db: Session = Depends(get_db)):
    return [_enrich(row) for row in db.query(TankFish).filter_by(tank_id=tank_id).all()]


@router.post("/{tank_id}/fish", status_code=201)
def add_fish(tank_id: str, body: TankFishCreate, db: Session = Depends(get_db)):
    if not species_service.validate_slug(body.species_slug):
        raise HTTPException(422, f"Unknown species slug: {body.species_slug}")
    row = TankFish(tank_id=tank_id, **body.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return _enrich(row)


@router.patch("/{tank_id}/fish/{fish_id}")
def update_fish(tank_id: str, fish_id: str, body: TankFishUpdate, db: Session = Depends(get_db)):
    row = db.query(TankFish).filter_by(id=fish_id, tank_id=tank_id).first()
    if not row:
        raise HTTPException(404, "Fish entry not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(row, field, value)
    db.commit(); db.refresh(row)
    return _enrich(row)


@router.delete("/{tank_id}/fish/{fish_id}", status_code=204)
def remove_fish(tank_id: str, fish_id: str, db: Session = Depends(get_db)):
    row = db.query(TankFish).filter_by(id=fish_id, tank_id=tank_id).first()
    if not row: raise HTTPException(404, "Fish entry not found")
    db.delete(row); db.commit()
