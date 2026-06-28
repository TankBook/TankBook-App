"""add app_url to settings

Revision ID: r2l3m4n5o6p7
Revises: q1k2l3m4n5o6
Create Date: 2026-06-28
"""
from alembic import op
import sqlalchemy as sa

revision = 'r2l3m4n5o6p7'
down_revision = 'q1k2l3m4n5o6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('app_settings', sa.Column('app_url', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('app_settings', 'app_url')
