"""add oidc fields to auth_settings

Revision ID: c4w5x6y7z8a9
Revises: b3v4w5x6y7z8
Create Date: 2026-08-30
"""
from alembic import op
import sqlalchemy as sa

revision = 'c4w5x6y7z8a9'
down_revision = 'b3v4w5x6y7z8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('auth_settings', sa.Column('oidc_issuer_url', sa.String(), nullable=True))
    op.add_column('auth_settings', sa.Column('oidc_client_id', sa.String(), nullable=True))
    op.add_column('auth_settings', sa.Column('oidc_client_secret', sa.Text(), nullable=True))
    op.add_column('auth_settings', sa.Column('oidc_display_name', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('auth_settings', 'oidc_display_name')
    op.drop_column('auth_settings', 'oidc_client_secret')
    op.drop_column('auth_settings', 'oidc_client_id')
    op.drop_column('auth_settings', 'oidc_issuer_url')
