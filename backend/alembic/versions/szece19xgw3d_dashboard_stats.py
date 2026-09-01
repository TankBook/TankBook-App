"""add dashboard_stats_json to users

Per-user configuration for which stat shows in each of the dashboard's 6
top stat-card slots. Mirrors dashboard_layout_json's pattern — nullable,
with the User.dashboard_stats property filling gaps/invalid entries with
sane defaults on read, so no backfill is needed here.

Revision ID: szece19xgw3d
Revises: 555sxqb8va5u
Create Date: 2026-08-31
"""
import sqlalchemy as sa
from alembic import op

revision = 'szece19xgw3d'
down_revision = '555sxqb8va5u'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('dashboard_stats_json', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'dashboard_stats_json')
