"""flip default permission level from edit to none

Permissions with no explicit row used to default to "edit" for everyone — meaning any
self-registered account was a full admin until someone manually restricted it. This
migration backfills an explicit "edit" row for every (user, key) pair that doesn't
already have one, so every account that existed before this change keeps the exact
access it already had. Only accounts created after this ships get the new secure
default (see services/permissions.py's DEFAULT_LEVELS, now "none").

Revision ID: jmkz5hk7i936
Revises: gacxhsjn4ucm
Create Date: 2026-08-31
"""
from alembic import op

revision = 'jmkz5hk7i936'
down_revision = 'gacxhsjn4ucm'
branch_labels = None
depends_on = None

PERMISSION_KEYS = ["ai", "general", "users"]


def upgrade() -> None:
    for key in PERMISSION_KEYS:
        op.execute(f"""
            INSERT INTO permissions (id, user_id, key, level, updated_at)
            SELECT gen_random_uuid()::text, u.id, '{key}', 'edit', (now() AT TIME ZONE 'utc')
            FROM users u
            WHERE NOT EXISTS (
                SELECT 1 FROM permissions p WHERE p.user_id = u.id AND p.key = '{key}'
            )
        """)


def downgrade() -> None:
    # No safe way to distinguish rows this migration inserted from ones an admin set
    # deliberately afterward — nothing to revert here, only the default flips back in
    # services/permissions.py.
    pass
