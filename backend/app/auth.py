"""Custom JWT authentication — no Supabase dependency.

Token model
-----------
Access token : HS256 JWT, 15-min TTL, carries sub (user UUID) + email.
               Sent by client as  Authorization: Bearer <token>.
Refresh token: 32-byte cryptographically-random opaque string, 30-day TTL.
               Stored as SHA-256(token) in refresh_tokens table.
               Sent/received via HttpOnly cookie on Path=/api/auth/refresh only.

Security properties
-------------------
* bcrypt cost-12 via passlib — ~300 ms/hash, brute-force resistant.
* JWT secret loaded from env; startup fails if absent.
* Refresh token rotation on every use; reuse of a revoked token kills ALL
  sessions for that user (replay-attack kill-switch).
* Timing-safe signin: bcrypt always runs even when email is unknown.
* SHA-256 storage: raw token never touches the DB.
"""
from __future__ import annotations

import base64
import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt as _bcrypt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db
from .models import RefreshToken, User

# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------
# We call bcrypt directly (not via passlib) to avoid a passlib 1.7.4 / bcrypt 4.x+
# incompatibility where passlib's wrapper triggers the 72-byte check on the raw
# password before our pre-hash can run.
#
# Pre-hashing with SHA-256 + base64 produces a fixed 44-byte string, so bcrypt
# never sees more than 72 bytes regardless of how long the original password is.

_BCRYPT_ROUNDS = 12


def _prehash(plain: str) -> bytes:
    """Return SHA-256(password) base64-encoded as bytes — always 44 bytes."""
    return base64.b64encode(hashlib.sha256(plain.encode()).digest())


def hash_password(plain: str) -> str:
    return _bcrypt.hashpw(_prehash(plain), _bcrypt.gensalt(rounds=_BCRYPT_ROUNDS)).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _bcrypt.checkpw(_prehash(plain), hashed.encode())
    except Exception:
        return False


# ---------------------------------------------------------------------------
# JWT (access tokens)
# ---------------------------------------------------------------------------

_ALGORITHM = "HS256"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(user_id: uuid.UUID, email: str) -> str:
    expire = _utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": expire,
        "iat": _utcnow(),
        "jti": secrets.token_hex(8),  # unique per token — enables future denylist
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=_ALGORITHM)


def _decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[_ALGORITHM])
    except JWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Invalid token: {exc}")


# ---------------------------------------------------------------------------
# Refresh tokens (opaque, stored hashed)
# ---------------------------------------------------------------------------

def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def create_refresh_token(db: Session, user_id: uuid.UUID) -> str:
    """Mint a new opaque refresh token, persist its hash, return the raw value."""
    raw = secrets.token_urlsafe(32)  # 256 bits of entropy
    rt = RefreshToken(
        id=uuid.uuid4(),
        user_id=user_id,
        token_hash=_sha256(raw),
        expires_at=_utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        revoked=False,
    )
    db.add(rt)
    db.commit()
    return raw


def rotate_refresh_token(db: Session, raw_token: str) -> tuple[str, uuid.UUID]:
    """Validate and revoke the incoming token, issue a new one.

    Returns (new_raw_token, user_id).
    On reuse of a revoked token: revokes ALL tokens for that user (kill-switch).
    """
    token_hash = _sha256(raw_token)
    rt = db.query(RefreshToken).filter_by(token_hash=token_hash).first()

    if rt is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh token not found")
    if rt.revoked:
        # Possible replay attack — revoke every session for this user
        db.query(RefreshToken).filter_by(user_id=rt.user_id).update({"revoked": True})
        db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired — please sign in again")
    if rt.expires_at.replace(tzinfo=timezone.utc) < _utcnow():
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh token expired")

    rt.revoked = True
    db.flush()

    new_raw = create_refresh_token(db, rt.user_id)
    return new_raw, rt.user_id


def revoke_all_refresh_tokens(db: Session, user_id: uuid.UUID) -> None:
    db.query(RefreshToken).filter_by(user_id=user_id).update({"revoked": True})
    db.commit()


# ---------------------------------------------------------------------------
# FastAPI dependency injection
# Public interface is signature-compatible with old auth.py — no route changes needed.
# ---------------------------------------------------------------------------

_bearer = HTTPBearer(auto_error=False)


def _resolve_token(
    request: Request,
    creds: Optional[HTTPAuthorizationCredentials],
) -> Optional[str]:
    """httpOnly cookie takes precedence; Bearer header accepted as fallback."""
    return request.cookies.get("access_token") or (creds.credentials if creds else None)


def get_current_user(
    request: Request,
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    token = _resolve_token(request, creds)
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    payload = _decode_access_token(token)
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token missing sub")
    user = db.get(User, uuid.UUID(sub))
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user


def get_optional_user(
    request: Request,
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
) -> Optional[User]:
    token = _resolve_token(request, creds)
    if not token:
        return None
    try:
        payload = _decode_access_token(token)
    except HTTPException:
        return None
    sub = payload.get("sub")
    if not sub:
        return None
    return db.get(User, uuid.UUID(sub))


def get_refresh_token_from_cookie(request: Request) -> str:
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing refresh token cookie")
    return token
