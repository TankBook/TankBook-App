"""add groups (households)

Lets a user create a household group and invite others into it; a tank,
expense, inventory item, room, or tap water test assigned to a group is
visible/editable by every member, on top of its own owner_id. Coexists
with the existing per-tank owner/TankShare sharing.

Expenses, inventory items, rooms, and tap water tests had no owner
concept at all before this — they gain owner_id (backfilled to the
instance's earliest-created user) alongside the new optional group_id.

An instance upgrading straight from a pre-accounts version can have rows
in these tables but zero users at the point this migration runs (these
tables predate the whole auth system, and migrations always run before
anyone has had a chance to register) — there's nobody to backfill to
yet. owner_id stays nullable in that case; the first account to ever
register claims every orphaned row (see auth.py's
_bootstrap_admin_if_first_user), which happens moments later and before
anyone could otherwise reach the API, since every route requires auth.

Revision ID: dfltnife7if1
Revises: cn5ak4cb8gs4
Create Date: 2026-09-01
"""
import sqlalchemy as sa
from alembic import op

revision = 'dfltnife7if1'
down_revision = 'cn5ak4cb8gs4'
branch_labels = None
depends_on = None

NEWLY_OWNED_TABLES = ['tap_water_tests', 'expenses', 'rooms', 'inventory_items']


def upgrade() -> None:
    op.create_table(
        'groups',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_table(
        'group_memberships',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('group_id', sa.String(), sa.ForeignKey('groups.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('group_id', 'user_id', name='uq_group_membership_group_user'),
    )
    op.create_index('ix_group_memberships_user_id', 'group_memberships', ['user_id'])
    op.create_index('ix_group_memberships_group_id', 'group_memberships', ['group_id'])

    op.add_column('tanks', sa.Column('group_id', sa.String(), sa.ForeignKey('groups.id', ondelete='SET NULL'), nullable=True))

    conn = op.get_bind()
    earliest_user_id = conn.execute(sa.text("SELECT id FROM users ORDER BY created_at ASC LIMIT 1")).scalar()

    for table in NEWLY_OWNED_TABLES:
        op.add_column(table, sa.Column('owner_id', sa.String(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=True))
        op.add_column(table, sa.Column('group_id', sa.String(), sa.ForeignKey('groups.id', ondelete='SET NULL'), nullable=True))
        if earliest_user_id:
            conn.execute(sa.text(f"UPDATE {table} SET owner_id = :uid"), {"uid": earliest_user_id})


def downgrade() -> None:
    for table in NEWLY_OWNED_TABLES:
        op.drop_column(table, 'group_id')
        op.drop_column(table, 'owner_id')

    op.drop_column('tanks', 'group_id')

    op.drop_index('ix_group_memberships_group_id', table_name='group_memberships')
    op.drop_index('ix_group_memberships_user_id', table_name='group_memberships')
    op.drop_table('group_memberships')
    op.drop_table('groups')
