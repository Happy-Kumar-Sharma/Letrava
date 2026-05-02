"""/api/me — current user profile."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..db import get_db
from ..models import Follow, Letter, User
from ..schemas import UserOut, UserPublic

router = APIRouter(prefix="/api/me", tags=["me"])


@router.get("", response_model=UserOut)
def get_me(user: User = Depends(get_current_user)) -> UserOut:
    return user


@router.get("/profile", response_model=UserPublic)
def get_my_profile(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserPublic:
    letters_count = db.scalar(select(func.count()).select_from(Letter).where(Letter.author_id == user.id)) or 0
    followers = db.scalar(select(func.count()).select_from(Follow).where(Follow.followee_id == user.id)) or 0
    following = db.scalar(select(func.count()).select_from(Follow).where(Follow.follower_id == user.id)) or 0
    return UserPublic(
        id=user.id,
        username=user.username,
        palette=user.palette,
        bio=user.bio,
        letters_count=letters_count,
        followers_count=followers,
        following_count=following,
        is_following=False,
    )
