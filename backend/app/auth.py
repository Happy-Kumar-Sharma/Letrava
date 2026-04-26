"""Verify Supabase-issued JWTs and resolve to app User row."""
from __future__ import annotations

import uuid
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db
from .models import User


bearer = HTTPBearer(auto_error=False)


def _decode(token: str) -> dict:
    try:
        return jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except JWTError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Invalid token: {e}")


class Principal:
    """Verified Supabase identity (may not yet have an app User row)."""
    def __init__(self, sub: uuid.UUID, email: str):
        self.sub = sub
        self.email = email


def get_principal(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
) -> Principal:
    if not creds:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    payload = _decode(creds.credentials)
    sub = payload.get("sub")
    email = payload.get("email") or ""
    if not sub:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token missing sub")
    return Principal(uuid.UUID(sub), email)


def get_current_user(
    p: Principal = Depends(get_principal),
    db: Session = Depends(get_db),
) -> User:
    u = db.get(User, p.sub)
    if not u:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "App user not initialized — call POST /api/me/init with username",
        )
    return u


def get_optional_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
    db: Session = Depends(get_db),
) -> Optional[User]:
    if not creds:
        return None
    try:
        payload = _decode(creds.credentials)
    except HTTPException:
        return None
    sub = payload.get("sub")
    if not sub:
        return None
    return db.get(User, uuid.UUID(sub))
