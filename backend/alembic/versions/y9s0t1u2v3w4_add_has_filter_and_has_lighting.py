"""add persisted has_filter and has_lighting flags to tanks

Filter and Lighting had no independent on/off flag - "on" was
inferred from whether their detail fields were filled in. Toggling
one on and saving with no details set silently persisted nothing, so
the toggle reverted to off on reload. Adding real boolean columns,
matching how has_heater already works, and backfilling true for any
tank that already has filter/lighting detail values set.

Revision ID: y9s0t1u2v3w4
Revises: x8r9s0t1u2v3
Create Date: 2026-08-28

"""
from alembic import op
import sqlalchemy as sa

revision = 'y9s0t1u2v3w4'
down_revision = 'x8r9s0t1u2v3'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('tanks', sa.Column('has_filter', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('tanks', sa.Column('has_lighting', sa.Boolean(), nullable=False, server_default='false'))

    tanks = sa.table(
        'tanks',
        sa.column('filter_flow_lph', sa.Integer()),
        sa.column('has_filter', sa.Boolean()),
        sa.column('light_intensity', sa.String()),
        sa.column('light_watts', sa.Integer()),
        sa.column('light_technology', sa.String()),
        sa.column('lighting', sa.String()),
        sa.column('has_lighting', sa.Boolean()),
    )
    op.execute(tanks.update().where(tanks.c.filter_flow_lph.isnot(None)).values(has_filter=True))
    op.execute(tanks.update().where(
        sa.or_(
            tanks.c.light_intensity.isnot(None),
            tanks.c.light_watts.isnot(None),
            tanks.c.light_technology.isnot(None),
            tanks.c.lighting.isnot(None),
        )
    ).values(has_lighting=True))


def downgrade():
    op.drop_column('tanks', 'has_lighting')
    op.drop_column('tanks', 'has_filter')
