"""add food_types and feeding_times_per_day to tank_fish

Revision ID: p0j1k2l3m4n5
Revises: o9i0j1k2l3m4
Create Date: 2026-06-18

"""
from alembic import op
import sqlalchemy as sa

revision = 'p0j1k2l3m4n5'
down_revision = 'o9i0j1k2l3m4'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('tank_fish', sa.Column('food_types', sa.Text(), nullable=True))
    op.add_column('tank_fish', sa.Column('feeding_times_per_day', sa.Integer(), nullable=True))


def downgrade():
    op.drop_column('tank_fish', 'food_types')
    op.drop_column('tank_fish', 'feeding_times_per_day')
