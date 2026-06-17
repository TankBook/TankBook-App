"""add daily tasks table

Revision ID: e4b2c6f9a3d1
Revises: c1f8a2e4b903
Create Date: 2026-06-17 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'e4b2c6f9a3d1'
down_revision: Union[str, None] = 'c1f8a2e4b903'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'daily_tasks',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tank_id', sa.String(), sa.ForeignKey('tanks.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('hour', sa.Integer(), nullable=False),
        sa.Column('minute', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('days', sa.String(), nullable=False),
        sa.Column('color', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_daily_tasks_tank_id', 'daily_tasks', ['tank_id'])


def downgrade() -> None:
    op.drop_index('ix_daily_tasks_tank_id', table_name='daily_tasks')
    op.drop_table('daily_tasks')
