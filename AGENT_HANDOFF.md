# Letrava — Complete Agent Handoff
_Last updated: 2026-05-03. Read this file entirely before touching any code._

---

## 1. Project Overview

**Letrava** is a letter-writing social app. Users write reflective letters under pseudonyms, follow authors, react, comment, and save letters. Target scale: **10 million users**.

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite 5, no router (pure state machine in App.jsx), all inline styles |
| Backend | FastAPI 0.115.5, SQLAlchemy 2, Alembic, psycopg3, PostgreSQL |
| Auth | Custom JWT (HS256, 15 min) + bcrypt (cost 12) + opaque refresh tokens (30 days, httpOnly cookie) |
| Styling | No CSS framework. Inline style objects everywhere. Fonts: Fraunces (serif) + system sans |

**Repo root:** `C:\archive\Letrava`

---

## 2. How to Run

```bash
# Backend (terminal 1)
cd C:\archive\Letrava\backend
uvicorn app.main:app --reload --port 8000

# Frontend (terminal 2)
cd C:\archive\Letrava
npm run dev          # http://localhost:5173
```

Vite proxies `/api/*` → `http://localhost:8000` (configured in `vite.config.js`).

---

## 3. Directory Structure

```
C:\archive\Letrava\
├── src/
│   ├── App.jsx                    # Root: auth state machine, toast, loginMode, openEditor
│   ├── main.jsx                   # React entry point
│   ├── styles.css                 # Global resets + shell layout classes
│   ├── lib/
│   │   └── api.js                 # HTTP transport, token store, auth calls, useApi hook
│   ├── data/
│   │   └── letters.js             # Static seed letters for Onboarding preview
│   └── components/
│       ├── LoginModal.jsx         # Signup/signin bottom-sheet; accepts initialMode prop
│       ├── ProfileGate.jsx        # Loads /api/me; renders children(me) when ready
│       ├── Onboarding.jsx         # Unauthenticated landing: two buttons (signup / signin)
│       ├── Feed.jsx               # Letter feed (trending/latest/following) + real prompt
│       ├── LetterDetail.jsx       # Single letter + reactions + comments
│       ├── Profile.jsx            # Author profile + inline edit form with avatar upload
│       ├── Editor.jsx             # Full-screen composer; accepts initialPrompt prop
│       ├── MobileChrome.jsx       # TopBar, BottomNav, SearchScreen (real API), SavedScreen
│       └── Shared.jsx             # Avatar (supports base64 src), Tag, Button, iconBtn
│
├── backend/
│   ├── .env                       # Secret config (never git-track)
│   ├── requirements.txt
│   └── app/
│       ├── main.py                # FastAPI app factory + CORS + global 500 handler
│       ├── config.py              # Pydantic settings (reads .env)
│       ├── db.py                  # SQLAlchemy engine + SessionLocal + get_db()
│       ├── models.py              # ORM models (User has avatar column)
│       ├── schemas.py             # Pydantic schemas (ProfileUpdate, SignupIn, etc.)
│       ├── serializers.py         # letter_to_dict, author_dict (includes avatar), etc.
│       ├── auth.py                # JWT + bcrypt + refresh token logic + FastAPI deps
│       └── routes/
│           ├── auth_routes.py     # POST /api/auth/{signup,signin,refresh,signout}
│           ├── me.py              # GET /api/me, PATCH /api/me, GET /api/me/profile
│           ├── letters.py         # CRUD + feed
│           ├── reactions.py       # PUT/DELETE /api/letters/{id}/reactions
│           ├── comments.py        # GET/POST /api/letters/{id}/comments
│           ├── follows.py         # GET/POST/DELETE /api/users/{id}/follow
│           ├── saves.py           # GET /api/saves, POST/DELETE /api/letters/{id}/save
│           ├── prompts.py         # GET /api/prompts/current
│           └── search.py          # GET /api/search/letters, GET /api/search/users
│
└── backend/alembic/versions/
    ├── 0001_initial_schema.py     # All core tables
    ├── 0002_custom_auth.py        # password_hash + refresh_tokens table
    └── 0003_avatar.py             # avatar TEXT column on users
```

---

## 4. Auth Architecture (custom JWT — no Supabase)

### Token model

| Token | Algorithm | TTL | Storage |
|-------|-----------|-----|---------|
| Access token | HS256 JWT | 15 min | JS module-level `_accessToken` in `api.js` — **never** localStorage |
| Refresh token | opaque `secrets.token_urlsafe(32)` | 30 days | httpOnly cookie `Path=/api/auth/refresh`; SHA-256 hash in DB |

### Password hashing
- `bcrypt` called **directly** (NOT via passlib — passlib 1.7.4 triggers bcrypt 5.x's 72-byte guard before our pre-hash runs)
- Password is SHA-256 + base64 pre-hashed → always 44 bytes → safely under bcrypt's 72-byte limit
- Cost factor: 12 (~300 ms/hash)

```python
def _prehash(plain: str) -> bytes:
    return base64.b64encode(hashlib.sha256(plain.encode()).digest())  # always 44 bytes

def hash_password(plain: str) -> str:
    return _bcrypt.hashpw(_prehash(plain), _bcrypt.gensalt(rounds=12)).decode()

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _bcrypt.checkpw(_prehash(plain), hashed.encode())
    except Exception:
        return False
```

### Security properties
- Constant-time signin: bcrypt always runs even for unknown emails (dummy hash used)
- Ambiguous 409 on signup: same error for duplicate email OR username (prevents enumeration)
- Refresh token rotation on every use; reuse of a revoked token kills ALL sessions for that user
- Global 500 handler: logs full traceback server-side, returns only `{"detail": "An unexpected error occurred."}` to client

### Auth endpoints
```
POST /api/auth/signup   → 201 {access_token, token_type} + sets httpOnly refresh_token cookie
POST /api/auth/signin   → 200 {access_token, token_type} + sets httpOnly refresh_token cookie
POST /api/auth/refresh  → 200 {access_token, token_type} + rotates cookie
POST /api/auth/signout  → 204 + revokes all user sessions + clears cookie
```

### Frontend token flow
1. **Page load:** `refreshAccessToken()` in `App.jsx` `useEffect` — if cookie valid, sets `_accessToken`, `authed=true`
2. **API calls:** `api()` reads `_accessToken` synchronously, injects `Authorization: Bearer ...`
3. **401 response:** tries refresh once (mutex prevents parallel storms), retries. On failure calls `_onUnauthorized` → snaps UI to logged-out
4. **Signout:** `authSignout()` → `POST /api/auth/signout` with `credentials:'include'`, clears `_accessToken`

---

## 5. Database Schema (all migrations applied: 0001 → 0002 → 0003)

```sql
users (
  id            UUID PRIMARY KEY,
  username      VARCHAR(40) UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),          -- nullable; bcrypt(sha256(password))
  palette       VARCHAR(16) NOT NULL DEFAULT 'indigo',
  bio           TEXT NOT NULL DEFAULT '',
  avatar        TEXT,                  -- nullable; base64 JPEG data URL (compressed 256×256, ~78% quality)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
)

refresh_tokens (
  id            UUID PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash    VARCHAR(64) UNIQUE NOT NULL,  -- SHA-256 hex of raw token
  expires_at    TIMESTAMPTZ NOT NULL,
  revoked       BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
)
-- indexes: ix_refresh_tokens_user_id, ix_refresh_tokens_user_expires(user_id, expires_at)

letters (
  id         SERIAL PRIMARY KEY,
  author_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(200) NOT NULL,
  body       TEXT NOT NULL,
  excerpt    TEXT NOT NULL,      -- first 240 chars of first paragraph; built by serializers.py
  mood       VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)

tags        (id SERIAL PK, name VARCHAR(40) UNIQUE)
letter_tags (letter_id FK, tag_id FK)   -- m2m; tags lowercased, # stripped, max 5 per letter

reactions (
  user_id    UUID FK→users,  -- composite PK
  letter_id  INT FK→letters,
  kind       VARCHAR(20) CHECK IN ('like','thoughtful','relatable','sad','hopeful','inspiring'),
  created_at TIMESTAMPTZ
)

comments (
  id        SERIAL PK,
  letter_id INT FK→letters,
  author_id UUID FK→users,
  parent_id INT FK→comments (self-ref, nullable),  -- max 1 level deep, enforced in app layer
  body      TEXT NOT NULL,
  created_at TIMESTAMPTZ
)

follows (
  follower_id UUID FK→users,   -- composite PK
  followee_id UUID FK→users,
  created_at  TIMESTAMPTZ,
  CHECK follower_id <> followee_id
)

saves (
  user_id    UUID FK→users,  -- composite PK
  letter_id  INT FK→letters,
  created_at TIMESTAMPTZ
)

weekly_prompts (
  id         SERIAL PK,
  prompt     TEXT NOT NULL,
  week_start TIMESTAMPTZ UNIQUE,
  active     BOOLEAN DEFAULT false
  -- partial unique index: only one active=true row at a time
)
```

---

## 6. Complete API Reference

All endpoints at `http://localhost:8000`. Frontend reaches them via Vite proxy as `/api/...`.

### Auth (no token required)
| Method | Path | Body | Response | Notes |
|--------|------|------|----------|-------|
| POST | `/api/auth/signup` | `{email, password, username, palette?, bio?}` | `{access_token, token_type}` + cookie | 201; username regex `^[a-zA-Z0-9_]{3,40}$` |
| POST | `/api/auth/signin` | `{email, password}` | `{access_token, token_type}` + cookie | 401 on wrong creds |
| POST | `/api/auth/refresh` | — (cookie sent automatically) | `{access_token, token_type}` + new cookie | Rotates refresh token |
| POST | `/api/auth/signout` | — (cookie) | 204 | Revokes all sessions for user |

### Me (bearer required)
| Method | Path | Body | Response | Notes |
|--------|------|------|----------|-------|
| GET | `/api/me` | — | `UserOut` | id, username, email, palette, bio, avatar, created_at |
| PATCH | `/api/me` | `{palette?, bio?, avatar?}` | `UserOut` | Username NOT patchable; `avatar=""` clears it |
| GET | `/api/me/profile` | — | `UserPublic` | Adds letters_count, followers_count, following_count |

### Letters
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/letters` | required | `{title, body, tags[], mood}` → `LetterOut` |
| GET | `/api/letters?feed=latest\|trending\|following&limit=20&author=uuid` | optional | `LetterOut[]` |
| GET | `/api/letters/{id}` | optional | Single `LetterOut` |
| DELETE | `/api/letters/{id}` | required | 204; 403 if not author |

### Social
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| PUT | `/api/letters/{id}/reactions` | required | `{kind}` or `{kind: null}` to clear |
| DELETE | `/api/letters/{id}/reactions` | required | 204 |
| GET | `/api/letters/{id}/comments` | none | `CommentOut[]` with 1-level replies |
| POST | `/api/letters/{id}/comments` | required | `{body, parent_id?}` |
| GET | `/api/users/{id}` | required | `UserPublic` |
| POST | `/api/users/{id}/follow` | required | `{is_following, followers_count}` |
| DELETE | `/api/users/{id}/follow` | required | `{is_following, followers_count}` |
| GET | `/api/saves` | required | `LetterOut[]` |
| POST | `/api/letters/{id}/save` | required | `{saved: true}` |
| DELETE | `/api/letters/{id}/save` | required | `{saved: false}` |
| GET | `/api/prompts/current` | none | `{id, prompt, week_start}` |

### Search (optional auth — viewer_id affects is_following field)
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/search/letters?q=&limit=20` | optional | `LetterOut[]`; empty q returns `[]` |
| GET | `/api/search/users?q=&limit=10` | optional | `UserPublic[]`; empty q returns top users by follower count |

### Key response shapes

**`LetterOut`**
```json
{
  "id": 1, "title": "...", "body": "...", "excerpt": "...",
  "tags": ["solitude"], "mood": "hopeful",
  "age": "2d", "read_time": "3 min", "created_at": "...",
  "author": {"id": "uuid", "name": "username", "palette": "indigo", "avatar": null},
  "reactions": 12, "comments": 3, "saves": 5,
  "saved": false, "my_reaction": null
}
```

**`UserOut`** (private, returned to the authenticated user themselves)
```json
{"id": "uuid", "username": "alice", "email": "a@b.com", "palette": "indigo", "bio": "...", "avatar": "data:image/jpeg;base64,...", "created_at": "..."}
```

**`UserPublic`** (public, returned for other users)
```json
{"id": "uuid", "username": "alice", "palette": "indigo", "bio": "...", "avatar": null, "letters_count": 5, "followers_count": 12, "following_count": 3, "is_following": false}
```

---

## 7. Frontend Architecture

### App.jsx state machine

| State var | Type | Purpose |
|-----------|------|---------|
| `authed` | bool | valid session present |
| `authChecked` | bool | false until initial `refreshAccessToken()` resolves (prevents unauthed flash) |
| `loginOpen` | bool | controls LoginModal visibility |
| `loginMode` | `'signup'\|'signin'` | passed as `initialMode` to LoginModal |
| `tab` | `'home'\|'search'\|'saved'\|'profile'` | bottom nav selection |
| `view` | `'shell'\|'letter'\|'profile'` | inner view |
| `activeLetter / activeAuthor` | object | selected content |
| `editorOpen` | bool | Editor overlay |
| `editorPrompt` | string\|null | pre-filled prompt text for Editor |
| `toast` | `{message, color}\|null` | auto-dismissing toast (3.5 s) |

Key functions in App.jsx:
- `openLogin(mode)` — sets `loginMode` + `loginOpen=true`
- `handleAuth(isNew)` — sets `authed=true`, shows green toast if `isNew=true`
- `openEditor(prompt)` — sets `editorPrompt` + `editorOpen=true`
- `showToast(message, color)` — 3.5 s auto-dismiss toast

### Component tree (authenticated)
```
App
├── Toast (fixed position, auto-dismiss)
├── TopBar (logo + bell + sign-out)
├── ProfileGate → loads /api/me → passes `me` to children
│   ├── Feed (tab='home')          ← receives onWrite prop
│   ├── SearchScreen (tab='search') ← real API, debounced, follow buttons
│   ├── SavedScreen (tab='saved')
│   ├── LetterDetail (view='letter')
│   ├── Profile (view='profile' or tab='profile') ← edit form with avatar upload
│   └── Editor (overlay, editorOpen=true)          ← receives initialPrompt
└── BottomNav
```

### `src/lib/api.js` exports
```js
// Token management
setAccessToken(token)
clearAccessToken()
setOnUnauthorized(cb)        // register logout callback in App.jsx
refreshAccessToken()         // POST /api/auth/refresh with mutex; returns token|null

// Core fetch (handles 401→refresh→retry)
api(path, init)
getJSON(path)
postJSON(path, body)
putJSON(path, body)
patchJSON(path, body)        // added for PATCH /api/me
delJSON(path)

// Auth helpers (set token internally)
authSignup({email,password,username,palette,bio})
authSignin({email,password})
authSignout()                // credentials:'include', clears token

// React hook
useApi(path, deps[])         // {data, loading, error, refetch}
```

### Component behaviour notes

**`LoginModal.jsx`**
- Accepts `initialMode='signup'|'signin'` prop — opens directly in the correct mode
- `onAuth(isNew: bool)` — passes `true` after signup, `false` after signin
- Error mapping: 409 → "already taken", 401 → "incorrect email or password", 422 → first pydantic `.msg`

**`Onboarding.jsx`**
- "Create account" button → `onSignIn('signup')`
- "Sign in" button → `onSignIn('signin')`
- Both are visible as separate buttons (no hidden link pattern)

**`Profile.jsx`**
- "Edit profile" button (self only) toggles `editing` state → `EditProfileForm` renders inline
- `EditProfileForm`: canvas-compressed avatar upload (max 256×256, JPEG 78%), bio textarea (max 200 chars), palette picker
- Avatar upload: `<input type="file" accept="image/*">` → `FileReader` → `Image` → `Canvas.toDataURL('image/jpeg', 0.78)` → base64 data URL
- On save: `PATCH /api/me` — updates local state immediately, no page reload
- Username field is shown but greyed out with "cannot be changed" note
- `localProfile` state overlays server data after edits so UI is optimistic

**`Avatar` component (Shared.jsx)**
- `src` prop: if present, renders `<img src={src}>` (base64 or URL)
- Fallback: colored circle with first-letter initials (existing behaviour)
- Used everywhere: Feed, Profile, SearchScreen, SavedScreen, LetterDetail, Comments

**`Feed.jsx`**
- Loads `/api/prompts/current` via `useApi` — shows prompt card only if response exists (no 404 crash)
- "Write a response" → `onWrite(prompt.prompt)` → `App.jsx:openEditor(promptText)` → `Editor` pre-fills body
- `onWrite` prop comes from `App.jsx`

**`Editor.jsx`**
- `initialPrompt` prop (string|null)
- If set: body initialised to `"Prompt: {initialPrompt}\n\n"`

**`SearchScreen` (MobileChrome.jsx)**
- Input debounced 350 ms before firing API calls
- No query: shows `/api/search/users` (top users by follower count) as "Writers to follow"
- With query: fires `/api/search/letters?q=` + `/api/search/users?q=` in parallel; shows results
- `WriterRow` component: follow/unfollow with optimistic local state (no page reload)
- Uses real `Avatar` with `src` prop for user avatars

---

## 8. `backend/.env` (current values)

```
JWT_SECRET=99d22427feef00f074d1d591a9c0b66d570714da6d63c691ab25186c9d669376
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=30
SECURE_COOKIES=False
DATABASE_URL=postgresql+psycopg://postgres:postgres@127.0.0.1:5432/Letrava
CORS_ORIGINS=http://localhost:5173
PORT=8000
```
⚠️ The `JWT_SECRET` above is in this file. **Generate a new one before production:** `python -c "import secrets; print(secrets.token_hex(32))"`

---

## 9. `backend/requirements.txt` (current)

```
fastapi==0.115.5
uvicorn[standard]==0.32.1
sqlalchemy==2.0.36
psycopg[binary]==3.2.3
alembic==1.14.0
pydantic==2.10.3
pydantic-settings==2.6.1
python-jose[cryptography]==3.3.0
python-dotenv==1.0.1
httpx==0.28.1
pytest==8.3.4
```
`bcrypt` installed as transitive dep. `passlib` is **not used** (removed — incompatible with bcrypt 5.x).

---

## 10. Coding Patterns & Conventions

### Backend
- Auth deps: always import `get_current_user` / `get_optional_user` from `..auth`
- `get_current_user` → 401 if no/invalid token or user not found in DB
- `get_optional_user` → returns `None` (used for public endpoints that show viewer-personalised data)
- SQLAlchemy: use `select()` + `db.scalar()` / `db.scalars()`. `db.query()` only used in `auth.py` for refresh token operations (legacy but harmless)
- Always use `letter_to_dict(db, letter, viewer_id)` from `serializers.py` — never build LetterOut dicts inline
- 204 endpoints: must use `response_model=None` OR `response_class=Response` (FastAPI 0.115.5 requirement)
- `author_dict(user)` in `serializers.py` returns `{id, name, palette, avatar}` — always use this for author fields

### Frontend
- All API calls through `api.js` — never raw `fetch()` in components (except `authSignout` which needs `credentials:'include'`)
- Inline styles only, no component-level CSS classes
- `Fraunces, Georgia, serif` for headings; system sans for body/UI
- Colors: `#111827` near-black, `#6B7280` muted, `#4338CA` indigo primary, `#E07856` coral accent, `#6366F1` active/selected
- `useApi(path, deps)` for reads. `postJSON/putJSON/patchJSON/delJSON` for mutations in event handlers
- Never store tokens, user data, or sensitive state in localStorage

---

## 11. Known Issues & Gotchas

| Issue | Status | Notes |
|-------|--------|-------|
| passlib 1.7.4 + bcrypt 5.x 72-byte error | **Fixed** | Call `bcrypt` directly with SHA-256 pre-hash |
| FastAPI 0.115.5 rejects `204` without `response_model=None` | **Fixed** | All 204 endpoints have `response_model=None` or `response_class=Response` |
| `password_hash` nullable in DB | Intentional | Migration-safe; enforced at signup in app layer |
| `UserInit` schema in `schemas.py` | Dead code | Safe to delete; no routes use it |
| `avatar` column is `TEXT` in DB | Intentional | Base64 JPEGs at 256×256 ~78% ≈ 15–30 KB each; acceptable for now. For scale: migrate to object storage (S3/GCS) and store URL instead |
| `onBell` in TopBar is a no-op | Not implemented | Notifications system not built yet |
| Search uses ILIKE | Works for MVP | For production scale: add PostgreSQL full-text search (`tsvector`) on letters.title + letters.body |
| `GET /api/search/users` with no query scans all users for follower counts | Works for MVP | Add a pre-computed `followers_count` column for scale |

---

## 12. Production Checklist (not done)

- [ ] **Rate limiting** — add `slowapi`; signup 5/hr, signin 10/min, refresh 60/min per IP
- [ ] **`SECURE_COOKIES=True`** — requires HTTPS
- [ ] **New `JWT_SECRET`** — store in secrets manager, never in git
- [ ] **`CORS_ORIGINS=https://letrava.com`** — lock down for production
- [ ] **Nightly refresh_tokens cleanup:**
  ```sql
  DELETE FROM refresh_tokens WHERE expires_at < now() - INTERVAL '1 day' OR revoked = true;
  ```
- [ ] **Make `password_hash` NOT NULL** after all users re-registered:
  ```python
  op.alter_column("users", "password_hash", nullable=False)
  ```
- [ ] **Avatar storage migration** — move base64 blobs to S3/GCS, store URL in `avatar` column
- [ ] **Full-text search** — add `tsvector` index on `letters(title, body)` for proper search at scale
- [ ] **Notifications system** — `onBell` handler in TopBar is a stub

---

## 13. Complete Session History

1. **Supabase magic link 401** — Supabase switched to RS256 JWTs; backend only accepted HS256. Fixed by inspecting JWT `alg` header and using JWKS for asymmetric tokens.

2. **Profile 409 instead of 404** — `get_current_user` returned 409 when the app user row didn't exist; `ProfileGate` only handled 404 for "needs init". Fixed to 404.

3. **Magic link → email/password** — Replaced `signInWithOtp` with `signInWithPassword`/`signUp` in LoginModal.

4. **Removed Supabase entirely** — Full stack replacement: custom JWT + bcrypt backend, in-memory access token + httpOnly refresh cookie on frontend. Auth routes, models, migration, api.js, App.jsx, LoginModal, ProfileGate all rewritten.

5. **FastAPI 204 assertion** — `status_code=204` without `response_model=None` fails in FastAPI 0.115.5. Fixed signout endpoint.

6. **bcrypt 72-byte error** — passlib 1.7.4 triggers bcrypt 5.x's guard before our pre-hash runs. Fixed by removing passlib and calling bcrypt directly with SHA-256 pre-hashed input.

7. **Profile editing + avatar upload** — Added `PATCH /api/me`, `avatar TEXT` column (migration 0003), Canvas-compressed base64 avatar upload in `Profile.jsx`, `Avatar` component updated to support `src` prop.

8. **Signup/signin modal modes** — Onboarding now has two explicit buttons; `LoginModal` accepts `initialMode` prop; `App.jsx` tracks `loginMode` state.

9. **Green toast on signup** — `Toast` component in `App.jsx`; `handleAuth(isNew)` shows success toast after account creation.

10. **Real prompt of the week** — `Feed.jsx` loads `/api/prompts/current`; "Write a response" pre-fills `Editor` via `initialPrompt` prop.

11. **Search functionality** — Added `routes/search.py` with `GET /api/search/letters` and `GET /api/search/users`; `SearchScreen` rewired with debounce, parallel API calls, real follow buttons, real writer list.
