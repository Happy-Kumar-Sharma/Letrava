"""Shared shape helpers — keeps the API matched to the existing frontend."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Iterable, Optional
import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .models import Comment, Letter, LetterTag, Reaction, Save, Tag, User


def humanize_age(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    delta = datetime.now(timezone.utc) - dt
    s = int(delta.total_seconds())
    if s < 60:
        return "just now"
    m = s // 60
    if m < 60:
        return f"{m}m"
    h = m // 60
    if h < 24:
        return f"{h}h"
    d = h // 24
    if d < 7:
        return f"{d}d"
    w = d // 7
    if w < 5:
        return f"{w}w"
    return f"{d // 30}mo"


def read_time(body: str) -> str:
    words = len(body.split())
    return f"{max(1, round(words / 220))} min"


def excerpt_from(body: str) -> str:
    para = body.split("\n\n", 1)[0].strip()
    return para[:240]


def author_dict(u: User) -> dict:
    return {"id": u.id, "name": u.username, "palette": u.palette, "avatar": u.avatar}


def letter_to_dict(
    db: Session,
    letter: Letter,
    viewer_id: Optional[uuid.UUID],
) -> dict:
    rcount = db.scalar(select(func.count()).select_from(Reaction).where(Reaction.letter_id == letter.id)) or 0
    ccount = db.scalar(select(func.count()).select_from(Comment).where(Comment.letter_id == letter.id)) or 0
    scount = db.scalar(select(func.count()).select_from(Save).where(Save.letter_id == letter.id)) or 0

    saved = False
    my_reaction = None
    if viewer_id is not None:
        saved = db.scalar(
            select(func.count()).select_from(Save).where(
                Save.letter_id == letter.id, Save.user_id == viewer_id
            )
        ) > 0
        r = db.scalar(
            select(Reaction).where(Reaction.letter_id == letter.id, Reaction.user_id == viewer_id)
        )
        my_reaction = r.kind if r else None

    tag_names = [
        n for (n,) in db.execute(
            select(Tag.name).join(LetterTag, LetterTag.tag_id == Tag.id).where(LetterTag.letter_id == letter.id)
        ).all()
    ]

    return {
        "id": letter.id,
        "title": letter.title,
        "body": letter.body,
        "excerpt": letter.excerpt,
        "tags": tag_names,
        "mood": letter.mood,
        "age": humanize_age(letter.created_at),
        "read_time": read_time(letter.body),
        "created_at": letter.created_at,
        "author": author_dict(letter.author),
        "reactions": rcount,
        "comments": ccount,
        "saves": scount,
        "saved": saved,
        "my_reaction": my_reaction,
        "share_code": letter.share_code,
    }


def upsert_tags(db: Session, letter_id: int, names: Iterable[str]) -> None:
    db.execute(LetterTag.__table__.delete().where(LetterTag.letter_id == letter_id))
    for raw in names:
        name = raw.strip().lstrip("#").lower()
        if not name:
            continue
        tag = db.scalar(select(Tag).where(Tag.name == name))
        if not tag:
            tag = Tag(name=name)
            db.add(tag)
            db.flush()
        db.add(LetterTag(letter_id=letter_id, tag_id=tag.id))
