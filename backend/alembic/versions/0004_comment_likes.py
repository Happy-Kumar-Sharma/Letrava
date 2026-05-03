"""add comment_likes table

Revision ID: 0004_comment_likes
Revises: 0003_avatar
Create Date: 2026-05-03
"""
from __future__ import annotations
from typing import Sequence, Union
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "0004_comment_likes"
down_revision: Union[str, Sequence[str], None] = "0003_avatar"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "comment_likes",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("comment_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["comment_id"], ["comments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "comment_id"),
    )


def downgrade() -> None:
    op.drop_table("comment_likes")
