"""add heater fields to tanks and create expenses table

Revision ID: n8h9i0j1k2l3
Revises: m7g8h9i0j1k2
Create Date: 2026-06-18

"""
from alembic import op
import sqlalchemy as sa

revision = 'n8h9i0j1k2l3'
down_revision = 'm7g8h9i0j1k2'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('tanks', sa.Column('has_heater', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('tanks', sa.Column('heater_watts', sa.Integer(), nullable=True))

    op.create_table(
        'expenses',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('tank_id', sa.String(), sa.ForeignKey('tanks.id', ondelete='SET NULL'), nullable=True),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('category', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('purchase_date', sa.String(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )


def downgrade():
    op.drop_table('expenses')
    op.drop_column('tanks', 'heater_watts')
    op.drop_column('tanks', 'has_heater')
