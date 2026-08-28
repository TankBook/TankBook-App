"""add rooms and room tank positions

Revision ID: v6p7q8r9s0t1
Revises: u5o6p7q8r9s0
Create Date: 2026-08-28

"""
from alembic import op
import sqlalchemy as sa

revision = 'v6p7q8r9s0t1'
down_revision = 'u5o6p7q8r9s0'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'rooms',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('width_m', sa.Float(), nullable=False, server_default='3.0'),
        sa.Column('depth_m', sa.Float(), nullable=False, server_default='2.4'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_table(
        'room_tank_positions',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('room_id', sa.String(), sa.ForeignKey('rooms.id', ondelete='CASCADE'), nullable=False),
        sa.Column('tank_id', sa.String(), sa.ForeignKey('tanks.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('x', sa.Float(), nullable=False),
        sa.Column('y', sa.Float(), nullable=False),
    )


def downgrade():
    op.drop_table('room_tank_positions')
    op.drop_table('rooms')
