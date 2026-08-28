"""add structured co2 and lighting detail fields to tanks

Revision ID: x8r9s0t1u2v3
Revises: w7q8r9s0t1u2
Create Date: 2026-08-28

"""
from alembic import op
import sqlalchemy as sa

revision = 'x8r9s0t1u2v3'
down_revision = 'w7q8r9s0t1u2'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('tanks', sa.Column('co2_source', sa.String(), nullable=True))
    op.add_column('tanks', sa.Column('co2_method', sa.String(), nullable=True))
    op.add_column('tanks', sa.Column('light_intensity', sa.String(), nullable=True))
    op.add_column('tanks', sa.Column('light_watts', sa.Integer(), nullable=True))
    op.add_column('tanks', sa.Column('light_technology', sa.String(), nullable=True))


def downgrade():
    op.drop_column('tanks', 'light_technology')
    op.drop_column('tanks', 'light_watts')
    op.drop_column('tanks', 'light_intensity')
    op.drop_column('tanks', 'co2_method')
    op.drop_column('tanks', 'co2_source')
