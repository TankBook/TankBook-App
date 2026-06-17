"""baseline schema

Revision ID: d6aaf1b26185
Revises:
Create Date: 2026-06-16 00:00:00.000000

This is the baseline migration. It captures the full schema as of the
current models.py and should never be edited after being applied to any
real database — create a new migration instead.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "d6aaf1b26185"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "tanks",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("volume_litres", sa.Integer(), nullable=False),
        sa.Column("substrate", sa.String(), nullable=True),
        sa.Column("lighting", sa.String(), nullable=True),
        sa.Column("co2_injection", sa.Boolean(), nullable=False),
        sa.Column("setup_date", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "tank_fish",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("tank_id", sa.String(), nullable=False),
        sa.Column("species_slug", sa.String(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("health_status", sa.String(), nullable=False),
        sa.Column("added_at", sa.DateTime(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["tank_id"], ["tanks.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "tank_plants",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("tank_id", sa.String(), nullable=False),
        sa.Column("species_slug", sa.String(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("added_at", sa.DateTime(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["tank_id"], ["tanks.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "water_parameters",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("tank_id", sa.String(), nullable=False),
        sa.Column("ph", sa.Float(), nullable=True),
        sa.Column("ammonia_ppm", sa.Float(), nullable=True),
        sa.Column("nitrite_ppm", sa.Float(), nullable=True),
        sa.Column("nitrate_ppm", sa.Float(), nullable=True),
        sa.Column("temperature_c", sa.Float(), nullable=True),
        sa.Column("gh_dgh", sa.Float(), nullable=True),
        sa.Column("kh_dkh", sa.Float(), nullable=True),
        sa.Column("recorded_at", sa.DateTime(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["tank_id"], ["tanks.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "maintenance_tasks",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("tank_id", sa.String(), nullable=False),
        sa.Column("task_type", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("due_at", sa.DateTime(), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("is_recurring", sa.Boolean(), nullable=False),
        sa.Column("recur_every_weeks", sa.Integer(), nullable=True),
        sa.Column("recur_day_of_week", sa.Integer(), nullable=True),
        sa.Column("parent_task_id", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(["tank_id"], ["tanks.id"]),
        sa.ForeignKeyConstraint(["parent_task_id"], ["maintenance_tasks.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "alerts",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("tank_id", sa.String(), nullable=False),
        sa.Column("parameter_log_id", sa.String(), nullable=True),
        sa.Column("alert_type", sa.String(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("severity", sa.String(), nullable=False),
        sa.Column("acknowledged", sa.Boolean(), nullable=False),
        sa.Column("triggered_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["tank_id"], ["tanks.id"]),
        sa.ForeignKeyConstraint(["parameter_log_id"], ["water_parameters.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "species_index",
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("common_name", sa.String(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("temp_min", sa.Float(), nullable=True),
        sa.Column("temp_max", sa.Float(), nullable=True),
        sa.Column("ph_min", sa.Float(), nullable=True),
        sa.Column("ph_max", sa.Float(), nullable=True),
        sa.Column("synced_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("slug"),
    )


def downgrade() -> None:
    op.drop_table("species_index")
    op.drop_table("alerts")
    op.drop_table("maintenance_tasks")
    op.drop_table("water_parameters")
    op.drop_table("tank_plants")
    op.drop_table("tank_fish")
    op.drop_table("tanks")
