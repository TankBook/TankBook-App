from contextlib import asynccontextmanager
import asyncio
import contextlib
from pathlib import Path
import os
import secrets

from fastapi import FastAPI, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.middleware.sessions import SessionMiddleware

from app.routers import tanks, fish, plants, parameters, alerts, species, maintenance, settings, daily_tasks, journal, backup, images, spending, inventory, rooms, tap_water, agent, auth, push, health_cases
from app.services.species import species_service, check_compatibility
from app.services.auth import get_current_user
from app.services.push import notification_loop
from app.database import get_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    species_service.load()
    sweep_task = asyncio.create_task(notification_loop())
    yield
    sweep_task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await sweep_task


app = FastAPI(
    title="TankBook API",
    version="0.7.2",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# Only used to hold the short-lived OIDC state/nonce during the login redirect round-trip —
# unrelated to the app's own session cookie, which is a DB-backed opaque token (see services/auth.py).
app.add_middleware(
    SessionMiddleware,
    secret_key=os.environ.get("SECRET_KEY") or secrets.token_hex(32),
    session_cookie="tankbook_oauth_state",
)

authenticated = [Depends(get_current_user)]

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(tanks.router, prefix="/api/tanks", tags=["tanks"], dependencies=authenticated)
app.include_router(fish.router, prefix="/api/fish", tags=["fish"], dependencies=authenticated)
app.include_router(plants.router, prefix="/api/plants", tags=["plants"], dependencies=authenticated)
app.include_router(parameters.router, prefix="/api/parameters", tags=["parameters"], dependencies=authenticated)
app.include_router(alerts.router, prefix="/api/alerts", tags=["alerts"], dependencies=authenticated)
app.include_router(species.router, prefix="/api/species", tags=["species"], dependencies=authenticated)
app.include_router(maintenance.router, prefix="/api/tanks", tags=["maintenance"], dependencies=authenticated)
app.include_router(daily_tasks.router, prefix="/api/tanks", tags=["daily_tasks"], dependencies=authenticated)
app.include_router(settings.router, prefix="/api/settings", tags=["settings"], dependencies=authenticated)
app.include_router(journal.router, prefix="/api/tanks", tags=["journal"], dependencies=authenticated)
app.include_router(health_cases.router, prefix="/api/tanks", tags=["health_cases"], dependencies=authenticated)
app.include_router(backup.router, prefix="/api/backup", tags=["backup"], dependencies=authenticated)
app.include_router(images.router, prefix="/api/images", tags=["images"], dependencies=authenticated)
app.include_router(spending.router, prefix="/api", tags=["spending"], dependencies=authenticated)
app.include_router(inventory.router, prefix="/api/inventory", tags=["inventory"], dependencies=authenticated)
app.include_router(rooms.router, prefix="/api/rooms", tags=["rooms"], dependencies=authenticated)
app.include_router(tap_water.router, prefix="/api/tap-water", tags=["tap_water"], dependencies=authenticated)
app.include_router(agent.router, prefix="/api/agent", tags=["agent"], dependencies=authenticated)
app.include_router(push.router, prefix="/api/push", tags=["push"], dependencies=authenticated)


@app.get("/api/tanks/{tank_id}/compatibility")
def get_compatibility(tank_id: str, slug: str, db=Depends(get_db), _user=Depends(get_current_user)):
    return check_compatibility(db, tank_id, slug)


@app.get("/api/health")
def health():
    return {"status": "ok", "species_loaded": species_service.count()}


@app.get("/api/dashboard")
def dashboard_stats(db=Depends(get_db), _user=Depends(get_current_user)):
    from app.models.models import Tank, TankFish, TankPlant, WaterParameter, MaintenanceTask, Alert
    from sqlalchemy import func
    from datetime import datetime

    tanks = db.query(Tank).order_by(Tank.sort_order, Tank.created_at).all()
    tank_ids = [t.id for t in tanks]

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    fish_count = db.query(func.sum(TankFish.quantity)).filter(TankFish.tank_id.in_(tank_ids), TankFish.fish_status == "added").scalar() or 0
    plant_count = db.query(func.sum(TankPlant.quantity)).filter(TankPlant.tank_id.in_(tank_ids)).scalar() or 0
    species_count = db.query(func.count(func.distinct(TankFish.species_slug))).filter(TankFish.tank_id.in_(tank_ids), TankFish.fish_status == "added").scalar() or 0
    unack_alerts = db.query(Alert).filter(Alert.tank_id.in_(tank_ids), Alert.acknowledged == False).count()
    overdue_tasks = db.query(MaintenanceTask).filter(
        MaintenanceTask.tank_id.in_(tank_ids),
        MaintenanceTask.status == "pending",
        MaintenanceTask.due_at < today_start
    ).count()
    upcoming_tasks = db.query(MaintenanceTask).filter(
        MaintenanceTask.tank_id.in_(tank_ids),
        MaintenanceTask.status == "pending",
        MaintenanceTask.due_at >= today_start
    ).order_by(MaintenanceTask.due_at.asc()).limit(5).all()

    tank_summaries = []
    for tank in tanks:
        latest = db.query(WaterParameter).filter_by(tank_id=tank.id).order_by(WaterParameter.recorded_at.desc()).first()
        fish = db.query(TankFish).filter_by(tank_id=tank.id, fish_status="added").all()
        plants = db.query(TankPlant).filter_by(tank_id=tank.id).all()
        tank_alerts = db.query(Alert).filter_by(tank_id=tank.id, acknowledged=False).count()
        tank_overdue = db.query(MaintenanceTask).filter(
            MaintenanceTask.tank_id == tank.id,
            MaintenanceTask.status == "pending",
            MaintenanceTask.due_at < today_start
        ).count()
        tank_summaries.append({
            "id": tank.id,
            "name": tank.name,
            "volume_litres": tank.volume_litres,
            "water_type": tank.water_type,
            "co2_injection": tank.co2_injection,
            "has_heater": tank.has_heater,
            "filter_flow_lph": tank.filter_flow_lph,
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
                "is_recurring": t.is_recurring, "recur_every_weeks": t.recur_every_weeks,
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
