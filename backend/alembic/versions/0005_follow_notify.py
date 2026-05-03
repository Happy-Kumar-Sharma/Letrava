"""add notify_new_letters to follows

Revision ID: 0005_follow_notify
Revises: 0004_comment_likes
Create Date: 2026-05-03
"""
from __future__ import annotations
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "0005_follow_notify"
down_revision: Union[str, Sequence[str], None] = "0004_comment_likes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "follows",
        sa.Column("notify_new_letters", sa.Boolean(), nullable=False, server_default="true"),
    )


def downgrade() -> None:
    op.drop_column("follows", "notify_new_letters")
