"""add feeding_amount to tank_fish and feeding_amount_presets to settings

Revision ID: u5o6p7q8r9s0
Revises: t4n5o6p7q8r9
Create Date: 2026-08-28

"""
from alembic import op
import sqlalchemy as sa

revision = 'u5o6p7q8r9s0'
down_revision = 't4n5o6p7q8r9'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('tank_fish', sa.Column('feeding_amount', sa.String(), nullable=True))
    op.add_column('app_settings', sa.Column('feeding_amount_presets_json', sa.Text(), nullable=True))


def downgrade():
    op.drop_column('tank_fish', 'feeding_amount')
    op.drop_column('app_settings', 'feeding_amount_presets_json')
