from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import (
    Tank, TankFish, TankPlant, WaterParameter, MaintenanceTask,
    Alert, DailyTask, JournalEntry, AppSettings,
)

router = APIRouter()

BACKUP_VERSION = 1


def _dt(dt: datetime | None) -> str | None:
    return dt.isoformat() if dt else None


def _parse_dt(s: str | None) -> datetime | None:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s)
    except (ValueError, TypeError):
        return None


@router.get("/export")
def export_backup(db: Session = Depends(get_db)):
    settings = db.query(AppSettings).filter_by(id="default").first()

    tanks_out = []
    for tank in db.query(Tank).all():
        fish = db.query(TankFish).filter_by(tank_id=tank.id).all()
        plants = db.query(TankPlant).filter_by(tank_id=tank.id).all()
        parameters = db.query(WaterParameter).filter_by(tank_id=tank.id).all()
        tasks = db.query(MaintenanceTask).filter_by(tank_id=tank.id).all()
        alerts = db.query(Alert).filter_by(tank_id=tank.id).all()
        daily_tasks = db.query(DailyTask).filter_by(tank_id=tank.id).all()
        journal = db.query(JournalEntry).filter_by(tank_id=tank.id).all()

        tanks_out.append({
            "id": tank.id, "name": tank.name, "volume_litres": tank.volume_litres,
            "substrate": tank.substrate, "lighting": tank.lighting,
            "filter_flow_lph": tank.filter_flow_lph,
            "width_mm": tank.width_mm, "height_mm": tank.height_mm, "depth_mm": tank.depth_mm,
            "co2_injection": tank.co2_injection,
            "has_heater": tank.has_heater, "heater_watts": tank.heater_watts,
            "setup_date": _dt(tank.setup_date), "created_at": _dt(tank.created_at),
            "fish": [{"id": r.id, "species_slug": r.species_slug, "quantity": r.quantity,
                      "organism_type": r.organism_type, "fish_status": r.fish_status,
                      "health_status": r.health_status, "notes": r.notes, "added_at": _dt(r.added_at)}
                     for r in fish],
            "plants": [{"id": r.id, "species_slug": r.species_slug, "quantity": r.quantity,
                        "notes": r.notes, "added_at": _dt(r.added_at)}
                       for r in plants],
            "parameters": [{"id": r.id, "ph": r.ph, "ammonia_ppm": r.ammonia_ppm,
                             "nitrite_ppm": r.nitrite_ppm, "nitrate_ppm": r.nitrate_ppm,
                             "temperature_c": r.temperature_c, "gh_dgh": r.gh_dgh, "kh_dkh": r.kh_dkh,
                             "notes": r.notes, "recorded_at": _dt(r.recorded_at)}
                            for r in parameters],
            "maintenance_tasks": [{"id": r.id, "task_type": r.task_type, "description": r.description,
                                    "due_at": _dt(r.due_at), "completed_at": _dt(r.completed_at),
                                    "status": r.status, "is_recurring": r.is_recurring,
                                    "recur_every_weeks": r.recur_every_weeks,
                                    "recur_day_of_week": r.recur_day_of_week,
                                    "parent_task_id": r.parent_task_id}
                                   for r in tasks],
            "alerts": [{"id": r.id, "parameter_log_id": r.parameter_log_id, "alert_type": r.alert_type,
                        "message": r.message, "severity": r.severity, "acknowledged": r.acknowledged,
                        "triggered_at": _dt(r.triggered_at)}
                       for r in alerts],
            "daily_tasks": [{"id": r.id, "name": r.name, "hour": r.hour, "minute": r.minute,
                              "days": r.days, "color": r.color}
                             for r in daily_tasks],
            "journal_entries": [{"id": r.id, "tank_fish_id": r.tank_fish_id, "event_type": r.event_type,
                                  "notes": r.notes, "occurred_at": _dt(r.occurred_at),
                                  "created_at": _dt(r.created_at)}
                                 for r in journal],
        })

    return {
        "exported_at": datetime.utcnow().isoformat(),
        "version": BACKUP_VERSION,
        "settings": {
            "date_format": settings.date_format if settings else "DD/MM/YYYY",
            "unit_system": settings.unit_system if settings else "cm",
        },
        "tanks": tanks_out,
    }


@router.post("/import")
def import_backup(payload: dict, db: Session = Depends(get_db)):
    if payload.get("version") != BACKUP_VERSION:
        raise HTTPException(400, f"Unsupported backup version: {payload.get('version')}. Expected {BACKUP_VERSION}.")

    # Wipe existing data — ORM delete cascades all children
    for tank in db.query(Tank).all():
        db.delete(tank)
    db.commit()

    # Restore settings
    src_settings = payload.get("settings", {})
    s = db.query(AppSettings).filter_by(id="default").first()
    if not s:
        s = AppSettings(id="default")
        db.add(s)
    s.date_format = src_settings.get("date_format", "DD/MM/YYYY")
    s.unit_system = src_settings.get("unit_system", "cm")
    db.commit()

    tanks_restored = 0
    for t in payload.get("tanks", []):
        tank = Tank(
            id=t["id"], name=t["name"], volume_litres=t["volume_litres"],
            substrate=t.get("substrate"), lighting=t.get("lighting"),
            filter_flow_lph=t.get("filter_flow_lph"),
            width_mm=t.get("width_mm"), height_mm=t.get("height_mm"), depth_mm=t.get("depth_mm"),
            co2_injection=t.get("co2_injection", False),
            has_heater=t.get("has_heater", False), heater_watts=t.get("heater_watts"),
            setup_date=_parse_dt(t.get("setup_date")),
            created_at=_parse_dt(t.get("created_at")) or datetime.utcnow(),
        )
        db.add(tank)
        db.flush()

        # Fish — flush so journal entries can reference IDs
        for f in t.get("fish", []):
            db.add(TankFish(
                id=f["id"], tank_id=tank.id, species_slug=f["species_slug"],
                quantity=f["quantity"], organism_type=f.get("organism_type", "fish"),
                fish_status=f.get("fish_status", "added"), health_status=f.get("health_status", "healthy"),
                notes=f.get("notes"), added_at=_parse_dt(f.get("added_at")) or datetime.utcnow(),
            ))
        db.flush()

        for p in t.get("plants", []):
            db.add(TankPlant(
                id=p["id"], tank_id=tank.id, species_slug=p["species_slug"],
                quantity=p["quantity"], notes=p.get("notes"),
                added_at=_parse_dt(p.get("added_at")) or datetime.utcnow(),
            ))

        # Parameters — flush so alerts can reference IDs
        for p in t.get("parameters", []):
            db.add(WaterParameter(
                id=p["id"], tank_id=tank.id, ph=p.get("ph"), ammonia_ppm=p.get("ammonia_ppm"),
                nitrite_ppm=p.get("nitrite_ppm"), nitrate_ppm=p.get("nitrate_ppm"),
                temperature_c=p.get("temperature_c"), gh_dgh=p.get("gh_dgh"), kh_dkh=p.get("kh_dkh"),
                notes=p.get("notes"), recorded_at=_parse_dt(p.get("recorded_at")) or datetime.utcnow(),
            ))
        db.flush()

        # Maintenance tasks — two passes to handle self-referencing parent_task_id
        parent_links: list[tuple[str, str]] = []
        for task in t.get("maintenance_tasks", []):
            db.add(MaintenanceTask(
                id=task["id"], tank_id=tank.id, task_type=task["task_type"],
                description=task.get("description"), due_at=_parse_dt(task["due_at"]) or datetime.utcnow(),
                completed_at=_parse_dt(task.get("completed_at")), status=task.get("status", "pending"),
                is_recurring=task.get("is_recurring", False),
                recur_every_weeks=task.get("recur_every_weeks"), recur_day_of_week=task.get("recur_day_of_week"),
            ))
            if task.get("parent_task_id"):
                parent_links.append((task["id"], task["parent_task_id"]))
        db.flush()
        for task_id, parent_id in parent_links:
            db.query(MaintenanceTask).filter_by(id=task_id).update({"parent_task_id": parent_id})

        for a in t.get("alerts", []):
            db.add(Alert(
                id=a["id"], tank_id=tank.id, parameter_log_id=a.get("parameter_log_id"),
                alert_type=a["alert_type"], message=a["message"], severity=a.get("severity", "warning"),
                acknowledged=a.get("acknowledged", False),
                triggered_at=_parse_dt(a.get("triggered_at")) or datetime.utcnow(),
            ))

        for d in t.get("daily_tasks", []):
            db.add(DailyTask(
                id=d["id"], tank_id=tank.id, name=d["name"],
                hour=d["hour"], minute=d.get("minute", 0), days=d["days"], color=d.get("color"),
            ))

        for j in t.get("journal_entries", []):
            db.add(JournalEntry(
                id=j["id"], tank_id=tank.id, tank_fish_id=j.get("tank_fish_id"),
                event_type=j["event_type"], notes=j["notes"],
                occurred_at=_parse_dt(j.get("occurred_at")) or datetime.utcnow(),
                created_at=_parse_dt(j.get("created_at")) or datetime.utcnow(),
            ))

        tanks_restored += 1

    db.commit()
    return {"ok": True, "tanks_restored": tanks_restored}
