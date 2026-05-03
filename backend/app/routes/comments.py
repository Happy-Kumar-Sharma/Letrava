"""/api/letters/{id}/comments — list with one-level replies, post, like/unlike."""
from __future__ import annotations

import uuid as _uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ..auth import get_current_user, get_optional_user
from ..db import get_db
from ..models import Comment, CommentLike, Letter, User
from ..schemas import CommentCreate, CommentOut
from ..serializers import author_dict, humanize_age

router = APIRouter(prefix="/api/letters/{letter_id}/comments", tags=["comments"])


def _to_dict(
    c: Comment,
    replies: list[Comment] | None = None,
    likes_count: int = 0,
    liked_by_me: bool = False,
    reply_likes: dict[int, tuple[int, bool]] | None = None,
) -> dict:
    reply_likes = reply_likes or {}
    return {
        "id": c.id,
        "body": c.body,
        "age": humanize_age(c.created_at),
        "created_at": c.created_at,
        "author": author_dict(c.author),
        "parent_id": c.parent_id,
        "likes_count": likes_count,
        "liked_by_me": liked_by_me,
        "replies": [
            _to_dict(
                r,
                [],
                reply_likes.get(r.id, (0, False))[0],
                reply_likes.get(r.id, (0, False))[1],
            )
            for r in (replies or [])
        ],
    }


@router.get("", response_model=list[CommentOut])
def list_comments(
    letter_id: int,
    db: Session = Depends(get_db),
    viewer: Optional[User] = Depends(get_optional_user),
) -> list[dict]:
    if not db.get(Letter, letter_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Letter not found")

    rows = db.scalars(
        select(Comment)
        .options(selectinload(Comment.author))
        .where(Comment.letter_id == letter_id)
        .order_by(Comment.created_at.asc())
    ).all()

    all_ids = [c.id for c in rows]
    if not all_ids:
        return []

    # Bulk fetch like counts
    like_rows = db.execute(
        select(CommentLike.comment_id, func.count().label("cnt"))
        .where(CommentLike.comment_id.in_(all_ids))
        .group_by(CommentLike.comment_id)
    ).all()
    likes_map: dict[int, int] = {r.comment_id: r.cnt for r in like_rows}

    # Bulk fetch viewer's likes
    viewer_likes: set[int] = set()
    if viewer:
        vl_rows = db.scalars(
            select(CommentLike.comment_id).where(
                CommentLike.user_id == viewer.id,
                CommentLike.comment_id.in_(all_ids),
            )
        ).all()
        viewer_likes = set(vl_rows)

    by_parent: dict[int, list[Comment]] = {}
    roots: list[Comment] = []
    for c in rows:
        if c.parent_id is None:
            roots.append(c)
        else:
            by_parent.setdefault(c.parent_id, []).append(c)

    result = []
    for root in roots:
        reply_list = by_parent.get(root.id, [])
        reply_likes = {r.id: (likes_map.get(r.id, 0), r.id in viewer_likes) for r in reply_list}
        result.append(_to_dict(
            root,
            reply_list,
            likes_map.get(root.id, 0),
            root.id in viewer_likes,
            reply_likes,
        ))
    return result


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
    c = db.scalar(select(Comment).options(selectinload(Comment.author)).where(Comment.id == c.id))
    return _to_dict(c, [], 0, False)


@router.post("/{comment_id}/like", status_code=status.HTTP_200_OK)
def toggle_like(
    letter_id: int,
    comment_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    comment = db.get(Comment, comment_id)
    if not comment or comment.letter_id != letter_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Comment not found")

    existing = db.scalar(
        select(CommentLike).where(
            CommentLike.user_id == user.id,
            CommentLike.comment_id == comment_id,
        )
    )
    if existing:
        db.delete(existing)
        liked = False
    else:
        db.add(CommentLike(user_id=user.id, comment_id=comment_id))
        liked = True
    db.commit()

    count = db.scalar(
        select(func.count()).select_from(CommentLike).where(CommentLike.comment_id == comment_id)
    ) or 0
    return {"liked": liked, "likes_count": count}
