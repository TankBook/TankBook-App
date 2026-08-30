from datetime import datetime
from sqlalchemy.orm import Session

from app.models.models import Tank, TankFish, TankPlant, WaterParameter, Alert, JournalEntry, MaintenanceTask, TapWaterTest
from app.services.species import species_service, check_compatibility as _check_compatibility


def _iso(dt: datetime | None) -> str | None:
    return dt.isoformat() if dt else None


def list_tanks(db: Session) -> dict:
    tanks = db.query(Tank).order_by(Tank.sort_order, Tank.created_at).all()
    return {"tanks": [
        {
            "id": t.id, "name": t.name, "volume_litres": t.volume_litres, "water_type": t.water_type,
            "has_filter": t.has_filter, "has_heater": t.has_heater, "co2_injection": t.co2_injection,
            "setup_date": _iso(t.setup_date),
        }
        for t in tanks
    ]}


def get_tank(db: Session, tank_id: str) -> dict:
    tank = db.query(Tank).filter_by(id=tank_id).first()
    if not tank:
        return {"error": f"No tank with id {tank_id}"}
    fish = db.query(TankFish).filter_by(tank_id=tank_id).all()
    plants = db.query(TankPlant).filter_by(tank_id=tank_id).all()
    return {
        "id": tank.id, "name": tank.name, "volume_litres": tank.volume_litres,
        "water_type": tank.water_type, "substrate": tank.substrate, "lighting": tank.lighting,
        "has_filter": tank.has_filter, "filter_flow_lph": tank.filter_flow_lph,
        "has_heater": tank.has_heater, "heater_watts": tank.heater_watts,
        "co2_injection": tank.co2_injection, "co2_method": tank.co2_method,
        "setup_date": _iso(tank.setup_date),
        "fish": [
            {
                "species_slug": f.species_slug, "quantity": f.quantity, "organism_type": f.organism_type,
                "fish_status": f.fish_status, "health_status": f.health_status, "notes": f.notes,
            }
            for f in fish
        ],
        "plants": [
            {"species_slug": p.species_slug, "quantity": p.quantity, "plant_status": p.plant_status, "notes": p.notes}
            for p in plants
        ],
    }


def get_water_parameters(db: Session, tank_id: str, limit: int = 30) -> dict:
    limit = max(1, min(limit, 100))
    rows = (db.query(WaterParameter).filter_by(tank_id=tank_id)
            .order_by(WaterParameter.recorded_at.desc()).limit(limit).all())
    return {"readings": [
        {
            "recorded_at": _iso(r.recorded_at), "ph": r.ph, "ammonia_ppm": r.ammonia_ppm,
            "nitrite_ppm": r.nitrite_ppm, "nitrate_ppm": r.nitrate_ppm, "temperature_c": r.temperature_c,
            "gh_dgh": r.gh_dgh, "kh_dkh": r.kh_dkh, "salinity_ppt": r.salinity_ppt,
            "specific_gravity": r.specific_gravity, "notes": r.notes,
        }
        for r in rows
    ]}


def get_alerts(db: Session, tank_id: str | None = None, unacknowledged_only: bool = True) -> dict:
    q = db.query(Alert)
    if tank_id:
        q = q.filter_by(tank_id=tank_id)
    if unacknowledged_only:
        q = q.filter_by(acknowledged=False)
    rows = q.order_by(Alert.triggered_at.desc()).limit(50).all()
    return {"alerts": [
        {
            "tank_id": a.tank_id, "alert_type": a.alert_type, "message": a.message,
            "severity": a.severity, "acknowledged": a.acknowledged, "triggered_at": _iso(a.triggered_at),
        }
        for a in rows
    ]}


def get_journal_entries(db: Session, tank_id: str, limit: int = 20) -> dict:
    limit = max(1, min(limit, 100))
    rows = (db.query(JournalEntry).filter_by(tank_id=tank_id)
            .order_by(JournalEntry.occurred_at.desc()).limit(limit).all())
    return {"entries": [
        {"event_type": e.event_type, "notes": e.notes, "occurred_at": _iso(e.occurred_at)}
        for e in rows
    ]}


def get_maintenance_tasks(db: Session, tank_id: str | None = None, include_completed: bool = False) -> dict:
    q = db.query(MaintenanceTask)
    if tank_id:
        q = q.filter_by(tank_id=tank_id)
    if not include_completed:
        q = q.filter(MaintenanceTask.status != "done")
    rows = q.order_by(MaintenanceTask.due_at.asc()).limit(50).all()
    return {"tasks": [
        {
            "tank_id": t.tank_id, "task_type": t.task_type, "description": t.description,
            "due_at": _iso(t.due_at), "status": t.status, "is_recurring": t.is_recurring,
        }
        for t in rows
    ]}


def get_species(db: Session, slug: str) -> dict:
    species = species_service.get(slug)
    if not species:
        return {"error": f"No species found for slug {slug}"}
    return species


def check_compatibility(db: Session, tank_id: str, slug: str) -> dict:
    return _check_compatibility(db, tank_id, slug)


def get_tap_water_tests(db: Session, limit: int = 10) -> dict:
    limit = max(1, min(limit, 50))
    rows = db.query(TapWaterTest).order_by(TapWaterTest.recorded_at.desc()).limit(limit).all()
    return {"tests": [
        {
            "recorded_at": _iso(r.recorded_at), "ph": r.ph, "gh_dgh": r.gh_dgh, "kh_dkh": r.kh_dkh,
            "chlorine_ppm": r.chlorine_ppm, "nitrate_ppm": r.nitrate_ppm, "tds_ppm": r.tds_ppm,
        }
        for r in rows
    ]}


TOOL_FUNCTIONS = {
    "list_tanks": list_tanks,
    "get_tank": get_tank,
    "get_water_parameters": get_water_parameters,
    "get_alerts": get_alerts,
    "get_journal_entries": get_journal_entries,
    "get_maintenance_tasks": get_maintenance_tasks,
    "get_species": get_species,
    "check_compatibility": check_compatibility,
    "get_tap_water_tests": get_tap_water_tests,
}

TOOL_SCHEMAS = [
    {
        "name": "list_tanks",
        "description": "List all tanks with their basic configuration.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "get_tank",
        "description": "Get full detail for one tank, including its current fish and plants.",
        "parameters": {
            "type": "object",
            "properties": {"tank_id": {"type": "string"}},
            "required": ["tank_id"],
        },
    },
    {
        "name": "get_water_parameters",
        "description": "Get recent water parameter readings (pH, ammonia, nitrite, nitrate, temperature, "
                       "GH, KH, salinity) for a tank, most recent first.",
        "parameters": {
            "type": "object",
            "properties": {
                "tank_id": {"type": "string"},
                "limit": {"type": "integer", "description": "Max readings to return, default 30, max 100"},
            },
            "required": ["tank_id"],
        },
    },
    {
        "name": "get_alerts",
        "description": "Get alerts, optionally scoped to one tank, optionally only unacknowledged ones.",
        "parameters": {
            "type": "object",
            "properties": {
                "tank_id": {"type": "string", "description": "Optional tank id to filter by"},
                "unacknowledged_only": {"type": "boolean", "description": "Default true"},
            },
            "required": [],
        },
    },
    {
        "name": "get_journal_entries",
        "description": "Get the journal/event log for a tank (observations, illness, treatments, deaths, "
                       "etc), most recent first.",
        "parameters": {
            "type": "object",
            "properties": {
                "tank_id": {"type": "string"},
                "limit": {"type": "integer", "description": "Max entries to return, default 20, max 100"},
            },
            "required": ["tank_id"],
        },
    },
    {
        "name": "get_maintenance_tasks",
        "description": "Get maintenance tasks (water changes, filter cleaning, etc), optionally scoped to one tank.",
        "parameters": {
            "type": "object",
            "properties": {
                "tank_id": {"type": "string"},
                "include_completed": {"type": "boolean", "description": "Default false"},
            },
            "required": [],
        },
    },
    {
        "name": "get_species",
        "description": "Look up care data (temperature/pH range, temperament, diet, compatibility) for a "
                       "species by its slug.",
        "parameters": {
            "type": "object",
            "properties": {"slug": {"type": "string"}},
            "required": ["slug"],
        },
    },
    {
        "name": "check_compatibility",
        "description": "Check whether a species is compatible with the fish/inverts already stocked in a given tank.",
        "parameters": {
            "type": "object",
            "properties": {"tank_id": {"type": "string"}, "slug": {"type": "string"}},
            "required": ["tank_id", "slug"],
        },
    },
    {
        "name": "get_tap_water_tests",
        "description": "Get recent results from the app's 'Tap Water' section — test readings for the "
                       "household tap/source water supply (pH, GH, KH, chlorine, nitrate, TDS). This is "
                       "not tied to any specific tank; check it when diagnosing tank water quality issues, "
                       "since source water is a common root cause.",
        "parameters": {
            "type": "object",
            "properties": {"limit": {"type": "integer", "description": "Default 10, max 50"}},
            "required": [],
        },
    },
]


def execute_tool(db: Session, name: str, arguments: dict) -> dict:
    func = TOOL_FUNCTIONS.get(name)
    if not func:
        return {"error": f"Unknown tool: {name}"}
    try:
        return func(db, **arguments)
    except TypeError as e:
        return {"error": f"Invalid arguments for {name}: {e}"}
