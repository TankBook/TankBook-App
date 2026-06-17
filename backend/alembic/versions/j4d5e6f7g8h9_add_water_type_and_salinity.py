"""add water_type to tanks and salinity fields to water_parameters

Revision ID: j4d5e6f7g8h9
Revises: i3c4d5e6f7g8
Create Date: 2026-06-17

"""
from alembic import op
import sqlalchemy as sa

revision = 'j4d5e6f7g8h9'
down_revision = 'i3c4d5e6f7g8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('tanks', sa.Column('water_type', sa.String(), nullable=True))
    op.execute("UPDATE tanks SET water_type = 'freshwater' WHERE water_type IS NULL")
    op.alter_column('tanks', 'water_type', nullable=False, server_default='freshwater')

    op.add_column('water_parameters', sa.Column('salinity_ppt', sa.Float(), nullable=True))
    op.add_column('water_parameters', sa.Column('specific_gravity', sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column('tanks', 'water_type')
    op.drop_column('water_parameters', 'salinity_ppt')
    op.drop_column('water_parameters', 'specific_gravity')
