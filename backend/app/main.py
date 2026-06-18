from contextlib import asynccontextmanager
from pathlib import Path
import os

from fastapi import FastAPI, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.routers import tanks, fish, plants, parameters, alerts, species, maintenance, settings, daily_tasks, journal, backup, images, spending
from app.services.species import species_service
from app.database import get_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    species_service.load()
    yield


app = FastAPI(
    title="TankBook API",
    version="0.5.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.include_router(tanks.router, prefix="/api/tanks", tags=["tanks"])
app.include_router(fish.router, prefix="/api/fish", tags=["fish"])
app.include_router(plants.router, prefix="/api/plants", tags=["plants"])
app.include_router(parameters.router, prefix="/api/parameters", tags=["parameters"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["alerts"])
app.include_router(species.router, prefix="/api/species", tags=["species"])
app.include_router(maintenance.router, prefix="/api/tanks", tags=["maintenance"])
app.include_router(daily_tasks.router, prefix="/api/tanks", tags=["daily_tasks"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])
app.include_router(journal.router, prefix="/api/tanks", tags=["journal"])
app.include_router(backup.router, prefix="/api/backup", tags=["backup"])
app.include_router(images.router, prefix="/api/images", tags=["images"])
app.include_router(spending.router, prefix="/api", tags=["spending"])


@app.get("/api/tanks/{tank_id}/compatibility")
def check_compatibility(tank_id: str, slug: str, db=Depends(get_db)):
    """Check if a species slug is compatible with existing fish in a tank."""
    from app.models.models import TankFish
    incoming = species_service.get(slug)
    if not incoming:
        return {"warnings": [], "errors": [f"Unknown species: {slug}"]}

    existing_fish = db.query(TankFish).filter_by(tank_id=tank_id).all()
    warnings = []
    for row in existing_fish:
        existing = species_service.get(row.species_slug)
        if not existing:
            continue
        compat = incoming.get("compatibility", {})
        incompat_list = compat.get("incompatible_with", [])
        if existing["slug"] in incompat_list:
            warnings.append(f"{incoming['common_name']} is incompatible with {existing['common_name']} already in this tank.")
        existing_incompat = existing.get("compatibility", {}).get("incompatible_with", [])
        if incoming["slug"] in existing_incompat:
            warnings.append(f"{existing['common_name']} (already in tank) is incompatible with {incoming['common_name']}.")

    return {"warnings": list(set(warnings)), "errors": []}


@app.get("/api/health")
def health():
    return {"status": "ok", "species_loaded": species_service.count()}


@app.get("/api/dashboard")
def dashboard_stats(db=Depends(get_db)):
    from app.models.models import Tank, TankFish, TankPlant, WaterParameter, MaintenanceTask, Alert
    from sqlalchemy import func
    from datetime import datetime

    tanks = db.query(Tank).all()
    tank_ids = [t.id for t in tanks]

    fish_count = db.query(func.sum(TankFish.quantity)).filter(TankFish.tank_id.in_(tank_ids)).scalar() or 0
    plant_count = db.query(func.sum(TankPlant.quantity)).filter(TankPlant.tank_id.in_(tank_ids)).scalar() or 0
    species_count = db.query(func.count(func.distinct(TankFish.species_slug))).filter(TankFish.tank_id.in_(tank_ids)).scalar() or 0
    unack_alerts = db.query(Alert).filter(Alert.tank_id.in_(tank_ids), Alert.acknowledged == False).count()
    overdue_tasks = db.query(MaintenanceTask).filter(
        MaintenanceTask.tank_id.in_(tank_ids),
        MaintenanceTask.status == "pending",
        MaintenanceTask.due_at < datetime.utcnow()
    ).count()
    upcoming_tasks = db.query(MaintenanceTask).filter(
        MaintenanceTask.tank_id.in_(tank_ids),
        MaintenanceTask.status == "pending",
        MaintenanceTask.due_at >= datetime.utcnow()
    ).order_by(MaintenanceTask.due_at.asc()).limit(5).all()

    tank_summaries = []
    for tank in tanks:
        latest = db.query(WaterParameter).filter_by(tank_id=tank.id).order_by(WaterParameter.recorded_at.desc()).first()
        fish = db.query(TankFish).filter_by(tank_id=tank.id).all()
        plants = db.query(TankPlant).filter_by(tank_id=tank.id).all()
        tank_alerts = db.query(Alert).filter_by(tank_id=tank.id, acknowledged=False).count()
        tank_overdue = db.query(MaintenanceTask).filter(
            MaintenanceTask.tank_id == tank.id,
            MaintenanceTask.status == "pending",
            MaintenanceTask.due_at < datetime.utcnow()
        ).count()
        tank_summaries.append({
            "id": tank.id,
            "name": tank.name,
            "volume_litres": tank.volume_litres,
            "water_type": tank.water_type,
            "co2_injection": tank.co2_injection,
            "substrate": tank.substrate,
            "fish_count": sum(f.quantity for f in fish if f.organism_type == "fish"),
            "fish_species": len([f for f in fish if f.organism_type == "fish"]),
            "invertebrate_count": sum(f.quantity for f in fish if f.organism_type == "invertebrate"),
            "invertebrate_species": len([f for f in fish if f.organism_type == "invertebrate"]),
            "amphibian_count": sum(f.quantity for f in fish if f.organism_type == "amphibian"),
            "amphibian_species": len([f for f in fish if f.organism_type == "amphibian"]),
            "plant_species": len(plants),
            "unack_alerts": tank_alerts,
            "overdue_tasks": tank_overdue,
            "latest_ph": latest.ph if latest else None,
            "latest_temp": latest.temperature_c if latest else None,
            "latest_ammonia": latest.ammonia_ppm if latest else None,
            "latest_nitrite": latest.nitrite_ppm if latest else None,
            "latest_nitrate": latest.nitrate_ppm if latest else None,
            "latest_recorded": latest.recorded_at.isoformat() if latest else None,
        })

    return {
        "total_tanks": len(tanks),
        "total_fish": fish_count,
        "total_species": species_count,
        "total_plants": plant_count,
        "unack_alerts": unack_alerts,
        "overdue_tasks": overdue_tasks,
        "upcoming_tasks": [
            {
                "id": t.id, "tank_id": t.tank_id, "task_type": t.task_type,
                "description": t.description, "due_at": t.due_at.isoformat(),
                "is_recurring": t.is_recurring,
            } for t in upcoming_tasks
        ],
        "tanks": tank_summaries,
    }


# Serve the bundled frontend — must come after all API routes
_static = Path("/app/static")
if _static.is_dir():
    app.mount("/assets", StaticFiles(directory=_static / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        candidate = _static / full_path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(_static / "index.html")
