"""add dashboard layout preference

Revision ID: 3jngc50bpwrk
Revises: y9rk7buu51rw
Create Date: 2026-08-31
"""
from alembic import op
import sqlalchemy as sa

revision = '3jngc50bpwrk'
down_revision = 'y9rk7buu51rw'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('dashboard_layout_json', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'dashboard_layout_json')
