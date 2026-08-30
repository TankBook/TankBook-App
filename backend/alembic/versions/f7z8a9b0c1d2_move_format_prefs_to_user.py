"""move date_format/unit_system from app_settings to users

Revision ID: f7z8a9b0c1d2
Revises: e6y7z8a9b0c1
Create Date: 2026-08-31
"""
from alembic import op
import sqlalchemy as sa

revision = 'f7z8a9b0c1d2'
down_revision = 'e6y7z8a9b0c1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('date_format', sa.String(), nullable=True))
    op.add_column('users', sa.Column('unit_system', sa.String(), nullable=True))

    # Carry the current shared value over as everyone's starting per-user preference,
    # so nobody's display format silently changes the moment this ships.
    op.execute("""
        UPDATE users SET
            date_format = COALESCE((SELECT date_format FROM app_settings WHERE id = 'default'), 'DD/MM/YYYY'),
            unit_system = COALESCE((SELECT unit_system FROM app_settings WHERE id = 'default'), 'cm')
    """)

    op.alter_column('users', 'date_format', nullable=False, server_default='DD/MM/YYYY')
    op.alter_column('users', 'unit_system', nullable=False, server_default='cm')

    op.drop_column('app_settings', 'date_format')
    op.drop_column('app_settings', 'unit_system')


def downgrade() -> None:
    op.add_column('app_settings', sa.Column('date_format', sa.String(), nullable=True))
    op.add_column('app_settings', sa.Column('unit_system', sa.String(), nullable=True))
    op.execute("""
        UPDATE app_settings SET
            date_format = COALESCE((SELECT date_format FROM users ORDER BY created_at ASC LIMIT 1), 'DD/MM/YYYY'),
            unit_system = COALESCE((SELECT unit_system FROM users ORDER BY created_at ASC LIMIT 1), 'cm')
        WHERE id = 'default'
    """)
    op.drop_column('users', 'unit_system')
    op.drop_column('users', 'date_format')
