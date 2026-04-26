"""/api/users/{id}/follow — follow / unfollow another user."""
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
    followers = db.scalar(select(func.count()).select_from(Follow).where(Follow.followee_id == u.id)) or 0
    following = db.scalar(select(func.count()).select_from(Follow).where(Follow.follower_id == u.id)) or 0
    is_following = db.scalar(
        select(func.count()).select_from(Follow).where(
            Follow.follower_id == viewer.id, Follow.followee_id == u.id
        )
    ) > 0
    return UserPublic(
        id=u.id,
        username=u.username,
        palette=u.palette,
        bio=u.bio,
        letters_count=letters_count,
        followers_count=followers,
        following_count=following,
        is_following=is_following,
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

    existing = db.scalar(
        select(Follow).where(Follow.follower_id == viewer.id, Follow.followee_id == target.id)
    )
    if not existing:
        db.add(Follow(follower_id=viewer.id, followee_id=target.id))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
    followers = db.scalar(
        select(func.count()).select_from(Follow).where(Follow.followee_id == target.id)
    ) or 0
    return FollowOut(is_following=True, followers_count=followers)


@router.delete("/{user_id}/follow", response_model=FollowOut)
def unfollow_user(
    user_id: uuid.UUID,
    viewer: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FollowOut:
    if user_id == viewer.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot unfollow yourself")
    existing = db.scalar(
        select(Follow).where(Follow.follower_id == viewer.id, Follow.followee_id == user_id)
    )
    if existing:
        db.delete(existing)
        db.commit()
    followers = db.scalar(
        select(func.count()).select_from(Follow).where(Follow.followee_id == user_id)
    ) or 0
    return FollowOut(is_following=False, followers_count=followers)
