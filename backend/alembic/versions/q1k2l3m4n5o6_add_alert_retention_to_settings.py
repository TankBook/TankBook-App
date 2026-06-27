"""add alert_retention_days to app_settings

Revision ID: q1k2l3m4n5o6
Revises: p0j1k2l3m4n5
Create Date: 2026-06-19

"""
from alembic import op
import sqlalchemy as sa

revision = 'q1k2l3m4n5o6'
down_revision = 'p0j1k2l3m4n5'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('app_settings', sa.Column('alert_retention_days', sa.Integer(), nullable=True))


def downgrade():
    op.drop_column('app_settings', 'alert_retention_days')
