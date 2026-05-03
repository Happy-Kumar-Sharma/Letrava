"""/api/notifications — recent activity directed at the current user.

Synthesises from existing tables (no new migration needed):
  - reactions on the user's letters by other users
  - comments on the user's letters by other users
  - follows of the user by other users
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, aliased

from ..auth import get_current_user
from ..db import get_db
from ..models import Comment, Follow, Letter, Reaction, User
from ..serializers import humanize_age

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

_LIMIT = 30
_UNREAD_WINDOW = timedelta(hours=24)


def _unread(dt: datetime) -> bool:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - dt) < _UNREAD_WINDOW


def _actor_dict(u: User) -> dict:
    return {"username": u.username, "palette": u.palette, "avatar": u.avatar}


@router.get("")
def get_notifications(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    items: list[dict] = []

    # --- reactions on my letters by others ---
    Actor = aliased(User)
    rows = db.execute(
        select(Reaction.kind, Reaction.created_at, Actor, Letter.title)
        .join(Letter, Letter.id == Reaction.letter_id)
        .join(Actor, Actor.id == Reaction.user_id)
        .where(Letter.author_id == user.id, Reaction.user_id != user.id)
        .order_by(Reaction.created_at.desc())
        .limit(_LIMIT)
    ).all()
    for kind, created_at, actor, letter_title in rows:
        items.append({
            "id": f"rx-{actor.id}-{letter_title[:20]}-{created_at.isoformat()}",
            "kind": "reaction",
            "actor": _actor_dict(actor),
            "what": f"reacted {kind.capitalize()} to your letter",
            "letter_title": letter_title,
            "age": humanize_age(created_at),
            "unread": _unread(created_at),
            "created_at": created_at,
        })

    # --- comments on my letters by others ---
    Commenter = aliased(User)
    crow = db.execute(
        select(Comment.id, Comment.created_at, Commenter, Letter.title)
        .join(Letter, Letter.id == Comment.letter_id)
        .join(Commenter, Commenter.id == Comment.author_id)
        .where(Letter.author_id == user.id, Comment.author_id != user.id)
        .order_by(Comment.created_at.desc())
        .limit(_LIMIT)
    ).all()
    for cid, created_at, commenter, letter_title in crow:
        items.append({
            "id": f"cm-{cid}",
            "kind": "comment",
            "actor": _actor_dict(commenter),
            "what": "commented on your letter",
            "letter_title": letter_title,
            "age": humanize_age(created_at),
            "unread": _unread(created_at),
            "created_at": created_at,
        })

    # --- new followers ---
    Follower = aliased(User)
    frow = db.execute(
        select(Follow.created_at, Follower)
        .join(Follower, Follower.id == Follow.follower_id)
        .where(Follow.followee_id == user.id)
        .order_by(Follow.created_at.desc())
        .limit(_LIMIT)
    ).all()
    for created_at, follower in frow:
        items.append({
            "id": f"fl-{follower.id}",
            "kind": "follow",
            "actor": _actor_dict(follower),
            "what": "started following you",
            "letter_title": None,
            "age": humanize_age(created_at),
            "unread": _unread(created_at),
            "created_at": created_at,
        })

    # --- new letters from users I follow with notify=True ---
    NLAuthor = aliased(User)
    nlrows = db.execute(
        select(Letter.id, Letter.created_at, Letter.title, NLAuthor)
        .join(NLAuthor, NLAuthor.id == Letter.author_id)
        .join(
            Follow,
            (Follow.followee_id == Letter.author_id) & (Follow.follower_id == user.id),
        )
        .where(
            Follow.notify_new_letters == True,  # noqa: E712
            Letter.author_id != user.id,
        )
        .order_by(Letter.created_at.desc())
        .limit(_LIMIT)
    ).all()
    for lid, created_at, title, author in nlrows:
        items.append({
            "id": f"nl-{lid}",
            "kind": "new_letter",
            "actor": _actor_dict(author),
            "what": "posted a new letter",
            "letter_title": title,
            "age": humanize_age(created_at),
            "unread": _unread(created_at),
            "created_at": created_at,
        })

    # --- @mentions in comment bodies ---
    Mentioner = aliased(User)
    mrow = db.execute(
        select(Comment.id, Comment.created_at, Mentioner, Letter.title)
        .join(Letter, Letter.id == Comment.letter_id)
        .join(Mentioner, Mentioner.id == Comment.author_id)
        .where(
            Comment.body.ilike(f'%@{user.username}%'),
            Comment.author_id != user.id,
        )
        .order_by(Comment.created_at.desc())
        .limit(_LIMIT)
    ).all()
    for cid, created_at, mentioner, letter_title in mrow:
        items.append({
            "id": f"mn-{cid}",
            "kind": "mention",
            "actor": _actor_dict(mentioner),
            "what": "mentioned you in a comment",
            "letter_title": letter_title,
            "age": humanize_age(created_at),
            "unread": _unread(created_at),
            "created_at": created_at,
        })

    items.sort(key=lambda x: x["created_at"], reverse=True)
    for item in items:
        del item["created_at"]
    # Deduplicate (a comment might match both 'reaction on my letter' path and 'mention' path)
    seen: set[str] = set()
    unique = []
    for item in items:
        if item["id"] not in seen:
            seen.add(item["id"])
            unique.append(item)
    return unique[:_LIMIT]
