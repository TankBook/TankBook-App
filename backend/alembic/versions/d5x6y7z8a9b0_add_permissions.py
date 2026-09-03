"""add permissions

Revision ID: d5x6y7z8a9b0
Revises: c4w5x6y7z8a9
Create Date: 2026-08-30
"""
from alembic import op
import sqlalchemy as sa

revision = 'd5x6y7z8a9b0'
down_revision = 'c4w5x6y7z8a9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'permissions',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('key', sa.String(), nullable=False),
        sa.Column('level', sa.String(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('user_id', 'key', name='uq_permission_user_key'),
    )


def downgrade() -> None:
    op.drop_table('permissions')
