from datetime import datetime
from typing import Literal
from pydantic import BaseModel


# --- Tank ---

class TankCreate(BaseModel):
    name: str
    volume_litres: int
    water_type: str = "freshwater"
    substrate: str | None = None
    lighting: str | None = None
    filter_flow_lph: int | None = None
    width_mm: int | None = None
    height_mm: int | None = None
    depth_mm: int | None = None
    co2_injection: bool = False
    has_heater: bool = False
    heater_watts: int | None = None
    setup_date: datetime | None = None


class TankOut(TankCreate):
    id: str
    created_at: datetime
    model_config = {"from_attributes": True}


# --- Fish ---

class TankFishCreate(BaseModel):
    species_slug: str
    quantity: int
    organism_type: str = "fish"
    fish_status: str = "added"
    health_status: str = "healthy"
    food_types: str | None = None
    feeding_times_per_day: int | None = None
    notes: str | None = None


class TankFishUpdate(BaseModel):
    quantity: int | None = None
    organism_type: str | None = None
    fish_status: str | None = None
    health_status: str | None = None
    food_types: str | None = None
    feeding_times_per_day: int | None = None
    notes: str | None = None


class TankFishOut(TankFishCreate):
    id: str
    tank_id: str
    added_at: datetime
    common_name: str | None = None
    latin_name: str | None = None
    model_config = {"from_attributes": True}


# --- Plants ---

class TankPlantCreate(BaseModel):
    species_slug: str
    quantity: int
    notes: str | None = None
    plant_status: str = "planted"


class TankPlantUpdate(BaseModel):
    quantity: int | None = None
    notes: str | None = None
    plant_status: str | None = None


class TankPlantOut(BaseModel):
    id: str
    tank_id: str
    species_slug: str
    quantity: int
    plant_status: str
    added_at: datetime
    notes: str | None = None
    common_name: str | None = None
    latin_name: str | None = None
    model_config = {"from_attributes": True}


# --- Water parameters ---

class WaterParameterCreate(BaseModel):
    ph: float | None = None
    ammonia_ppm: float | None = None
    nitrite_ppm: float | None = None
    nitrate_ppm: float | None = None
    temperature_c: float | None = None
    gh_dgh: float | None = None
    kh_dkh: float | None = None
    salinity_ppt: float | None = None
    specific_gravity: float | None = None
    notes: str | None = None


class WaterParameterOut(WaterParameterCreate):
    id: str
    tank_id: str
    recorded_at: datetime
    model_config = {"from_attributes": True}


# --- Maintenance tasks ---

class MaintenanceTaskCreate(BaseModel):
    task_type: str
    description: str | None = None
    due_at: datetime
    is_recurring: bool = False
    recur_every_weeks: int | None = None
    recur_day_of_week: int | None = None


class MaintenanceTaskOut(MaintenanceTaskCreate):
    id: str
    tank_id: str
    completed_at: datetime | None
    status: str
    parent_task_id: str | None = None
    model_config = {"from_attributes": True}


# --- Alerts ---

class AlertOut(BaseModel):
    id: str
    tank_id: str
    parameter_log_id: str | None
    alert_type: str
    message: str
    severity: str
    acknowledged: bool
    triggered_at: datetime
    model_config = {"from_attributes": True}


# --- Daily tasks ---

class DailyTaskCreate(BaseModel):
    name: str
    hour: int
    minute: int = 0
    days: str  # comma-separated integers 0=Mon … 6=Sun, e.g. "0,1,2,3,4,5,6"
    color: str | None = None


class DailyTaskOut(DailyTaskCreate):
    id: str
    tank_id: str
    model_config = {"from_attributes": True}


# --- Journal ---

class JournalEntryCreate(BaseModel):
    tank_fish_id: str | None = None
    event_type: str
    notes: str
    occurred_at: datetime | None = None


class JournalEntryUpdate(BaseModel):
    tank_fish_id: str | None = None
    event_type: str | None = None
    notes: str | None = None
    occurred_at: datetime | None = None


class JournalEntryOut(BaseModel):
    id: str
    tank_id: str
    tank_fish_id: str | None
    event_type: str
    notes: str
    occurred_at: datetime
    created_at: datetime
    common_name: str | None = None
    species_slug: str | None = None
    model_config = {"from_attributes": True}


# --- App settings ---

class AppSettingsUpdate(BaseModel):
    date_format: str | None = None
    unit_system: str | None = None
    default_tank_id: str | None = None
    alert_retention_days: int | None = None
    app_url: str | None = None


class AppSettingsOut(BaseModel):
    date_format: str
    unit_system: str
    default_tank_id: str | None = None
    alert_retention_days: int | None = None
    app_url: str | None = None
    updated_at: datetime
    model_config = {"from_attributes": True}


# --- Expenses ---

class ExpenseCreate(BaseModel):
    tank_id: str | None = None
    inventory_item_id: str | None = None
    amount: float
    category: str
    description: str | None = None
    purchase_date: str
    notes: str | None = None


class ExpenseUpdate(BaseModel):
    tank_id: str | None = None
    inventory_item_id: str | None = None
    amount: float | None = None
    category: str | None = None
    description: str | None = None
    purchase_date: str | None = None
    notes: str | None = None


class ExpenseOut(ExpenseCreate):
    id: str
    created_at: datetime
    model_config = {"from_attributes": True}


# --- Inventory ---

class InventoryItemCreate(BaseModel):
    name: str
    category: Literal["Food", "Chemicals"]
    quantity: int = 0
    low_stock_threshold: int = 1
    unit_label: str | None = None
    notes: str | None = None


class InventoryItemUpdate(BaseModel):
    name: str | None = None
    category: Literal["Food", "Chemicals"] | None = None
    low_stock_threshold: int | None = None
    unit_label: str | None = None
    notes: str | None = None


class InventoryItemOut(InventoryItemCreate):
    id: str
    created_at: datetime
    model_config = {"from_attributes": True}


class InventoryAdjust(BaseModel):
    delta: int


class InventoryRestock(BaseModel):
    quantity: int
    amount: float | None = None
    purchase_date: str | None = None
