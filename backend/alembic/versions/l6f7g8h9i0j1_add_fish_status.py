"""add fish_status to tank_fish

Revision ID: l6f7g8h9i0j1
Revises: k5e6f7g8h9i0
Create Date: 2026-06-17

"""
from alembic import op
import sqlalchemy as sa

revision = 'l6f7g8h9i0j1'
down_revision = 'k5e6f7g8h9i0'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('tank_fish', sa.Column('fish_status', sa.String(), nullable=False, server_default='added'))


def downgrade():
    op.drop_column('tank_fish', 'fish_status')
