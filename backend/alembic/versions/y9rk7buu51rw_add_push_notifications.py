"""add push notification support

Revision ID: y9rk7buu51rw
Revises: f7z8a9b0c1d2
Create Date: 2026-08-31
"""
from alembic import op
import sqlalchemy as sa

revision = 'y9rk7buu51rw'
down_revision = 'f7z8a9b0c1d2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('maintenance_tasks', sa.Column('notified_at', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('notifications_enabled', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('app_settings', sa.Column('vapid_public_key', sa.String(), nullable=True))
    op.add_column('app_settings', sa.Column('vapid_private_key', sa.Text(), nullable=True))

    op.create_table(
        'push_subscriptions',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('endpoint', sa.Text(), nullable=False, unique=True),
        sa.Column('p256dh', sa.String(), nullable=False),
        sa.Column('auth', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )

    # Mark every already-due pending task as already-notified, so this deploy doesn't
    # fire a notification flood for a pre-existing overdue backlog — only tasks that
    # become newly due after this ships (notified_at IS NULL) will ever trigger a push.
    op.execute("""
        UPDATE maintenance_tasks
        SET notified_at = (now() AT TIME ZONE 'utc')
        WHERE status = 'pending' AND due_at <= (now() AT TIME ZONE 'utc')
    """)


def downgrade() -> None:
    op.drop_table('push_subscriptions')
    op.drop_column('app_settings', 'vapid_private_key')
    op.drop_column('app_settings', 'vapid_public_key')
    op.drop_column('users', 'notifications_enabled')
    op.drop_column('maintenance_tasks', 'notified_at')
