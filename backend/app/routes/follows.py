"""/api/users/{id} — profile + follow / unfollow + notify toggle."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..db import get_db
from ..models import Follow, Letter, User
from ..schemas import FollowOut, UserPublic

router = APIRouter(prefix="/api/users", tags=["follows"])


def _follow_row(db: Session, follower_id: uuid.UUID, followee_id: uuid.UUID):
    return db.scalar(
        select(Follow).where(
            Follow.follower_id == follower_id,
            Follow.followee_id == followee_id,
        )
    )


@router.get("/{user_id}", response_model=UserPublic)
def get_user(
    user_id: uuid.UUID,
    viewer: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserPublic:
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    letters_count = db.scalar(select(func.count()).select_from(Letter).where(Letter.author_id == u.id)) or 0
    followers     = db.scalar(select(func.count()).select_from(Follow).where(Follow.followee_id == u.id)) or 0
    following     = db.scalar(select(func.count()).select_from(Follow).where(Follow.follower_id == u.id)) or 0
    follow_row    = _follow_row(db, viewer.id, u.id)
    return UserPublic(
        id=u.id,
        username=u.username,
        palette=u.palette,
        bio=u.bio,
        avatar=u.avatar,
        letters_count=letters_count,
        followers_count=followers,
        following_count=following,
        is_following=follow_row is not None,
        notify_new_letters=follow_row.notify_new_letters if follow_row else False,
    )


@router.post("/{user_id}/follow", response_model=FollowOut, status_code=status.HTTP_200_OK)
def follow_user(
    user_id: uuid.UUID,
    viewer: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FollowOut:
    if user_id == viewer.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot follow yourself")
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    existing = _follow_row(db, viewer.id, target.id)
    if not existing:
        db.add(Follow(follower_id=viewer.id, followee_id=target.id, notify_new_letters=True))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
    followers = db.scalar(
        select(func.count()).select_from(Follow).where(Follow.followee_id == target.id)
    ) or 0
    updated = _follow_row(db, viewer.id, target.id)
    return FollowOut(
        is_following=True,
        followers_count=followers,
        notify_new_letters=updated.notify_new_letters if updated else True,
    )


@router.delete("/{user_id}/follow", response_model=FollowOut)
def unfollow_user(
    user_id: uuid.UUID,
    viewer: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FollowOut:
    if user_id == viewer.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot unfollow yourself")
    existing = _follow_row(db, viewer.id, user_id)
    if existing:
        db.delete(existing)
        db.commit()
    followers = db.scalar(
        select(func.count()).select_from(Follow).where(Follow.followee_id == user_id)
    ) or 0
    return FollowOut(is_following=False, followers_count=followers, notify_new_letters=False)


@router.patch("/{user_id}/follow/notify", status_code=status.HTTP_200_OK)
def toggle_notify(
    user_id: uuid.UUID,
    viewer: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Toggle notify_new_letters for a followed user."""
    follow = _follow_row(db, viewer.id, user_id)
    if not follow:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "You are not following this user")
    follow.notify_new_letters = not follow.notify_new_letters
    db.commit()
    return {"notify_new_letters": follow.notify_new_letters}
