"""add filter flow and app settings

Revision ID: a3f9c41e7b02
Revises: d6aaf1b26185
Create Date: 2026-06-16 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "a3f9c41e7b02"
down_revision: Union[str, None] = "d6aaf1b26185"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tanks", sa.Column("filter_flow_lph", sa.Integer(), nullable=True))

    op.create_table(
        "app_settings",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("date_format", sa.String(), nullable=False, server_default="DD/MM/YYYY"),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("app_settings")
    op.drop_column("tanks", "filter_flow_lph")
