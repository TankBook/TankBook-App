"""add tank_shares table

Lets a tank owner grant another user "view" or "edit" access to one
specific tank, on top of the existing single-owner model. Brand new
table, nothing to backfill.

Revision ID: 1g6p65f9vi1j
Revises: 9g3o1e2oy2fn
Create Date: 2026-09-01
"""
import sqlalchemy as sa
from alembic import op

revision = '1g6p65f9vi1j'
down_revision = '9g3o1e2oy2fn'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'tank_shares',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('tank_id', sa.String(), sa.ForeignKey('tanks.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('level', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('tank_id', 'user_id', name='uq_tank_share_tank_user'),
    )
    op.create_index('ix_tank_shares_user_id', 'tank_shares', ['user_id'])
    op.create_index('ix_tank_shares_tank_id', 'tank_shares', ['tank_id'])


def downgrade() -> None:
    op.drop_index('ix_tank_shares_tank_id', table_name='tank_shares')
    op.drop_index('ix_tank_shares_user_id', table_name='tank_shares')
    op.drop_table('tank_shares')
