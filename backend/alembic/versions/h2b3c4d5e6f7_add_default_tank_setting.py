"""add default_tank_id to app_settings

Revision ID: h2b3c4d5e6f7
Revises: g1a2b3c4d5e6
Create Date: 2026-06-17

"""
from alembic import op
import sqlalchemy as sa

revision = 'h2b3c4d5e6f7'
down_revision = 'g1a2b3c4d5e6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('app_settings', sa.Column('default_tank_id', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('app_settings', 'default_tank_id')
