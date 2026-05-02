from datetime import datetime
import uuid

from sqlalchemy import (
    Boolean, String, Text, ForeignKey, DateTime,
    CheckConstraint, Index, func, text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


REACTION_KINDS = ("like", "thoughtful", "relatable", "sad", "hopeful", "inspiring")


class User(Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    username: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    # nullable so the migration runs without a backfill; app layer enforces presence
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    palette: Mapped[str] = mapped_column(String(16), nullable=False, default="indigo")
    bio: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    letters: Mapped[list["Letter"]] = relationship(back_populates="author", cascade="all, delete-orphan")
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class RefreshToken(Base):
    """One row per issued refresh token. token_hash = SHA-256(raw_token)."""
    __tablename__ = "refresh_tokens"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    user: Mapped["User"] = relationship(back_populates="refresh_tokens")


class Letter(Base):
    __tablename__ = "letters"
    id: Mapped[int] = mapped_column(primary_key=True)
    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    excerpt: Mapped[str] = mapped_column(Text, nullable=False)
    mood: Mapped[str | None] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True
    )
    author: Mapped[User] = relationship(back_populates="letters")
    tags: Mapped[list["LetterTag"]] = relationship(back_populates="letter", cascade="all, delete-orphan")


class Tag(Base):
    __tablename__ = "tags"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)


class LetterTag(Base):
    __tablename__ = "letter_tags"
    letter_id: Mapped[int] = mapped_column(ForeignKey("letters.id", ondelete="CASCADE"), primary_key=True)
    tag_id: Mapped[int] = mapped_column(ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)
    letter: Mapped[Letter] = relationship(back_populates="tags")
    tag: Mapped[Tag] = relationship()


class Reaction(Base):
    __tablename__ = "reactions"
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    letter_id: Mapped[int] = mapped_column(ForeignKey("letters.id", ondelete="CASCADE"), primary_key=True)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    __table_args__ = (
        CheckConstraint(
            "kind IN ('like','thoughtful','relatable','sad','hopeful','inspiring')",
            name="ck_reaction_kind",
        ),
        Index("ix_reactions_letter", "letter_id"),
    )


class Comment(Base):
    __tablename__ = "comments"
    id: Mapped[int] = mapped_column(primary_key=True)
    letter_id: Mapped[int] = mapped_column(
        ForeignKey("letters.id", ondelete="CASCADE"), nullable=False, index=True
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("comments.id", ondelete="CASCADE"))
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    author: Mapped[User] = relationship()


class Follow(Base):
    __tablename__ = "follows"
    follower_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    followee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    __table_args__ = (CheckConstraint("follower_id <> followee_id", name="ck_follow_self"),)


class Save(Base):
    __tablename__ = "saves"
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    letter_id: Mapped[int] = mapped_column(ForeignKey("letters.id", ondelete="CASCADE"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class WeeklyPrompt(Base):
    __tablename__ = "weekly_prompts"
    id: Mapped[int] = mapped_column(primary_key=True)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    week_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, unique=True)
    active: Mapped[bool] = mapped_column(nullable=False, default=False)
    __table_args__ = (
        Index(
            "ux_weekly_prompts_one_active",
            "active",
            unique=True,
            postgresql_where=text("active = true"),
        ),
    )
