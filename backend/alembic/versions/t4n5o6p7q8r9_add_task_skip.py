"""add skip support to maintenance tasks — no schema change needed

Revision ID: t4n5o6p7q8r9
Revises: s3m4n5o6p7q8
Create Date: 2026-06-30

Skip logic is handled entirely in the application layer (advancing due_at).
This migration is a marker so Alembic's chain is contiguous.
"""
from alembic import op

revision = 't4n5o6p7q8r9'
down_revision = 's3m4n5o6p7q8'
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
