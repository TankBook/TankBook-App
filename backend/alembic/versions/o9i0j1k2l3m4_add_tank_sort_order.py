"""add sort_order to tanks

Revision ID: o9i0j1k2l3m4
Revises: n8h9i0j1k2l3
Create Date: 2026-06-18

"""
from alembic import op
import sqlalchemy as sa

revision = 'o9i0j1k2l3m4'
down_revision = 'n8h9i0j1k2l3'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('tanks', sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'))


def downgrade():
    op.drop_column('tanks', 'sort_order')
