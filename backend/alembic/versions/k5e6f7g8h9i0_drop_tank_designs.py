"""drop tank_designs table

Revision ID: k5e6f7g8h9i0
Revises: j4d5e6f7g8h9
Create Date: 2026-06-17

"""
from alembic import op

revision = 'k5e6f7g8h9i0'
down_revision = 'j4d5e6f7g8h9'
branch_labels = None
depends_on = None


def upgrade():
    op.drop_table('tank_designs')


def downgrade():
    op.create_table(
        'tank_designs',
        op.Column('id', op.String(), primary_key=True),
        op.Column('tank_id', op.String(), nullable=False, unique=True),
        op.Column('cells', op.Text(), nullable=False, server_default='[]'),
        op.Column('updated_at', op.DateTime(), nullable=False),
    )
