from datetime import datetime
from typing import Literal
from pydantic import BaseModel


# --- Tank ---

class TankCreate(BaseModel):
    name: str
    volume_litres: int
    water_type: str = "freshwater"
    shape: Literal["rectangle", "cylinder"] = "rectangle"
    substrate: str | None = None
    lighting: str | None = None
    has_filter: bool = False
    filter_flow_lph: int | None = None
    width_mm: int | None = None
    height_mm: int | None = None
    depth_mm: int | None = None
    co2_injection: bool = False
    co2_source: str | None = None
    co2_method: str | None = None
    has_heater: bool = False
    heater_watts: int | None = None
    has_lighting: bool = False
    light_intensity: str | None = None
    light_watts: int | None = None
    light_technology: str | None = None
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
    feeding_amount: str | None = None
    notes: str | None = None


class TankFishUpdate(BaseModel):
    quantity: int | None = None
    organism_type: str | None = None
    fish_status: str | None = None
    health_status: str | None = None
    food_types: str | None = None
    feeding_times_per_day: int | None = None
    feeding_amount: str | None = None
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


# --- Tap water tests ---

class TapWaterTestCreate(BaseModel):
    ph: float | None = None
    gh_dgh: float | None = None
    kh_dkh: float | None = None
    chlorine_ppm: float | None = None
    nitrate_ppm: float | None = None
    tds_ppm: float | None = None
    notes: str | None = None


class TapWaterTestOut(TapWaterTestCreate):
    id: str
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


class MaintenanceTaskSkip(BaseModel):
    times: int

class MaintenanceTaskCompletionUpdate(BaseModel):
    completed_at: datetime

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


class DailyTaskUpdate(BaseModel):
    name: str | None = None
    hour: int | None = None
    minute: int | None = None
    days: str | None = None
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
    feeding_amount_presets: list[str] | None = None


class AppSettingsOut(BaseModel):
    date_format: str
    unit_system: str
    default_tank_id: str | None = None
    alert_retention_days: int | None = None
    app_url: str | None = None
    feeding_amount_presets: list[str] = []
    updated_at: datetime
    model_config = {"from_attributes": True}


class SettingsStatsOut(BaseModel):
    species_count: int
    image_count: int
    storage_bytes: int


# --- Agent ---

class AgentSettingsUpdate(BaseModel):
    provider: Literal["anthropic", "openai", "ollama"] | None = None
    model: str | None = None
    base_url: str | None = None
    api_key: str | None = None


class AgentSettingsOut(BaseModel):
    provider: str | None = None
    model: str | None = None
    base_url: str | None = None
    api_key_set: bool = False
    updated_at: datetime
    model_config = {"from_attributes": True}


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class AgentChatRequest(BaseModel):
    conversation_id: str | None = None
    message: str


class AgentChatResponse(BaseModel):
    conversation_id: str
    reply: str


class SpeciesDraftRequest(BaseModel):
    name: str


class SpeciesDraftRange(BaseModel):
    min: float | None = None
    max: float | None = None


class SpeciesDraftCare(BaseModel):
    difficulty: str | None = None
    min_tank_litres: float | None = None
    shoal_min: int | None = None
    group_min: int | None = None
    max_size_cm: float | None = None
    lifespan_years: float | None = None
    growth_rate: str | None = None


class SpeciesDraftWater(BaseModel):
    temp_c: SpeciesDraftRange | None = None
    ph: SpeciesDraftRange | None = None
    gh_dgh: SpeciesDraftRange | None = None
    kh_dkh: SpeciesDraftRange | None = None


class SpeciesDraftCompatibility(BaseModel):
    temperament: str | None = None


class SpeciesDraftLight(BaseModel):
    requirement: str | None = None


class SpeciesDraftOut(BaseModel):
    slug: str
    common_name: str
    latin_name: str
    type: str
    family: str | None = None
    origin: str | None = None
    care: SpeciesDraftCare | None = None
    water: SpeciesDraftWater | None = None
    compatibility: SpeciesDraftCompatibility | None = None
    light: SpeciesDraftLight | None = None
    co2_required: bool | None = None
    notes: str | None = None


class ConversationOut(BaseModel):
    id: str
    title: str | None = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class ConversationMessageOut(BaseModel):
    role: str
    content: str
    created_at: datetime
    model_config = {"from_attributes": True}


class ConversationDetailOut(ConversationOut):
    messages: list[ConversationMessageOut] = []


# --- Rooms ---

class RoomCreate(BaseModel):
    name: str
    width_m: float = 3.0
    length_m: float = 2.4


class RoomUpdate(BaseModel):
    name: str | None = None
    width_m: float | None = None
    length_m: float | None = None


class RoomTankPositionOut(BaseModel):
    tank_id: str
    x: float
    y: float
    model_config = {"from_attributes": True}


class RoomOut(BaseModel):
    id: str
    name: str
    width_m: float
    length_m: float
    tank_positions: list[RoomTankPositionOut] = []
    model_config = {"from_attributes": True}


class RoomTankPositionUpsert(BaseModel):
    room_id: str
    x: float
    y: float


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
    category: Literal["Equipment", "Plants", "Food", "Chemicals", "Medication", "Decor", "Tanks", "Other"]
    quantity: int = 0
    low_stock_threshold: int = 1
    unit_label: str | None = None
    notes: str | None = None


class InventoryItemUpdate(BaseModel):
    name: str | None = None
    category: Literal["Equipment", "Plants", "Food", "Chemicals", "Medication", "Decor", "Tanks", "Other"] | None = None
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


# --- Auth ---

class RegisterRequest(BaseModel):
    email: str
    password: str
    display_name: str | None = None


class LoginRequest(BaseModel):
    email: str
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str | None = None
    new_password: str


class UserOut(BaseModel):
    id: str
    email: str
    display_name: str | None = None
    has_password: bool
    permissions: dict[str, str] = {}


class UserListItemOut(BaseModel):
    id: str
    email: str
    display_name: str | None = None
    has_password: bool
    has_oidc: bool
    created_at: datetime
    last_login_at: datetime | None = None


class UserUpdateRequest(BaseModel):
    email: str | None = None
    display_name: str | None = None


class AuthConfigOut(BaseModel):
    allow_registration_effective: bool
    oidc_enabled: bool
    oidc_label: str | None = None


class AuthSettingsOut(BaseModel):
    allow_registration: bool
    oidc_issuer_url: str | None = None
    oidc_client_id: str | None = None
    oidc_client_secret_set: bool = False
    oidc_display_name: str | None = None
    updated_at: datetime


class AuthSettingsUpdate(BaseModel):
    allow_registration: bool | None = None
    oidc_issuer_url: str | None = None
    oidc_client_id: str | None = None
    oidc_client_secret: str | None = None
    oidc_display_name: str | None = None


class PermissionsOut(BaseModel):
    ai: Literal["none", "use", "edit"]


class PermissionsUpdate(BaseModel):
    ai: Literal["none", "use", "edit"] | None = None
