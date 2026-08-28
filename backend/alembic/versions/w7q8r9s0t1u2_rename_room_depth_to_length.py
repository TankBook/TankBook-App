"""rename rooms.depth_m to rooms.length_m

Revision ID: w7q8r9s0t1u2
Revises: v6p7q8r9s0t1
Create Date: 2026-08-28

"""
from alembic import op

revision = 'w7q8r9s0t1u2'
down_revision = 'v6p7q8r9s0t1'
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column('rooms', 'depth_m', new_column_name='length_m')


def downgrade():
    op.alter_column('rooms', 'length_m', new_column_name='depth_m')
