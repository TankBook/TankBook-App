"""add agent_settings

Revision ID: z1t2u3v4w5x6
Revises: c9d0e1f2a3b4
Create Date: 2026-08-30
"""
from alembic import op
import sqlalchemy as sa

revision = 'z1t2u3v4w5x6'
down_revision = 'c9d0e1f2a3b4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'agent_settings',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('provider', sa.String(), nullable=True),
        sa.Column('model', sa.String(), nullable=True),
        sa.Column('base_url', sa.String(), nullable=True),
        sa.Column('api_key', sa.Text(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('agent_settings')
