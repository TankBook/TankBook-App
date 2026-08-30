"""add shape to tanks

Revision ID: e6y7z8a9b0c1
Revises: d5x6y7z8a9b0
Create Date: 2026-08-30
"""
from alembic import op
import sqlalchemy as sa

revision = 'e6y7z8a9b0c1'
down_revision = 'd5x6y7z8a9b0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('tanks', sa.Column('shape', sa.String(), nullable=False, server_default='rectangle'))


def downgrade() -> None:
    op.drop_column('tanks', 'shape')
