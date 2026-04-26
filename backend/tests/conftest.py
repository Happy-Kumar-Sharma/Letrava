"""Test harness — TestClient against the embedded Postgres, JWTs minted locally."""
from __future__ import annotations

import os
import uuid
from typing import Iterator

import pytest
from fastapi.testclient import TestClient
from jose import jwt

os.environ.setdefault("SUPABASE_JWT_SECRET", "test-secret-do-not-use")
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg://postgres:@/postgres?host=/tmp/pgdata",
)

from app.config import settings  # noqa: E402
from app.db import Base, engine, SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Letter, User, WeeklyPrompt  # noqa: F401, E402


@pytest.fixture(scope="session", autouse=True)
def _schema() -> Iterator[None]:
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture(autouse=True)
def _clean_tables() -> Iterator[None]:
    yield
    with engine.begin() as conn:
        for tbl in reversed(Base.metadata.sorted_tables):
            conn.exec_driver_sql(f'TRUNCATE TABLE "{tbl.name}" RESTART IDENTITY CASCADE')


def make_token(sub: uuid.UUID, email: str) -> str:
    return jwt.encode(
        {"sub": str(sub), "email": email, "aud": "authenticated"},
        settings.SUPABASE_JWT_SECRET,
        algorithm="HS256",
    )


class UserCtx:
    def __init__(self, sub, email, token):
        self.sub = sub
        self.email = email
        self.token = token

    @property
    def headers(self):
        return {"Authorization": f"Bearer {self.token}"}


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def user_factory():
    counter = {"n": 0}

    def _make(client, username=None, palette="indigo"):
        counter["n"] += 1
        sub = uuid.uuid4()
        email = f"u{counter['n']}@example.com"
        token = make_token(sub, email)
        ctx = UserCtx(sub, email, token)
        final_name = username if username else f"user{counter['n']}"
        r = client.post(
            "/api/me/init",
            headers=ctx.headers,
            json={"username": final_name, "palette": palette, "bio": ""},
        )
        assert r.status_code == 201, r.text
        return ctx

    return _make


@pytest.fixture
def db_session():
    s = SessionLocal()
    try:
        yield s
    finally:
        s.close()
