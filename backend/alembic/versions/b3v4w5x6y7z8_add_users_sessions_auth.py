"""add users, sessions, auth_settings

Revision ID: b3v4w5x6y7z8
Revises: a2u3v4w5x6y7
Create Date: 2026-08-30
"""
from alembic import op
import sqlalchemy as sa

revision = 'b3v4w5x6y7z8'
down_revision = 'a2u3v4w5x6y7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('email', sa.String(), nullable=False, unique=True),
        sa.Column('display_name', sa.String(), nullable=True),
        sa.Column('password_hash', sa.String(), nullable=True),
        sa.Column('oidc_subject', sa.String(), nullable=True, unique=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('last_login_at', sa.DateTime(), nullable=True),
    )
    op.create_table(
        'sessions',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
    )
    op.create_table(
        'auth_settings',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('allow_registration', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('auth_settings')
    op.drop_table('sessions')
    op.drop_table('users')
