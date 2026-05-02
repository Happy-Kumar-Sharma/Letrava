"""POST /api/auth/{signup,signin,refresh,signout}

Cookie spec
-----------
Name     : refresh_token
HttpOnly : True   — JS cannot read (XSS barrier)
Secure   : settings.SECURE_COOKIES (False in dev, True in prod over HTTPS)
SameSite : Lax    — CSRF protection for state-changing requests
Path     : /api/auth/refresh — cookie only sent on refresh calls, not all requests
Max-Age  : REFRESH_TOKEN_EXPIRE_DAYS * 86400

Rate limiting (add before go-live)
-----------------------------------
All endpoints need per-IP rate limits. Recommended: slowapi.
signup  → 5/hour, signin → 10/min (lockout after 5 failures), refresh → 60/min.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..auth import (
    _sha256,
    create_access_token,
    create_refresh_token,
    get_refresh_token_from_cookie,
    hash_password,
    revoke_all_refresh_tokens,
    rotate_refresh_token,
    verify_password,
)
from ..config import settings
from ..db import get_db
from ..models import RefreshToken, User
from ..schemas import SigninIn, SignupIn, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])

_COOKIE_NAME = "refresh_token"
_COOKIE_PATH = "/api/auth/refresh"
_COOKIE_MAX_AGE = settings.REFRESH_TOKEN_EXPIRE_DAYS * 86_400

# Dummy hash used in constant-time signin to prevent timing-based user enumeration.
# It is intentionally invalid — verify_password will always return False for it.
_DUMMY_HASH = "$2b$12$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa."


def _set_refresh_cookie(response: Response, raw_token: str) -> None:
    response.set_cookie(
        key=_COOKIE_NAME,
        value=raw_token,
        httponly=True,
        secure=settings.SECURE_COOKIES,
        samesite="lax",
        path=_COOKIE_PATH,
        max_age=_COOKIE_MAX_AGE,
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(key=_COOKIE_NAME, path=_COOKIE_PATH)


# ---------------------------------------------------------------------------
# POST /api/auth/signup
# ---------------------------------------------------------------------------

@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(body: SignupIn, response: Response, db: Session = Depends(get_db)) -> dict:
    """Create account and issue tokens in one request.

    Returns the same ambiguous 409 for duplicate email OR username to prevent
    email enumeration (attacker cannot tell which field conflicted).
    """
    # Check email first (cheaper than a flush + rollback)
    if db.scalar(select(User).where(User.email == body.email.lower().strip())):
        raise HTTPException(status.HTTP_409_CONFLICT, "Email or username already taken")

    user = User(
        id=uuid.uuid4(),
        email=body.email.lower().strip(),
        username=body.username,
        password_hash=hash_password(body.password),
        palette=body.palette,
        bio=body.bio.strip(),
    )
    db.add(user)
    try:
        db.flush()  # fires uniqueness check on username before commit
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Email or username already taken")

    raw_refresh = create_refresh_token(db, user.id)  # commits
    access_token = create_access_token(user.id, user.email)

    _set_refresh_cookie(response, raw_refresh)
    return {"access_token": access_token, "token_type": "bearer"}


# ---------------------------------------------------------------------------
# POST /api/auth/signin
# ---------------------------------------------------------------------------

@router.post("/signin", response_model=TokenResponse)
def signin(body: SigninIn, response: Response, db: Session = Depends(get_db)) -> dict:
    user = db.scalar(select(User).where(User.email == body.email.lower().strip()))

    # Always run bcrypt — prevents timing-based user enumeration
    stored_hash = (user.password_hash if user and user.password_hash else _DUMMY_HASH)
    password_ok = verify_password(body.password, stored_hash)

    if not password_ok or user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")

    raw_refresh = create_refresh_token(db, user.id)
    access_token = create_access_token(user.id, user.email)

    _set_refresh_cookie(response, raw_refresh)
    return {"access_token": access_token, "token_type": "bearer"}


# ---------------------------------------------------------------------------
# POST /api/auth/refresh
# ---------------------------------------------------------------------------

@router.post("/refresh", response_model=TokenResponse)
def refresh(
    response: Response,
    db: Session = Depends(get_db),
    raw_token: str = Depends(get_refresh_token_from_cookie),
) -> dict:
    """Rotate the refresh token and issue a new access token."""
    new_raw, user_id = rotate_refresh_token(db, raw_token)

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")

    access_token = create_access_token(user.id, user.email)
    _set_refresh_cookie(response, new_raw)
    return {"access_token": access_token, "token_type": "bearer"}


# ---------------------------------------------------------------------------
# POST /api/auth/signout
# ---------------------------------------------------------------------------

@router.post("/signout", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def signout(
    response: Response,
    db: Session = Depends(get_db),
    raw_token: str = Depends(get_refresh_token_from_cookie),
) -> None:
    """Revoke all refresh tokens for this user (signs out all devices)."""
    try:
        rt = db.query(RefreshToken).filter_by(token_hash=_sha256(raw_token)).first()
        if rt:
            revoke_all_refresh_tokens(db, rt.user_id)
    except Exception:
        pass  # always clear the cookie regardless
    _clear_refresh_cookie(response)
