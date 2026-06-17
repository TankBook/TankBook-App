"""add journal entries table

Revision ID: g1a2b3c4d5e6
Revises: f5c3d8e1a9b0
Create Date: 2026-06-17 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'g1a2b3c4d5e6'
down_revision: Union[str, None] = 'f5c3d8e1a9b0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'journal_entries',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tank_id', sa.String(), sa.ForeignKey('tanks.id'), nullable=False),
        sa.Column('tank_fish_id', sa.String(), sa.ForeignKey('tank_fish.id', ondelete='SET NULL'), nullable=True),
        sa.Column('event_type', sa.String(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=False),
        sa.Column('occurred_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_journal_entries_tank_id', 'journal_entries', ['tank_id'])
    op.create_index('ix_journal_entries_occurred_at', 'journal_entries', ['occurred_at'])


def downgrade() -> None:
    op.drop_index('ix_journal_entries_occurred_at', table_name='journal_entries')
    op.drop_index('ix_journal_entries_tank_id', table_name='journal_entries')
    op.drop_table('journal_entries')
