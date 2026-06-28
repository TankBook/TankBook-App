import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Float, Boolean, Text, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def new_uuid() -> str:
    return str(uuid.uuid4())


class Tank(Base):
    __tablename__ = "tanks"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String, nullable=False)
    volume_litres: Mapped[int] = mapped_column(Integer, nullable=False)
    substrate: Mapped[str | None] = mapped_column(String)
    lighting: Mapped[str | None] = mapped_column(String)
    filter_flow_lph: Mapped[int | None] = mapped_column(Integer)
    width_mm: Mapped[int | None] = mapped_column(Integer)
    height_mm: Mapped[int | None] = mapped_column(Integer)
    depth_mm: Mapped[int | None] = mapped_column(Integer)
    water_type: Mapped[str] = mapped_column(String, default="freshwater")
    co2_injection: Mapped[bool] = mapped_column(Boolean, default=False)
    has_heater: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    heater_watts: Mapped[int | None] = mapped_column(Integer)
    setup_date: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    fish: Mapped[list["TankFish"]] = relationship(back_populates="tank", cascade="all, delete-orphan")
    plants: Mapped[list["TankPlant"]] = relationship(back_populates="tank", cascade="all, delete-orphan")
    parameters: Mapped[list["WaterParameter"]] = relationship(back_populates="tank", cascade="all, delete-orphan")
    tasks: Mapped[list["MaintenanceTask"]] = relationship(back_populates="tank", cascade="all, delete-orphan")
    alerts: Mapped[list["Alert"]] = relationship(back_populates="tank", cascade="all, delete-orphan")
    daily_tasks: Mapped[list["DailyTask"]] = relationship(back_populates="tank", cascade="all, delete-orphan")
    journal_entries: Mapped[list["JournalEntry"]] = relationship(back_populates="tank", cascade="all, delete-orphan")


class TankFish(Base):
    __tablename__ = "tank_fish"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    tank_id: Mapped[str] = mapped_column(String, ForeignKey("tanks.id"), nullable=False)
    species_slug: Mapped[str] = mapped_column(String, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    organism_type: Mapped[str] = mapped_column(String, default="fish")
    fish_status: Mapped[str] = mapped_column(String, default="added")
    health_status: Mapped[str] = mapped_column(String, default="healthy")
    food_types: Mapped[str | None] = mapped_column(Text)
    feeding_times_per_day: Mapped[int | None] = mapped_column(Integer)
    added_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    notes: Mapped[str | None] = mapped_column(Text)

    tank: Mapped["Tank"] = relationship(back_populates="fish")


class TankPlant(Base):
    __tablename__ = "tank_plants"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    tank_id: Mapped[str] = mapped_column(String, ForeignKey("tanks.id"), nullable=False)
    species_slug: Mapped[str] = mapped_column(String, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    plant_status: Mapped[str] = mapped_column(String, default="planted")
    added_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    notes: Mapped[str | None] = mapped_column(Text)

    tank: Mapped["Tank"] = relationship(back_populates="plants")


class WaterParameter(Base):
    __tablename__ = "water_parameters"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    tank_id: Mapped[str] = mapped_column(String, ForeignKey("tanks.id"), nullable=False)
    ph: Mapped[float | None] = mapped_column(Float)
    ammonia_ppm: Mapped[float | None] = mapped_column(Float)
    nitrite_ppm: Mapped[float | None] = mapped_column(Float)
    nitrate_ppm: Mapped[float | None] = mapped_column(Float)
    temperature_c: Mapped[float | None] = mapped_column(Float)
    gh_dgh: Mapped[float | None] = mapped_column(Float)
    kh_dkh: Mapped[float | None] = mapped_column(Float)
    salinity_ppt: Mapped[float | None] = mapped_column(Float)
    specific_gravity: Mapped[float | None] = mapped_column(Float)
    recorded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    notes: Mapped[str | None] = mapped_column(Text)

    tank: Mapped["Tank"] = relationship(back_populates="parameters")
    alerts: Mapped[list["Alert"]] = relationship(back_populates="parameter_log")


class MaintenanceTask(Base):
    __tablename__ = "maintenance_tasks"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    tank_id: Mapped[str] = mapped_column(String, ForeignKey("tanks.id"), nullable=False)
    task_type: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    due_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String, default="pending")
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False)
    recur_every_weeks: Mapped[int | None] = mapped_column(Integer)
    recur_day_of_week: Mapped[int | None] = mapped_column(Integer)
    parent_task_id: Mapped[str | None] = mapped_column(String, ForeignKey("maintenance_tasks.id"))

    tank: Mapped["Tank"] = relationship(back_populates="tasks")


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    tank_id: Mapped[str] = mapped_column(String, ForeignKey("tanks.id"), nullable=False)
    parameter_log_id: Mapped[str | None] = mapped_column(String, ForeignKey("water_parameters.id"))
    alert_type: Mapped[str] = mapped_column(String, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String, default="warning")
    acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)
    triggered_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    tank: Mapped["Tank"] = relationship(back_populates="alerts")
    parameter_log: Mapped["WaterParameter | None"] = relationship(back_populates="alerts")


class SpeciesIndex(Base):
    __tablename__ = "species_index"

    slug: Mapped[str] = mapped_column(String, primary_key=True)
    common_name: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)
    temp_min: Mapped[float | None] = mapped_column(Float)
    temp_max: Mapped[float | None] = mapped_column(Float)
    ph_min: Mapped[float | None] = mapped_column(Float)
    ph_max: Mapped[float | None] = mapped_column(Float)
    synced_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DailyTask(Base):
    __tablename__ = "daily_tasks"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    tank_id: Mapped[str] = mapped_column(String, ForeignKey("tanks.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    hour: Mapped[int] = mapped_column(Integer, nullable=False)
    minute: Mapped[int] = mapped_column(Integer, default=0)
    days: Mapped[str] = mapped_column(String, nullable=False)  # comma-separated 0=Mon … 6=Sun
    color: Mapped[str | None] = mapped_column(String)

    tank: Mapped["Tank"] = relationship(back_populates="daily_tasks")


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    tank_id: Mapped[str] = mapped_column(String, ForeignKey("tanks.id"), nullable=False)
    tank_fish_id: Mapped[str | None] = mapped_column(String, ForeignKey("tank_fish.id", ondelete="SET NULL"))
    event_type: Mapped[str] = mapped_column(String, nullable=False)
    notes: Mapped[str] = mapped_column(Text, nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    tank: Mapped["Tank"] = relationship(back_populates="journal_entries")


class AppSettings(Base):
    """Single-row table holding app-wide settings (no auth, so no per-user settings)."""
    __tablename__ = "app_settings"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: "default")
    date_format: Mapped[str] = mapped_column(String, default="DD/MM/YYYY")
    unit_system: Mapped[str] = mapped_column(String, default="cm")
    default_tank_id: Mapped[str | None] = mapped_column(String, nullable=True)
    alert_retention_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    app_url: Mapped[str | None] = mapped_column(String, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    tank_id: Mapped[str | None] = mapped_column(String, ForeignKey("tanks.id", ondelete="SET NULL"), nullable=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String)
    purchase_date: Mapped[str] = mapped_column(String, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
