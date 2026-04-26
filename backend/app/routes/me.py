"""/api/me — current user init + profile."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..auth import Principal, get_current_user, get_principal
from ..db import get_db
from ..models import Follow, Letter, User
from ..schemas import UserInit, UserOut, UserPublic

router = APIRouter(prefix="/api/me", tags=["me"])


@router.post("/init", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def init_user(
    body: UserInit,
    p: Principal = Depends(get_principal),
    db: Session = Depends(get_db),
) -> UserOut:
    """First call after a magic-link signup — creates the app row for this auth user."""
    existing = db.get(User, p.sub)
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "User already initialized")
    user = User(
        id=p.sub,
        email=p.email,
        username=body.username.strip(),
        palette=body.palette,
        bio=body.bio or "",
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Username already taken")
    db.refresh(user)
    return user


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
