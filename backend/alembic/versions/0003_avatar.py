"""add avatar to users

Revision ID: 0003_avatar
Revises: 0002_custom_auth
Create Date: 2026-05-03
"""
from __future__ import annotations
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "0003_avatar"
down_revision: Union[str, Sequence[str], None] = "0002_custom_auth"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("avatar", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "avatar")
