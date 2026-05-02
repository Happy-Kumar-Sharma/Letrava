"""/api/search?q= — search letters by title/body and users by username/bio."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from ..auth import get_optional_user
from ..db import get_db
from ..models import Follow, Letter, User
from ..schemas import LetterOut, UserPublic
from ..serializers import letter_to_dict

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("/letters", response_model=list[LetterOut])
def search_letters(
    q: str = Query("", min_length=0),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    viewer: Optional[User] = Depends(get_optional_user),
) -> list[dict]:
    if not q.strip():
        return []
    term = f"%{q.strip()}%"
    stmt = (
        select(Letter)
        .options(selectinload(Letter.author))
        .where(or_(Letter.title.ilike(term), Letter.body.ilike(term)))
        .order_by(Letter.created_at.desc())
        .limit(limit)
    )
    letters = db.scalars(stmt).all()
    viewer_id = viewer.id if viewer else None
    return [letter_to_dict(db, lt, viewer_id) for lt in letters]


@router.get("/users", response_model=list[UserPublic])
def search_users(
    q: str = Query("", min_length=0),
    limit: int = Query(10, ge=1, le=30),
    db: Session = Depends(get_db),
    viewer: Optional[User] = Depends(get_optional_user),
) -> list[UserPublic]:
    if not q.strip():
        # No query — return top users by follower count
        sub = (
            select(Follow.followee_id, func.count().label("fc"))
            .group_by(Follow.followee_id)
            .subquery()
        )
        stmt = (
            select(User)
            .outerjoin(sub, sub.c.followee_id == User.id)
            .order_by(func.coalesce(sub.c.fc, 0).desc())
            .limit(limit)
        )
    else:
        term = f"%{q.strip()}%"
        stmt = (
            select(User)
            .where(or_(User.username.ilike(term), User.bio.ilike(term)))
            .limit(limit)
        )

    users = db.scalars(stmt).all()
    viewer_id = viewer.id if viewer else None

    result = []
    for u in users:
        followers = db.scalar(select(func.count()).select_from(Follow).where(Follow.followee_id == u.id)) or 0
        following = db.scalar(select(func.count()).select_from(Follow).where(Follow.follower_id == u.id)) or 0
        letters_count = db.scalar(select(func.count()).select_from(Letter).where(Letter.author_id == u.id)) or 0
        is_following = False
        if viewer_id:
            is_following = (db.scalar(
                select(func.count()).select_from(Follow).where(
                    Follow.follower_id == viewer_id, Follow.followee_id == u.id
                )
            ) or 0) > 0
        result.append(UserPublic(
            id=u.id,
            username=u.username,
            palette=u.palette,
            bio=u.bio,
            avatar=u.avatar,
            letters_count=letters_count,
            followers_count=followers,
            following_count=following,
            is_following=is_following,
        ))
    return result
