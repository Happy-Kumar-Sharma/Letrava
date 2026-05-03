"""POST /api/auth/{signup,signin,refresh,signout}  GET /api/auth/me

Cookie spec — refresh_token
---------------------------
HttpOnly : True
Secure   : settings.SECURE_COOKIES (False in dev, True in prod)
SameSite : Lax
Path     : /api/auth/refresh
Max-Age  : REFRESH_TOKEN_EXPIRE_DAYS * 86400

Cookie spec — access_token  (NEW)
----------------------------------
HttpOnly : True  — JS cannot read; no XSS risk
Secure   : settings.SECURE_COOKIES
SameSite : Lax
Path     : /api  — sent on every API call automatically
Max-Age  : ACCESS_TOKEN_EXPIRE_MINUTES * 60

The frontend no longer sends an Authorization header; the browser sends the
access_token cookie on every /api/* fetch (credentials: "include").
Authorization: Bearer is still accepted as a fallback for non-browser clients.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..auth import (
    _sha256,
    _bearer,
    _resolve_token,
    _decode_access_token,
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

_REFRESH_COOKIE     = "refresh_token"
_REFRESH_COOKIE_PATH = "/api/auth/refresh"
_REFRESH_MAX_AGE    = settings.REFRESH_TOKEN_EXPIRE_DAYS * 86_400

_ACCESS_COOKIE      = "access_token"
_ACCESS_COOKIE_PATH = "/api"
_ACCESS_MAX_AGE     = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

_DUMMY_HASH = "$2b$12$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa."


def _set_refresh_cookie(response: Response, raw_token: str) -> None:
    response.set_cookie(
        key=_REFRESH_COOKIE,
        value=raw_token,
        httponly=True,
        secure=settings.SECURE_COOKIES,
        samesite="lax",
        path=_REFRESH_COOKIE_PATH,
        max_age=_REFRESH_MAX_AGE,
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(key=_REFRESH_COOKIE, path=_REFRESH_COOKIE_PATH)


def _set_access_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=_ACCESS_COOKIE,
        value=token,
        httponly=True,
        secure=settings.SECURE_COOKIES,
        samesite="lax",
        path=_ACCESS_COOKIE_PATH,
        max_age=_ACCESS_MAX_AGE,
    )


def _clear_access_cookie(response: Response) -> None:
    response.delete_cookie(key=_ACCESS_COOKIE, path=_ACCESS_COOKIE_PATH)


# ---------------------------------------------------------------------------
# GET /api/auth/me  — lightweight auth check
# ---------------------------------------------------------------------------

@router.get("/me")
def check_auth(
    request: Request,
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> dict:
    """Returns minimal user info when authenticated; 401 otherwise.
    Used by the frontend on startup to determine login state."""
    import uuid as _uuid
    token = _resolve_token(request, creds)
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    payload = _decode_access_token(token)
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    user = db.get(User, _uuid.UUID(sub))
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return {"id": str(user.id), "username": user.username, "palette": user.palette, "avatar": user.avatar}


# ---------------------------------------------------------------------------
# POST /api/auth/signup
# ---------------------------------------------------------------------------

@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(body: SignupIn, response: Response, db: Session = Depends(get_db)) -> dict:
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
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Email or username already taken")

    raw_refresh = create_refresh_token(db, user.id)
    access_token = create_access_token(user.id, user.email)

    _set_refresh_cookie(response, raw_refresh)
    _set_access_cookie(response, access_token)
    return {"access_token": access_token, "token_type": "bearer"}


# ---------------------------------------------------------------------------
# POST /api/auth/signin
# ---------------------------------------------------------------------------

@router.post("/signin", response_model=TokenResponse)
def signin(body: SigninIn, response: Response, db: Session = Depends(get_db)) -> dict:
    user = db.scalar(select(User).where(User.email == body.email.lower().strip()))

    stored_hash = (user.password_hash if user and user.password_hash else _DUMMY_HASH)
    password_ok = verify_password(body.password, stored_hash)

    if not password_ok or user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")

    raw_refresh = create_refresh_token(db, user.id)
    access_token = create_access_token(user.id, user.email)

    _set_refresh_cookie(response, raw_refresh)
    _set_access_cookie(response, access_token)
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
    new_raw, user_id = rotate_refresh_token(db, raw_token)

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")

    access_token = create_access_token(user.id, user.email)
    _set_refresh_cookie(response, new_raw)
    _set_access_cookie(response, access_token)
    return {"access_token": access_token, "token_type": "bearer"}


# ---------------------------------------------------------------------------
# POST /api/auth/signout
# ---------------------------------------------------------------------------

@router.post("/signout", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def signout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> None:
    """Revoke all refresh tokens and clear both auth cookies."""
    try:
        raw_token = request.cookies.get(_REFRESH_COOKIE)
        if raw_token:
            rt = db.query(RefreshToken).filter_by(token_hash=_sha256(raw_token)).first()
            if rt:
                revoke_all_refresh_tokens(db, rt.user_id)
    except Exception:
        pass  # always clear cookies regardless
    _clear_refresh_cookie(response)
    _clear_access_cookie(response)
