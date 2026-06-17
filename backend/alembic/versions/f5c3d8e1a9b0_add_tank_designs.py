"""add tank designs table

Revision ID: f5c3d8e1a9b0
Revises: e4b2c6f9a3d1
Create Date: 2026-06-17 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'f5c3d8e1a9b0'
down_revision: Union[str, None] = 'e4b2c6f9a3d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'tank_designs',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tank_id', sa.String(), sa.ForeignKey('tanks.id', ondelete='CASCADE'), nullable=False),
        sa.Column('cells', sa.Text(), nullable=False, server_default='[]'),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tank_id'),
    )


def downgrade() -> None:
    op.drop_table('tank_designs')
