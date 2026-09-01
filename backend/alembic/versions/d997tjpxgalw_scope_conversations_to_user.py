"""scope AI conversations to their owning user

Conversations had no user_id at all -- any account with ai:use could
list, read, and delete every other user's chat history. Backfills
existing rows to the instance's earliest-created user, same fallback
used for the other previously-unowned tables (expenses, inventory,
rooms, tap water tests) -- there's no way to recover the true owner
for conversations created before this fix.

Revision ID: d997tjpxgalw
Revises: dfltnife7if1
Create Date: 2026-09-01
"""
import sqlalchemy as sa
from alembic import op

revision = 'd997tjpxgalw'
down_revision = 'dfltnife7if1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('conversations', sa.Column('user_id', sa.String(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=True))

    conn = op.get_bind()
    earliest_user_id = conn.execute(sa.text("SELECT id FROM users ORDER BY created_at ASC LIMIT 1")).scalar()
    if earliest_user_id:
        conn.execute(sa.text("UPDATE conversations SET user_id = :uid"), {"uid": earliest_user_id})

    op.alter_column('conversations', 'user_id', nullable=False)


def downgrade() -> None:
    op.drop_column('conversations', 'user_id')
