"""add allow_tank_creation to app_settings

Instance-wide toggle for whether accounts can create new tanks, off
the same pattern as the existing allow_registration toggle. Defaults
to enabled so existing instances see no behaviour change.

Revision ID: galcfgjka3ks
Revises: 1g6p65f9vi1j
Create Date: 2026-09-01
"""
import sqlalchemy as sa
from alembic import op

revision = 'galcfgjka3ks'
down_revision = '1g6p65f9vi1j'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('app_settings', sa.Column('allow_tank_creation', sa.Boolean(), nullable=False, server_default=sa.true()))
    op.alter_column('app_settings', 'allow_tank_creation', server_default=None)


def downgrade() -> None:
    op.drop_column('app_settings', 'allow_tank_creation')
