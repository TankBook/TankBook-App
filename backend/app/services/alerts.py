from sqlalchemy.orm import Session
from app.models.models import Alert, TankFish, WaterParameter
from app.services.species import species_service


PARAM_CHECKS = [
    ("ph", "ph", "pH"),
    ("temperature_c", "temp_c", "Temperature"),
    ("ammonia_ppm", None, "Ammonia"),   # any ammonia > 0 is bad
    ("nitrite_ppm", None, "Nitrite"),
]

DANGER_THRESHOLDS = {
    "ammonia_ppm": 0.25,
    "nitrite_ppm": 0.5,
    "nitrate_ppm": 40.0,
}


def check_and_create_alerts(db: Session, tank_id: str, log: WaterParameter) -> list[Alert]:
    fish_rows = db.query(TankFish).filter_by(tank_id=tank_id).all()
    created = []

    seen_slugs: set[str] = set()
    for fish_row in fish_rows:
        if fish_row.fish_status != 'added':
            continue
        if fish_row.species_slug in seen_slugs:
            continue
        seen_slugs.add(fish_row.species_slug)
        species = species_service.get(fish_row.species_slug)
        if not species:
            continue
        water = species.get("water", {})

        # pH range check
        if log.ph is not None:
            ph_range = water.get("ph", {})
            if ph_range.get("min") and log.ph < ph_range["min"]:
                created.append(_make_alert(db, tank_id, log, "ph_low",
                    f"pH {log.ph} is below minimum {ph_range['min']} for {species['common_name']}", "warning"))
            elif ph_range.get("max") and log.ph > ph_range["max"]:
                created.append(_make_alert(db, tank_id, log, "ph_high",
                    f"pH {log.ph} exceeds maximum {ph_range['max']} for {species['common_name']}", "warning"))

        # Temperature range check
        if log.temperature_c is not None:
            temp_range = water.get("temp_c", {})
            if temp_range.get("min") and log.temperature_c < temp_range["min"]:
                created.append(_make_alert(db, tank_id, log, "temp_low",
                    f"Temperature {log.temperature_c}°C below minimum {temp_range['min']}°C for {species['common_name']}", "warning"))
            elif temp_range.get("max") and log.temperature_c > temp_range["max"]:
                created.append(_make_alert(db, tank_id, log, "temp_high",
                    f"Temperature {log.temperature_c}°C above maximum {temp_range['max']}°C for {species['common_name']}", "danger"))

    # Absolute danger thresholds (independent of species)
    for field, threshold in DANGER_THRESHOLDS.items():
        value = getattr(log, field, None)
        if value is not None and value > threshold:
            created.append(_make_alert(db, tank_id, log, field,
                f"{field.replace('_', ' ').title()} at {value} — above safe limit of {threshold}", "danger"))

    db.commit()
    return created


def _make_alert(db, tank_id, log, alert_type, message, severity) -> Alert:
    alert = Alert(
        tank_id=tank_id,
        parameter_log_id=log.id,
        alert_type=alert_type,
        message=message,
        severity=severity,
    )
    db.add(alert)
    return alert
