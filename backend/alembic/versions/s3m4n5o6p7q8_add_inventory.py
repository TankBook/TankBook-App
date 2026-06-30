"""add inventory items and link to expenses

Revision ID: s3m4n5o6p7q8
Revises: r2l3m4n5o6p7
Create Date: 2026-06-30

"""
from alembic import op
import sqlalchemy as sa

revision = 's3m4n5o6p7q8'
down_revision = 'r2l3m4n5o6p7'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'inventory_items',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('category', sa.String(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('low_stock_threshold', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('unit_label', sa.String(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.add_column(
        'expenses',
        sa.Column('inventory_item_id', sa.String(), sa.ForeignKey('inventory_items.id', ondelete='SET NULL'), nullable=True),
    )


def downgrade():
    op.drop_column('expenses', 'inventory_item_id')
    op.drop_table('inventory_items')
