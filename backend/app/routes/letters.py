"""/api/letters — create, list (trending/latest/following), retrieve, delete."""
from __future__ import annotations

from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ..auth import get_current_user, get_optional_user
from ..db import get_db
from ..models import Follow, Letter, Reaction, User
from ..schemas import LetterCreate, LetterOut
from ..serializers import excerpt_from, letter_to_dict, upsert_tags

router = APIRouter(prefix="/api/letters", tags=["letters"])


@router.post("", response_model=LetterOut, status_code=status.HTTP_201_CREATED)
def create_letter(
    body: LetterCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    letter = Letter(
        author_id=user.id,
        title=body.title.strip(),
        body=body.body,
        excerpt=excerpt_from(body.body),
        mood=body.mood,
    )
    db.add(letter)
    db.flush()
    upsert_tags(db, letter.id, body.tags)
    db.commit()
    db.refresh(letter)
    # Re-load with author eager
    letter = db.scalar(
        select(Letter).options(selectinload(Letter.author)).where(Letter.id == letter.id)
    )
    return letter_to_dict(db, letter, user.id)


@router.get("", response_model=list[LetterOut])
def list_letters(
    feed: Literal["trending", "latest", "following"] = Query("latest"),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    viewer: Optional[User] = Depends(get_optional_user),
) -> list[dict]:
    stmt = select(Letter).options(selectinload(Letter.author))
    if feed == "latest":
        stmt = stmt.order_by(Letter.created_at.desc())
    elif feed == "trending":
        # Trending: order by reaction count (last 7 days reactions weight, simple v1)
        sub = (
            select(Reaction.letter_id, func.count().label("rcount"))
            .group_by(Reaction.letter_id)
            .subquery()
        )
        stmt = (
            select(Letter)
            .options(selectinload(Letter.author))
            .outerjoin(sub, sub.c.letter_id == Letter.id)
            .order_by(func.coalesce(sub.c.rcount, 0).desc(), Letter.created_at.desc())
        )
    elif feed == "following":
        if viewer is None:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Login required for following feed")
        followee_ids = select(Follow.followee_id).where(Follow.follower_id == viewer.id)
        stmt = stmt.where(Letter.author_id.in_(followee_ids)).order_by(Letter.created_at.desc())

    stmt = stmt.limit(limit)
    letters = db.scalars(stmt).all()
    viewer_id = viewer.id if viewer else None
    return [letter_to_dict(db, lt, viewer_id) for lt in letters]


@router.get("/{letter_id}", response_model=LetterOut)
def get_letter(
    letter_id: int,
    db: Session = Depends(get_db),
    viewer: Optional[User] = Depends(get_optional_user),
) -> dict:
    letter = db.scalar(
        select(Letter).options(selectinload(Letter.author)).where(Letter.id == letter_id)
    )
    if not letter:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Letter not found")
    return letter_to_dict(db, letter, viewer.id if viewer else None)


@router.delete("/{letter_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_letter(
    letter_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    letter = db.get(Letter, letter_id)
    if not letter:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Letter not found")
    if letter.author_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your letter")
    db.delete(letter)
    db.commit()
