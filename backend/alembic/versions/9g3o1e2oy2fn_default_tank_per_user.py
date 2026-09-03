"""move default_tank_id from app_settings to users

default_tank_id was a single shared, instance-wide value — set by an
admin, applied to everyone — left over from before tanks had owners.
Now that each tank belongs to one account, it becomes a per-user
preference like date_format/unit_system. Existing value is carried
over only to whichever user actually owns that tank; it's meaningless
for everyone else, so leaving it null for them is correct, not a
data-loss regression.

Revision ID: 9g3o1e2oy2fn
Revises: ikkrwpoao5a5
Create Date: 2026-09-01
"""
import sqlalchemy as sa
from alembic import op

revision = '9g3o1e2oy2fn'
down_revision = 'ikkrwpoao5a5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('default_tank_id', sa.String(), nullable=True))
    op.create_foreign_key('fk_users_default_tank_id_tanks', 'users', 'tanks', ['default_tank_id'], ['id'], ondelete='SET NULL')

    op.execute("""
        UPDATE users u
        SET default_tank_id = s.default_tank_id
        FROM app_settings s
        WHERE s.id = 'default'
          AND s.default_tank_id IS NOT NULL
          AND EXISTS (SELECT 1 FROM tanks t WHERE t.id = s.default_tank_id AND t.owner_id = u.id)
    """)

    op.drop_column('app_settings', 'default_tank_id')


def downgrade() -> None:
    op.add_column('app_settings', sa.Column('default_tank_id', sa.String(), nullable=True))
    op.drop_constraint('fk_users_default_tank_id_tanks', 'users', type_='foreignkey')
    op.drop_column('users', 'default_tank_id')
