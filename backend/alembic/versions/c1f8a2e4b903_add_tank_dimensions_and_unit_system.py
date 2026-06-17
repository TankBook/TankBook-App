"""add tank dimensions and unit system setting

Revision ID: c1f8a2e4b903
Revises: a3f9c41e7b02
Create Date: 2026-06-16 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "c1f8a2e4b903"
down_revision: Union[str, None] = "a3f9c41e7b02"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tanks", sa.Column("width_mm", sa.Integer(), nullable=True))
    op.add_column("tanks", sa.Column("height_mm", sa.Integer(), nullable=True))
    op.add_column("tanks", sa.Column("depth_mm", sa.Integer(), nullable=True))
    op.add_column("app_settings", sa.Column("unit_system", sa.String(), nullable=False, server_default="cm"))


def downgrade() -> None:
    op.drop_column("app_settings", "unit_system")
    op.drop_column("tanks", "depth_mm")
    op.drop_column("tanks", "height_mm")
    op.drop_column("tanks", "width_mm")
