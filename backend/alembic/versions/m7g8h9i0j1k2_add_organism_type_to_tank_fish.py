"""add organism_type to tank_fish

Revision ID: m7g8h9i0j1k2
Revises: l6f7g8h9i0j1
Create Date: 2026-06-18

"""
from alembic import op
import sqlalchemy as sa

revision = 'm7g8h9i0j1k2'
down_revision = 'l6f7g8h9i0j1'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('tank_fish', sa.Column('organism_type', sa.String(), nullable=False, server_default='fish'))


def downgrade():
    op.drop_column('tank_fish', 'organism_type')
