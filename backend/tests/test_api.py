"""Integration tests covering all routes + schema invariants."""
from __future__ import annotations

from datetime import datetime, timezone

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.db import engine
from app.models import WeeklyPrompt


# ---------- /api/me ----------

def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"ok": True}


def test_me_init_and_get(client, user_factory):
    u = user_factory(client, username="alice")
    r = client.get("/api/me", headers=u.headers)
    assert r.status_code == 200
    body = r.json()
    assert body["username"] == "alice"
    assert body["email"] == u.email
    assert body["palette"] == "indigo"


def test_me_init_duplicate_username_409(client, user_factory):
    user_factory(client, username="dup")
    # Second user, same username
    import uuid
    from tests.conftest import make_token
    sub = uuid.uuid4()
    tok = make_token(sub, "dup2@example.com")
    r = client.post(
        "/api/me/init",
        headers={"Authorization": f"Bearer {tok}"},
        json={"username": "dup", "palette": "indigo"},
    )
    assert r.status_code == 409


def test_me_unauth(client):
    r = client.get("/api/me")
    assert r.status_code == 401


# ---------- /api/letters ----------

def _create_letter(client, u, **kw):
    payload = {
        "title": "A note",
        "body": "Hello world.\n\nThis is a longer body for a letter.",
        "tags": ["#hope", "future"],
        "mood": "hopeful",
        **kw,
    }
    r = client.post("/api/letters", headers=u.headers, json=payload)
    assert r.status_code == 201, r.text
    return r.json()


def test_letter_create_and_get(client, user_factory):
    u = user_factory(client)
    lt = _create_letter(client, u, title="My first letter")
    assert lt["title"] == "My first letter"
    assert lt["author"]["name"] == "user1"
    assert set(lt["tags"]) == {"hope", "future"}  # normalized
    assert lt["read_time"].endswith("min")

    r = client.get(f"/api/letters/{lt['id']}")
    assert r.status_code == 200
    assert r.json()["id"] == lt["id"]


def test_letter_list_latest(client, user_factory):
    u = user_factory(client)
    _create_letter(client, u, title="One")
    _create_letter(client, u, title="Two")
    r = client.get("/api/letters?feed=latest")
    assert r.status_code == 200
    titles = [lt["title"] for lt in r.json()]
    assert titles == ["Two", "One"]  # newest first


def test_letter_list_following_requires_auth(client, user_factory):
    u = user_factory(client)
    _create_letter(client, u)
    # Anonymous request to following — should be 401
    r = client.get("/api/letters?feed=following")
    assert r.status_code == 401


def test_letter_following_feed_filters_by_follows(client, user_factory):
    a = user_factory(client, username="alpha")
    b = user_factory(client, username="bravo")
    _create_letter(client, a, title="from-a")
    _create_letter(client, b, title="from-b")
    # b follows a
    r = client.post(f"/api/users/{a.sub}/follow", headers=b.headers)
    assert r.status_code == 200
    r = client.get("/api/letters?feed=following", headers=b.headers)
    assert r.status_code == 200
    titles = [lt["title"] for lt in r.json()]
    assert titles == ["from-a"]


def test_letter_delete_requires_owner(client, user_factory):
    a = user_factory(client, username="owner")
    b = user_factory(client, username="other")
    lt = _create_letter(client, a)
    r = client.delete(f"/api/letters/{lt['id']}", headers=b.headers)
    assert r.status_code == 403
    r = client.delete(f"/api/letters/{lt['id']}", headers=a.headers)
    assert r.status_code == 204


# ---------- reactions ----------

def test_reaction_set_change_clear(client, user_factory):
    a = user_factory(client, username="aa")
    lt = _create_letter(client, a)

    # set "like"
    r = client.put(f"/api/letters/{lt['id']}/reactions", headers=a.headers, json={"kind": "like"})
    assert r.status_code == 200 and r.json() == {"kind": "like"}

    # change to "thoughtful"
    r = client.put(f"/api/letters/{lt['id']}/reactions", headers=a.headers, json={"kind": "thoughtful"})
    assert r.json() == {"kind": "thoughtful"}

    # letter shows count = 1, my_reaction = thoughtful
    r = client.get(f"/api/letters/{lt['id']}", headers=a.headers)
    body = r.json()
    assert body["reactions"] == 1
    assert body["my_reaction"] == "thoughtful"

    # clear
    r = client.delete(f"/api/letters/{lt['id']}/reactions", headers=a.headers)
    assert r.status_code == 204
    r = client.get(f"/api/letters/{lt['id']}", headers=a.headers)
    assert r.json()["reactions"] == 0
    assert r.json()["my_reaction"] is None


def test_reaction_invalid_kind_rejected(client, user_factory):
    a = user_factory(client)
    lt = _create_letter(client, a)
    # pydantic rejects non-Literal values before hitting DB
    r = client.put(f"/api/letters/{lt['id']}/reactions", headers=a.headers, json={"kind": "loved"})
    assert r.status_code == 422


# ---------- comments ----------

def test_comment_create_and_list(client, user_factory):
    a = user_factory(client, username="aa")
    b = user_factory(client, username="bb")
    lt = _create_letter(client, a)

    r = client.post(f"/api/letters/{lt['id']}/comments", headers=b.headers, json={"body": "love this"})
    assert r.status_code == 201
    c1_id = r.json()["id"]

    r = client.post(
        f"/api/letters/{lt['id']}/comments",
        headers=a.headers,
        json={"body": "thanks!", "parent_id": c1_id},
    )
    assert r.status_code == 201

    r = client.get(f"/api/letters/{lt['id']}/comments")
    body = r.json()
    assert len(body) == 1  # one root
    assert len(body[0]["replies"]) == 1
    assert body[0]["replies"][0]["body"] == "thanks!"


def test_comment_one_level_reply_enforced(client, user_factory):
    a = user_factory(client, username="aa")
    lt = _create_letter(client, a)
    r1 = client.post(f"/api/letters/{lt['id']}/comments", headers=a.headers, json={"body": "root"})
    root_id = r1.json()["id"]
    r2 = client.post(
        f"/api/letters/{lt['id']}/comments",
        headers=a.headers,
        json={"body": "reply", "parent_id": root_id},
    )
    reply_id = r2.json()["id"]
    # Try to reply to the reply — must be rejected
    r3 = client.post(
        f"/api/letters/{lt['id']}/comments",
        headers=a.headers,
        json={"body": "deep", "parent_id": reply_id},
    )
    assert r3.status_code == 400
    assert "one level" in r3.json()["detail"].lower()


# ---------- follows ----------

def test_follow_self_rejected(client, user_factory):
    a = user_factory(client)
    r = client.post(f"/api/users/{a.sub}/follow", headers=a.headers)
    assert r.status_code == 400


def test_follow_unfollow_counts(client, user_factory):
    a = user_factory(client, username="aa")
    b = user_factory(client, username="bb")
    r = client.post(f"/api/users/{a.sub}/follow", headers=b.headers)
    assert r.status_code == 200
    assert r.json() == {"is_following": True, "followers_count": 1}

    r = client.get(f"/api/users/{a.sub}", headers=b.headers)
    body = r.json()
    assert body["followers_count"] == 1 and body["is_following"] is True

    r = client.delete(f"/api/users/{a.sub}/follow", headers=b.headers)
    assert r.json() == {"is_following": False, "followers_count": 0}


# ---------- saves ----------

def test_save_unsave(client, user_factory):
    a = user_factory(client, username="aa")
    b = user_factory(client, username="bb")
    lt = _create_letter(client, a)

    r = client.post(f"/api/letters/{lt['id']}/save", headers=b.headers)
    assert r.status_code == 200 and r.json() == {"saved": True}

    r = client.get("/api/saves", headers=b.headers)
    assert [x["id"] for x in r.json()] == [lt["id"]]

    r = client.delete(f"/api/letters/{lt['id']}/save", headers=b.headers)
    assert r.json() == {"saved": False}
    r = client.get("/api/saves", headers=b.headers)
    assert r.json() == []


# ---------- weekly_prompts ----------

def test_weekly_prompts_one_active_invariant(db_session):
    """The partial unique index must prevent two active prompts."""
    db_session.add(WeeklyPrompt(
        prompt="A",
        week_start=datetime(2026, 1, 5, tzinfo=timezone.utc),
        active=True,
    ))
    db_session.commit()
    db_session.add(WeeklyPrompt(
        prompt="B",
        week_start=datetime(2026, 1, 12, tzinfo=timezone.utc),
        active=True,
    ))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_current_prompt_returns_active(client, db_session):
    db_session.add(WeeklyPrompt(
        prompt="What did you let go of?",
        week_start=datetime(2026, 4, 20, tzinfo=timezone.utc),
        active=True,
    ))
    db_session.commit()
    r = client.get("/api/prompts/current")
    assert r.status_code == 200
    assert r.json()["prompt"] == "What did you let go of?"


def test_current_prompt_404_when_none(client):
    r = client.get("/api/prompts/current")
    assert r.status_code == 404


# ---------- DB-level invariants ----------

def test_follow_self_blocked_at_db(db_session):
    """Schema CHECK should reject self-follow even if app layer were bypassed."""
    import uuid
    from app.models import User, Follow
    uid = uuid.uuid4()
    db_session.add(User(id=uid, username="xy", email="x@example.com"))
    db_session.commit()
    db_session.add(Follow(follower_id=uid, followee_id=uid))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_reaction_kind_check_at_db(db_session):
    """Schema CHECK should reject any kind outside the 6 allowed values."""
    import uuid
    from app.models import User, Letter, Reaction
    uid = uuid.uuid4()
    db_session.add(User(id=uid, username="rr", email="r@example.com"))
    db_session.commit()
    lt = Letter(author_id=uid, title="t", body="b", excerpt="b")
    db_session.add(lt)
    db_session.commit()
    db_session.add(Reaction(user_id=uid, letter_id=lt.id, kind="loved"))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()
ollback()
