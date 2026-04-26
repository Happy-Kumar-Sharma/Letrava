"""initial schema — users, letters, tags, reactions, comments, follows, saves, weekly_prompts

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-04-26

Notes
-----
- `users.id` is a UUID that mirrors Supabase `auth.users.id`. We do NOT add a
  cross-schema FK here — Supabase manages the auth schema. Backend code
  (and/or a Supabase trigger if you wire one) is responsible for inserting a
  row into `public.users` after a magic-link signup.
- One-level comment replies are enforced at the app layer; the table allows
  arbitrary depth in the schema (a `parent_id` self-FK with no depth check)
  to keep the migration simple and reversible.
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0001_initial_schema"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


REACTION_KINDS = ("like", "thoughtful", "relatable", "sad", "hopeful", "inspiring")


def upgrade() -> None:
    # users — id mirrors Supabase auth.users.id
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("username", sa.String(length=40), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("palette", sa.String(length=16), nullable=False, server_default="indigo"),
        sa.Column("bio", sa.Text(), nullable=False, server_default=""),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("username", name="uq_users_username"),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )

    # letters
    op.create_table(
        "letters",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "author_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("excerpt", sa.Text(), nullable=False),
        sa.Column("mood", sa.String(length=20), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_letters_author_id", "letters", ["author_id"])
    op.create_index("ix_letters_created_at", "letters", ["created_at"])

    # tags
    op.create_table(
        "tags",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=40), nullable=False),
        sa.UniqueConstraint("name", name="uq_tags_name"),
    )

    # letter_tags (m2m)
    op.create_table(
        "letter_tags",
        sa.Column(
            "letter_id",
            sa.Integer(),
            sa.ForeignKey("letters.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "tag_id",
            sa.Integer(),
            sa.ForeignKey("tags.id", ondelete="CASCADE"),
            primary_key=True,
        ),
    )
    op.create_index("ix_letter_tags_tag_id", "letter_tags", ["tag_id"])

    # reactions — one row per (user, letter); kind constrained to 6 values
    op.create_table(
        "reactions",
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "letter_id",
            sa.Integer(),
            sa.ForeignKey("letters.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("kind", sa.String(length=20), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "kind IN ('like','thoughtful','relatable','sad','hopeful','inspiring')",
            name="ck_reaction_kind",
        ),
    )
    op.create_index("ix_reactions_letter", "reactions", ["letter_id"])

    # comments — self-FK parent_id; one-level reply rule enforced in app layer
    op.create_table(
        "comments",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "letter_id",
            sa.Integer(),
            sa.ForeignKey("letters.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "author_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "parent_id",
            sa.Integer(),
            sa.ForeignKey("comments.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_comments_letter_id", "comments", ["letter_id"])
    op.create_index("ix_comments_parent_id", "comments", ["parent_id"])

    # follows
    op.create_table(
        "follows",
        sa.Column(
            "follower_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "followee_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint("follower_id <> followee_id", name="ck_follow_self"),
    )
    op.create_index("ix_follows_followee", "follows", ["followee_id"])

    # saves
    op.create_table(
        "saves",
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "letter_id",
            sa.Integer(),
            sa.ForeignKey("letters.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_saves_letter_id", "saves", ["letter_id"])

    # weekly_prompts
    op.create_table(
        "weekly_prompts",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("week_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.UniqueConstraint("week_start", name="uq_weekly_prompts_week_start"),
    )
    # Only one prompt may be active at a time.
    op.create_index(
        "ux_weekly_prompts_one_active",
        "weekly_prompts",
        ["active"],
        unique=True,
        postgresql_where=sa.text("active = true"),
    )


def downgrade() -> None:
    op.drop_index("ux_weekly_prompts_one_active", table_name="weekly_prompts")
    op.drop_table("weekly_prompts")

    op.drop_index("ix_saves_letter_id", table_name="saves")
    op.drop_table("saves")

    op.drop_index("ix_follows_followee", table_name="follows")
    op.drop_table("follows")

    op.drop_index("ix_comments_parent_id", table_name="comments")
    op.drop_index("ix_comments_letter_id", table_name="comments")
    op.drop_table("comments")

    op.drop_index("ix_reactions_letter", table_name="reactions")
    op.drop_table("reactions")

    op.drop_index("ix_letter_tags_tag_id", table_name="letter_tags")
    op.drop_table("letter_tags")

    op.drop_table("tags")

    op.drop_index("ix_letters_created_at", table_name="letters")
    op.drop_index("ix_letters_author_id", table_name="letters")
    op.drop_table("letters")

    op.drop_table("users")
