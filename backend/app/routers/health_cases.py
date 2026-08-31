from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import HealthCase, TankFish
from app.schemas.schemas import HealthCaseCreate, HealthCaseUpdate, HealthCaseOut
from app.services.species import species_service

router = APIRouter()


def _enrich(case: HealthCase, db: Session) -> dict:
    common_name = None
    species_slug = None
    if case.tank_fish_id:
        fish = db.query(TankFish).filter_by(id=case.tank_fish_id).first()
        if fish:
            species_slug = fish.species_slug
            species = species_service.get(fish.species_slug) or {}
            common_name = species.get("common_name")
    return {
        "id": case.id,
        "tank_id": case.tank_id,
        "tank_fish_id": case.tank_fish_id,
        "title": case.title,
        "status": case.status,
        "started_at": case.started_at,
        "treatment": case.treatment,
        "resolved_at": case.resolved_at,
        "created_at": case.created_at,
        "common_name": common_name,
        "species_slug": species_slug,
    }


@router.get("/{tank_id}/health-cases", response_model=list[HealthCaseOut])
def list_health_cases(tank_id: str, db: Session = Depends(get_db)):
    cases = (
        db.query(HealthCase)
        .filter_by(tank_id=tank_id)
        .order_by(HealthCase.started_at.desc())
        .all()
    )
    return [_enrich(c, db) for c in cases]


@router.post("/{tank_id}/health-cases", status_code=201)
def add_health_case(tank_id: str, body: HealthCaseCreate, db: Session = Depends(get_db)):
    fish = None
    if body.tank_fish_id:
        fish = db.query(TankFish).filter_by(id=body.tank_fish_id, tank_id=tank_id).first()
        if not fish:
            raise HTTPException(404, "Fish entry not found in this tank")
    data = body.model_dump()
    if data.get("started_at") is None:
        data["started_at"] = datetime.utcnow()
    case = HealthCase(tank_id=tank_id, **data)
    db.add(case)

    if fish and fish.health_status == "healthy":
        fish.health_status = "sick"

    db.commit()
    db.refresh(case)
    return _enrich(case, db)


@router.patch("/{tank_id}/health-cases/{case_id}")
def update_health_case(tank_id: str, case_id: str, body: HealthCaseUpdate, db: Session = Depends(get_db)):
    case = db.query(HealthCase).filter_by(id=case_id, tank_id=tank_id).first()
    if not case:
        raise HTTPException(404, "Case not found")
    if body.tank_fish_id is not None:
        if body.tank_fish_id != "" and not db.query(TankFish).filter_by(id=body.tank_fish_id, tank_id=tank_id).first():
            raise HTTPException(404, "Fish entry not found in this tank")
        case.tank_fish_id = body.tank_fish_id or None
    if body.title is not None:
        case.title = body.title
    if body.started_at is not None:
        case.started_at = body.started_at
    if body.treatment is not None:
        case.treatment = body.treatment
    if body.status is not None and body.status != case.status:
        case.status = body.status
        fish = db.query(TankFish).filter_by(id=case.tank_fish_id).first() if case.tank_fish_id else None
        if body.status == "resolved":
            case.resolved_at = datetime.utcnow()
            if fish and fish.health_status in ("sick", "quarantine"):
                fish.health_status = "healthy"
        elif body.status == "active":
            case.resolved_at = None

    db.commit()
    db.refresh(case)
    return _enrich(case, db)


@router.delete("/{tank_id}/health-cases/{case_id}", status_code=204)
def delete_health_case(tank_id: str, case_id: str, db: Session = Depends(get_db)):
    case = db.query(HealthCase).filter_by(id=case_id, tank_id=tank_id).first()
    if not case:
        raise HTTPException(404, "Case not found")
    db.delete(case)
    db.commit()
