"""add plant_status to tank_plants

Revision ID: i3c4d5e6f7g8
Revises: h2b3c4d5e6f7
Create Date: 2026-06-17

"""
from alembic import op
import sqlalchemy as sa

revision = 'i3c4d5e6f7g8'
down_revision = 'h2b3c4d5e6f7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('tank_plants', sa.Column('plant_status', sa.String(), nullable=True))
    op.execute("UPDATE tank_plants SET plant_status = 'planted' WHERE plant_status IS NULL")
    op.alter_column('tank_plants', 'plant_status', nullable=False, server_default='planted')


def downgrade() -> None:
    op.drop_column('tank_plants', 'plant_status')
