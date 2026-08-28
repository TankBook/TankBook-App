"""add tap_water_tests table

Revision ID: b3c4d5e6f7g8
Revises: w7q8r9s0t1u2
Create Date: 2026-08-28

"""
from alembic import op
import sqlalchemy as sa

revision = 'b3c4d5e6f7g8'
down_revision = 'w7q8r9s0t1u2'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'tap_water_tests',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('ph', sa.Float(), nullable=True),
        sa.Column('gh_dgh', sa.Float(), nullable=True),
        sa.Column('kh_dkh', sa.Float(), nullable=True),
        sa.Column('chlorine_ppm', sa.Float(), nullable=True),
        sa.Column('nitrate_ppm', sa.Float(), nullable=True),
        sa.Column('tds_ppm', sa.Float(), nullable=True),
        sa.Column('recorded_at', sa.DateTime(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
    )


def downgrade():
    op.drop_table('tap_water_tests')
