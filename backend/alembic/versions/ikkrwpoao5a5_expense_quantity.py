"""add quantity to expenses

Expense.amount is the per-unit price; quantity lets an entry cover
buying more than one of something, with the displayed total being
amount * quantity. Existing rows default to quantity 1, preserving
their current total.

Revision ID: ikkrwpoao5a5
Revises: szece19xgw3d
Create Date: 2026-09-01
"""
import sqlalchemy as sa
from alembic import op

revision = 'ikkrwpoao5a5'
down_revision = 'szece19xgw3d'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('expenses', sa.Column('quantity', sa.Integer(), nullable=False, server_default='1'))
    op.alter_column('expenses', 'quantity', server_default=None)


def downgrade() -> None:
    op.drop_column('expenses', 'quantity')
