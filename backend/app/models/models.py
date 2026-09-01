import json
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Float, Boolean, Text, ForeignKey, DateTime, UniqueConstraint
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
    has_filter: Mapped[bool] = mapped_column(Boolean, default=False)
    filter_flow_lph: Mapped[int | None] = mapped_column(Integer)
    width_mm: Mapped[int | None] = mapped_column(Integer)
    height_mm: Mapped[int | None] = mapped_column(Integer)
    depth_mm: Mapped[int | None] = mapped_column(Integer)
    shape: Mapped[str] = mapped_column(String, default="rectangle")  # "rectangle" | "cylinder" — for cylinder, width_mm holds the diameter
    water_type: Mapped[str] = mapped_column(String, default="freshwater")
    co2_injection: Mapped[bool] = mapped_column(Boolean, default=False)
    co2_source: Mapped[str | None] = mapped_column(String)
    co2_method: Mapped[str | None] = mapped_column(String)
    has_heater: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    heater_watts: Mapped[int | None] = mapped_column(Integer)
    has_lighting: Mapped[bool] = mapped_column(Boolean, default=False)
    light_intensity: Mapped[str | None] = mapped_column(String)
    light_watts: Mapped[int | None] = mapped_column(Integer)
    light_technology: Mapped[str | None] = mapped_column(String)
    setup_date: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    owner_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    owner: Mapped["User"] = relationship(foreign_keys=[owner_id])
    fish: Mapped[list["TankFish"]] = relationship(back_populates="tank", cascade="all, delete-orphan")
    plants: Mapped[list["TankPlant"]] = relationship(back_populates="tank", cascade="all, delete-orphan")
    parameters: Mapped[list["WaterParameter"]] = relationship(back_populates="tank", cascade="all, delete-orphan")
    tasks: Mapped[list["MaintenanceTask"]] = relationship(back_populates="tank", cascade="all, delete-orphan")
    alerts: Mapped[list["Alert"]] = relationship(back_populates="tank", cascade="all, delete-orphan")
    daily_tasks: Mapped[list["DailyTask"]] = relationship(back_populates="tank", cascade="all, delete-orphan")
    journal_entries: Mapped[list["JournalEntry"]] = relationship(back_populates="tank", cascade="all, delete-orphan")
    health_cases: Mapped[list["HealthCase"]] = relationship(back_populates="tank", cascade="all, delete-orphan")
    room_position: Mapped["RoomTankPosition | None"] = relationship(back_populates="tank", cascade="all, delete-orphan")
    shares: Mapped[list["TankShare"]] = relationship(back_populates="tank", cascade="all, delete-orphan")


class TankShare(Base):
    """Grants another user 'view' or 'edit' access to a tank they don't own."""
    __tablename__ = "tank_shares"
    __table_args__ = (UniqueConstraint("tank_id", "user_id", name="uq_tank_share_tank_user"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    tank_id: Mapped[str] = mapped_column(String, ForeignKey("tanks.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    level: Mapped[str] = mapped_column(String, nullable=False)  # "view" | "edit"
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    tank: Mapped["Tank"] = relationship(back_populates="shares")
    user: Mapped["User"] = relationship()


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
    feeding_amount: Mapped[str | None] = mapped_column(String)
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


class TapWaterTest(Base):
    """Readings for the household tap water source, not tied to any one tank."""
    __tablename__ = "tap_water_tests"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    ph: Mapped[float | None] = mapped_column(Float)
    gh_dgh: Mapped[float | None] = mapped_column(Float)
    kh_dkh: Mapped[float | None] = mapped_column(Float)
    chlorine_ppm: Mapped[float | None] = mapped_column(Float)
    nitrate_ppm: Mapped[float | None] = mapped_column(Float)
    tds_ppm: Mapped[float | None] = mapped_column(Float)
    recorded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    notes: Mapped[str | None] = mapped_column(Text)


class MaintenanceTask(Base):
    __tablename__ = "maintenance_tasks"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    tank_id: Mapped[str] = mapped_column(String, ForeignKey("tanks.id"), nullable=False)
    task_type: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    due_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)
    notified_at: Mapped[datetime | None] = mapped_column(DateTime)
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
    case_id: Mapped[str | None] = mapped_column(String, ForeignKey("health_cases.id", ondelete="SET NULL"))
    event_type: Mapped[str] = mapped_column(String, nullable=False)
    notes: Mapped[str] = mapped_column(Text, nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    tank: Mapped["Tank"] = relationship(back_populates="journal_entries")
    case: Mapped["HealthCase | None"] = relationship(back_populates="entries")


class HealthCase(Base):
    """A tracked illness/quarantine episode for a tank (optionally scoped to one species
    group). Journal entries can be tagged to a case via JournalEntry.case_id to build its
    progress timeline, while still showing up in the tank's normal journal."""
    __tablename__ = "health_cases"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    tank_id: Mapped[str] = mapped_column(String, ForeignKey("tanks.id"), nullable=False)
    tank_fish_id: Mapped[str | None] = mapped_column(String, ForeignKey("tank_fish.id", ondelete="SET NULL"))
    title: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, default="active")
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    treatment: Mapped[str | None] = mapped_column(Text)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    tank: Mapped["Tank"] = relationship(back_populates="health_cases")
    entries: Mapped[list["JournalEntry"]] = relationship(back_populates="case")


class AppSettings(Base):
    """Single-row table holding app-wide settings, shared by every account. Date format, unit
    system, and default tank are per-user (see User) — everything left here is genuinely
    instance-wide."""
    __tablename__ = "app_settings"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: "default")
    alert_retention_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    app_url: Mapped[str | None] = mapped_column(String, nullable=True)
    feeding_amount_presets_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    vapid_public_key: Mapped[str | None] = mapped_column(String, nullable=True)
    vapid_private_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @property
    def feeding_amount_presets(self) -> list[str]:
        if not self.feeding_amount_presets_json:
            return []
        return json.loads(self.feeding_amount_presets_json)


class AgentSettings(Base):
    """Single-row table holding the configured LLM provider for the AI assistant."""
    __tablename__ = "agent_settings"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: "default")
    provider: Mapped[str | None] = mapped_column(String, nullable=True)  # "anthropic" | "openai" | "ollama"
    model: Mapped[str | None] = mapped_column(String, nullable=True)
    base_url: Mapped[str | None] = mapped_column(String, nullable=True)
    api_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    title: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    messages: Mapped[list["ConversationMessage"]] = relationship(
        back_populates="conversation", cascade="all, delete-orphan", order_by="ConversationMessage.created_at"
    )


class ConversationMessage(Base):
    __tablename__ = "conversation_messages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    conversation_id: Mapped[str] = mapped_column(String, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False)  # "user" | "assistant"
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    conversation: Mapped["Conversation"] = relationship(back_populates="messages")


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    tank_id: Mapped[str | None] = mapped_column(String, ForeignKey("tanks.id", ondelete="SET NULL"), nullable=True)
    inventory_item_id: Mapped[str | None] = mapped_column(String, ForeignKey("inventory_items.id", ondelete="SET NULL"), nullable=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)  # per-unit price; total cost is amount * quantity
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String)
    purchase_date: Mapped[str] = mapped_column(String, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String, nullable=False)
    width_m: Mapped[float] = mapped_column(Float, default=3.0)
    length_m: Mapped[float] = mapped_column(Float, default=2.4)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    tank_positions: Mapped[list["RoomTankPosition"]] = relationship(back_populates="room", cascade="all, delete-orphan")


class RoomTankPosition(Base):
    __tablename__ = "room_tank_positions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    room_id: Mapped[str] = mapped_column(String, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    tank_id: Mapped[str] = mapped_column(String, ForeignKey("tanks.id", ondelete="CASCADE"), nullable=False, unique=True)
    x: Mapped[float] = mapped_column(Float, nullable=False)
    y: Mapped[float] = mapped_column(Float, nullable=False)

    room: Mapped["Room"] = relationship(back_populates="tank_positions")
    tank: Mapped["Tank"] = relationship(back_populates="room_position")


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String, nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=False)  # "Food" | "Chemicals"
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    low_stock_threshold: Mapped[int] = mapped_column(Integer, default=1)
    unit_label: Mapped[str | None] = mapped_column(String, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


DASHBOARD_SECTION_IDS = ["stats", "tanks", "tasks", "tap_water"]

# The 6 stat-card slots along the top of the dashboard — static in number and
# position, but each slot's content is chosen from this set, per user.
DASHBOARD_STAT_KEYS = [
    "tanks", "fish", "fish_species", "invertebrate_species", "amphibian_species",
    "tasks_due_today", "plant_species", "alerts", "overdue_tasks",
]
DEFAULT_DASHBOARD_STATS = ["tanks", "fish", "fish_species", "plant_species", "alerts", "overdue_tasks"]


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    email: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    display_name: Mapped[str | None] = mapped_column(String, nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    oidc_subject: Mapped[str | None] = mapped_column(String, nullable=True, unique=True)
    date_format: Mapped[str] = mapped_column(String, default="DD/MM/YYYY")
    unit_system: Mapped[str] = mapped_column(String, default="cm")
    default_tank_id: Mapped[str | None] = mapped_column(String, ForeignKey("tanks.id", ondelete="SET NULL"), nullable=True)
    notifications_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    dashboard_layout_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    dashboard_stats_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    sessions: Mapped[list["Session"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    push_subscriptions: Mapped[list["PushSubscription"]] = relationship(back_populates="user", cascade="all, delete-orphan")

    @property
    def dashboard_layout(self) -> list[dict]:
        saved = json.loads(self.dashboard_layout_json) if self.dashboard_layout_json else []
        visible_by_id = {item["id"]: item.get("visible", True) for item in saved if isinstance(item, dict) and "id" in item}
        return [{"id": sid, "visible": visible_by_id.get(sid, True)} for sid in DASHBOARD_SECTION_IDS]

    @property
    def dashboard_stats(self) -> list[str]:
        saved = json.loads(self.dashboard_stats_json) if self.dashboard_stats_json else []
        keys = [k for k in saved if k in DASHBOARD_STAT_KEYS][:6]
        for default in DEFAULT_DASHBOARD_STATS:
            if len(keys) >= 6:
                break
            if default not in keys:
                keys.append(default)
        return keys


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    user: Mapped["User"] = relationship(back_populates="sessions")


class PushSubscription(Base):
    """A single browser/device's Web Push subscription. A user can have several — one per
    device or browser they've enabled notifications on."""
    __tablename__ = "push_subscriptions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    endpoint: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    p256dh: Mapped[str] = mapped_column(String, nullable=False)
    auth: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="push_subscriptions")


class AuthSettings(Base):
    """Single-row table holding instance-wide auth settings."""
    __tablename__ = "auth_settings"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: "default")
    allow_registration: Mapped[bool] = mapped_column(Boolean, default=True)
    oidc_issuer_url: Mapped[str | None] = mapped_column(String, nullable=True)
    oidc_client_id: Mapped[str | None] = mapped_column(String, nullable=True)
    oidc_client_secret: Mapped[str | None] = mapped_column(Text, nullable=True)
    oidc_display_name: Mapped[str | None] = mapped_column(String, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Permission(Base):
    """Per-user, per-capability access level. No row for a (user, key) pair means the
    capability's default level applies — see services/permissions.py:DEFAULT_LEVELS."""
    __tablename__ = "permissions"
    __table_args__ = (UniqueConstraint("user_id", "key", name="uq_permission_user_key"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    key: Mapped[str] = mapped_column(String, nullable=False)
    level: Mapped[str] = mapped_column(String, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
