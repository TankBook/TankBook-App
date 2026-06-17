from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import JournalEntry, TankFish
from app.schemas.schemas import JournalEntryCreate, JournalEntryUpdate, JournalEntryOut
from app.services.species import species_service

router = APIRouter()


def _enrich(entry: JournalEntry, db: Session) -> dict:
    common_name = None
    species_slug = None
    if entry.tank_fish_id:
        fish = db.query(TankFish).filter_by(id=entry.tank_fish_id).first()
        if fish:
            species_slug = fish.species_slug
            species = species_service.get(fish.species_slug) or {}
            common_name = species.get("common_name")
    return {
        "id": entry.id,
        "tank_id": entry.tank_id,
        "tank_fish_id": entry.tank_fish_id,
        "event_type": entry.event_type,
        "notes": entry.notes,
        "occurred_at": entry.occurred_at,
        "created_at": entry.created_at,
        "common_name": common_name,
        "species_slug": species_slug,
    }


@router.get("/{tank_id}/journal", response_model=list[JournalEntryOut])
def list_journal(tank_id: str, db: Session = Depends(get_db)):
    entries = (
        db.query(JournalEntry)
        .filter_by(tank_id=tank_id)
        .order_by(JournalEntry.occurred_at.desc())
        .all()
    )
    return [_enrich(e, db) for e in entries]


@router.post("/{tank_id}/journal", status_code=201)
def add_journal(tank_id: str, body: JournalEntryCreate, db: Session = Depends(get_db)):
    if body.tank_fish_id:
        fish = db.query(TankFish).filter_by(id=body.tank_fish_id, tank_id=tank_id).first()
        if not fish:
            raise HTTPException(404, "Fish entry not found in this tank")
    data = body.model_dump()
    if data.get("occurred_at") is None:
        data["occurred_at"] = datetime.utcnow()
    entry = JournalEntry(tank_id=tank_id, **data)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return _enrich(entry, db)


@router.patch("/{tank_id}/journal/{entry_id}")
def update_journal(tank_id: str, entry_id: str, body: JournalEntryUpdate, db: Session = Depends(get_db)):
    entry = db.query(JournalEntry).filter_by(id=entry_id, tank_id=tank_id).first()
    if not entry:
        raise HTTPException(404, "Journal entry not found")
    if body.tank_fish_id is not None:
        if body.tank_fish_id != "" and not db.query(TankFish).filter_by(id=body.tank_fish_id, tank_id=tank_id).first():
            raise HTTPException(404, "Fish entry not found in this tank")
        entry.tank_fish_id = body.tank_fish_id or None
    if body.event_type is not None:
        entry.event_type = body.event_type
    if body.notes is not None:
        entry.notes = body.notes
    if body.occurred_at is not None:
        entry.occurred_at = body.occurred_at
    db.commit()
    db.refresh(entry)
    return _enrich(entry, db)


@router.delete("/{tank_id}/journal/{entry_id}", status_code=204)
def delete_journal(tank_id: str, entry_id: str, db: Session = Depends(get_db)):
    entry = db.query(JournalEntry).filter_by(id=entry_id, tank_id=tank_id).first()
    if not entry:
        raise HTTPException(404, "Journal entry not found")
    db.delete(entry)
    db.commit()
