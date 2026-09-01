"""drop allow_tank_creation from app_settings

Reverting galcfgjka3ks: tank creation ended up being controlled per
account via the new "tanks" permission key instead of one instance-wide
switch, so this column is no longer read anywhere.

Revision ID: cn5ak4cb8gs4
Revises: galcfgjka3ks
Create Date: 2026-09-01
"""
import sqlalchemy as sa
from alembic import op

revision = 'cn5ak4cb8gs4'
down_revision = 'galcfgjka3ks'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column('app_settings', 'allow_tank_creation')


def downgrade() -> None:
    op.add_column('app_settings', sa.Column('allow_tank_creation', sa.Boolean(), nullable=False, server_default=sa.true()))
    op.alter_column('app_settings', 'allow_tank_creation', server_default=None)
