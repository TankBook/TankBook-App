from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import TankPlant
from app.schemas.schemas import TankPlantCreate, TankPlantUpdate, TankPlantOut
from app.services.species import species_service

router = APIRouter()

VALID_STATUSES = {"planned", "planted", "removed"}


def _enrich(row: TankPlant) -> dict:
    species = species_service.get(row.species_slug) or {}
    return {
        "id": row.id,
        "tank_id": row.tank_id,
        "species_slug": row.species_slug,
        "quantity": row.quantity,
        "plant_status": row.plant_status,
        "added_at": row.added_at,
        "notes": row.notes,
        "common_name": species.get("common_name"),
        "latin_name": species.get("latin_name"),
    }


@router.get("/{tank_id}/plants", response_model=list[TankPlantOut])
def list_plants(tank_id: str, db: Session = Depends(get_db)):
    return [_enrich(row) for row in db.query(TankPlant).filter_by(tank_id=tank_id).all()]


@router.post("/{tank_id}/plants", response_model=TankPlantOut, status_code=201)
def add_plant(tank_id: str, body: TankPlantCreate, db: Session = Depends(get_db)):
    if not species_service.validate_slug(body.species_slug):
        raise HTTPException(422, f"Unknown species slug: {body.species_slug}")
    row = TankPlant(tank_id=tank_id, **body.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return _enrich(row)


@router.patch("/{tank_id}/plants/{plant_id}", response_model=TankPlantOut)
def update_plant(tank_id: str, plant_id: str, body: TankPlantUpdate, db: Session = Depends(get_db)):
    row = db.query(TankPlant).filter_by(id=plant_id, tank_id=tank_id).first()
    if not row:
        raise HTTPException(404, "Plant entry not found")
    data = body.model_dump(exclude_unset=True)
    if "plant_status" in data and data["plant_status"] not in VALID_STATUSES:
        data.pop("plant_status")
    for k, v in data.items():
        setattr(row, k, v)
    db.commit(); db.refresh(row)
    return _enrich(row)


@router.delete("/{tank_id}/plants/{plant_id}", status_code=204)
def remove_plant(tank_id: str, plant_id: str, db: Session = Depends(get_db)):
    row = db.query(TankPlant).filter_by(id=plant_id, tank_id=tank_id).first()
    if not row:
        raise HTTPException(404, "Plant entry not found")
    db.delete(row); db.commit()
