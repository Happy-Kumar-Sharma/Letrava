"""/api/letters/{id}/comments — list with one-level replies, post.

The schema allows arbitrary depth via parent_id self-FK; this layer rejects
replies whose parent itself has a parent (i.e. only one level of reply).
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..auth import get_current_user
from ..db import get_db
from ..models import Comment, Letter, User
from ..schemas import CommentCreate, CommentOut
from ..serializers import author_dict, humanize_age

router = APIRouter(prefix="/api/letters/{letter_id}/comments", tags=["comments"])


def _to_dict(c: Comment, replies: list[Comment] | None = None) -> dict:
    return {
        "id": c.id,
        "body": c.body,
        "age": humanize_age(c.created_at),
        "created_at": c.created_at,
        "author": author_dict(c.author),
        "parent_id": c.parent_id,
        "replies": [_to_dict(r, []) for r in (replies or [])],
    }


@router.get("", response_model=list[CommentOut])
def list_comments(
    letter_id: int,
    db: Session = Depends(get_db),
) -> list[dict]:
    if not db.get(Letter, letter_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Letter not found")

    rows = db.scalars(
        select(Comment)
        .options(selectinload(Comment.author))
        .where(Comment.letter_id == letter_id)
        .order_by(Comment.created_at.asc())
    ).all()

    by_parent: dict[int, list[Comment]] = {}
    roots: list[Comment] = []
    for c in rows:
        if c.parent_id is None:
            roots.append(c)
        else:
            by_parent.setdefault(c.parent_id, []).append(c)

    return [_to_dict(r, by_parent.get(r.id, [])) for r in roots]


@router.post("", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
def post_comment(
    letter_id: int,
    body: CommentCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    if not db.get(Letter, letter_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Letter not found")

    if body.parent_id is not None:
        parent = db.get(Comment, body.parent_id)
        if not parent or parent.letter_id != letter_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Parent comment not found")
        if parent.parent_id is not None:
            # one-level reply rule
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Replies can only nest one level deep",
            )

    c = Comment(
        letter_id=letter_id,
        author_id=user.id,
        parent_id=body.parent_id,
        body=body.body,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    # eager-load author so the response shape matches
    c = db.scalar(select(Comment).options(selectinload(Comment.author)).where(Comment.id == c.id))
    return _to_dict(c, [])
