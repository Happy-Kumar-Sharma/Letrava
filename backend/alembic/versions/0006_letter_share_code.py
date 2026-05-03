"""add share_code to letters

Revision ID: 0006_letter_share_code
Revises: 0005_follow_notify
Create Date: 2026-05-03
"""
from __future__ import annotations
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "0006_letter_share_code"
down_revision: Union[str, Sequence[str], None] = "0005_follow_notify"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "letters",
        sa.Column("share_code", sa.String(12), nullable=True),
    )
    op.create_unique_constraint("uq_letters_share_code", "letters", ["share_code"])
    op.create_index("ix_letters_share_code", "letters", ["share_code"])


def downgrade() -> None:
    op.drop_index("ix_letters_share_code", table_name="letters")
    op.drop_constraint("uq_letters_share_code", "letters", type_="unique")
    op.drop_column("letters", "share_code")
