"""add conversations and conversation_messages

Revision ID: a2u3v4w5x6y7
Revises: z1t2u3v4w5x6
Create Date: 2026-08-30
"""
from alembic import op
import sqlalchemy as sa

revision = 'a2u3v4w5x6y7'
down_revision = 'z1t2u3v4w5x6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'conversations',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('title', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_table(
        'conversation_messages',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('conversation_id', sa.String(), sa.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('conversation_messages')
    op.drop_table('conversations')
