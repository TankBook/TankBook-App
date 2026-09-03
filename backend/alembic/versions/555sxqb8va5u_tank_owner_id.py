"""add owner_id to tanks

Tanks had no concept of ownership — every tank was visible/editable by any
authenticated user. This adds an owner_id FK to users, backfilling existing
tanks to the instance's original account (the earliest-created user) so
nothing pre-existing loses access.

An instance upgrading straight from a pre-accounts version can have tanks
but zero users at the point this migration runs (migrations always run
before anyone has had a chance to register) — there's nobody to backfill
to yet. owner_id stays nullable in that case; the first account to ever
register claims every orphaned tank (see auth.py's
_bootstrap_admin_if_first_user), which happens moments later and before
anyone could otherwise reach the API, since every route requires auth.

Revision ID: 555sxqb8va5u
Revises: jmkz5hk7i936
Create Date: 2026-08-31
"""
import sqlalchemy as sa
from alembic import op

revision = '555sxqb8va5u'
down_revision = 'jmkz5hk7i936'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('tanks', sa.Column('owner_id', sa.String(), nullable=True))
    conn = op.get_bind()
    earliest_user_id = conn.execute(sa.text("SELECT id FROM users ORDER BY created_at ASC LIMIT 1")).scalar()
    if earliest_user_id:
        conn.execute(sa.text("UPDATE tanks SET owner_id = :uid WHERE owner_id IS NULL"), {"uid": earliest_user_id})
    op.create_foreign_key('fk_tanks_owner_id_users', 'tanks', 'users', ['owner_id'], ['id'], ondelete='CASCADE')
    op.create_index('ix_tanks_owner_id', 'tanks', ['owner_id'])


def downgrade() -> None:
    op.drop_index('ix_tanks_owner_id', table_name='tanks')
    op.drop_constraint('fk_tanks_owner_id_users', 'tanks', type_='foreignkey')
    op.drop_column('tanks', 'owner_id')
