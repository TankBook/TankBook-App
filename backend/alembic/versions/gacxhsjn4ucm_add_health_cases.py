"""add health cases (quarantine / disease tracking)

Revision ID: gacxhsjn4ucm
Revises: 3jngc50bpwrk
Create Date: 2026-08-31
"""
from alembic import op
import sqlalchemy as sa

revision = 'gacxhsjn4ucm'
down_revision = '3jngc50bpwrk'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'health_cases',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('tank_id', sa.String(), sa.ForeignKey('tanks.id'), nullable=False),
        sa.Column('tank_fish_id', sa.String(), sa.ForeignKey('tank_fish.id', ondelete='SET NULL'), nullable=True),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='active'),
        sa.Column('started_at', sa.DateTime(), nullable=False),
        sa.Column('treatment', sa.Text(), nullable=True),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.add_column(
        'journal_entries',
        sa.Column('case_id', sa.String(), sa.ForeignKey('health_cases.id', ondelete='SET NULL'), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('journal_entries', 'case_id')
    op.drop_table('health_cases')
