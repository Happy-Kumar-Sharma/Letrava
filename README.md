# Letrava

> Letters from real people, written for the future.

A mobile-first social platform for thoughtful, long-form letters. The web app
renders the product inside a 420×860 phone shell on desktop and expands to fill
the viewport on phones — same shape, same chrome, ready to port to native
without redesign.

The repo is a monorepo with two pieces:

```
.
├── src/        React/Vite frontend (mobile-shaped web app)
├── backend/    FastAPI + SQLAlchemy + Alembic API
│   ├── app/        models, routes, auth, config
│   ├── alembic/    migrations (one head: 0001_initial_schema)
│   └── tests/      pytest integration suite (21 tests, all green)
└── README.md
```

The frontend currently renders from `src/data/letters.js` (sample data). The
backend exposes a working JSON API ready to plug in — wiring instructions are
in [Wire the frontend to the backend](#wire-the-frontend-to-the-backend).

---

## Stack

**Frontend**
- Vite + React 18 (no TypeScript)
- `lucide-react` for icons (1.75 stroke)
- Google Fonts: Fraunces / Inter / JetBrains Mono

**Backend**
- Python 3.11+, FastAPI 0.115, SQLAlchemy 2.0, Alembic 1.14
- Postgres (Supabase in production; any Postgres locally)
- Auth: Supabase magic-link → HS256 JWT, verified server-side with `SUPABASE_JWT_SECRET`
- `pytest 8.3.4` (pinned — see Troubleshooting)

---

## Quick start (full stack)

You need **Node 18+**, **Python 3.11+**, and a **Postgres** instance (Supabase
free tier or local Postgres 14+).

```bash
# 1. Clone & enter
git clone <your-fork> letrava && cd letrava

# 2. Backend
cd backend
python -m venv venv && source venv/bin/activate     # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                 # then fill in real values
alembic upgrade head                                 # create the schema
uvicorn app.main:app --reload --port 8000            # API on http://127.0.0.1:8000

# 3. Frontend (new terminal, repo root)
npm install
npm run dev                                          # http://localhost:5173
```

`GET http://127.0.0.1:8000/health` should return `{"ok":true}`.
`GET http://127.0.0.1:8000/docs` gives you the interactive Swagger UI.

---

## Backend

### Configure the environment

`backend/.env.example` documents every variable. Copy it to `.env` and edit:

```
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_JWT_SECRET=<from Supabase: Project Settings → API → JWT Secret>
DATABASE_URL=postgresql+psycopg://postgres:<password>@db.xxxxx.supabase.co:5432/postgres
CORS_ORIGINS=http://localhost:5173
PORT=8000
```

`SUPABASE_JWT_SECRET` is the only secret the API itself needs — it verifies
incoming user tokens with it. The anon key and project URL are convenience
values the **frontend** uses to talk to Supabase Auth; the API doesn't read
them.

For the `DATABASE_URL`:

- **Supabase**: Project Settings → Database → Connection string → URI. Use
  the direct connection (port 5432) for Alembic; the pooler (port 6543) is
  fine for the app at runtime.
- **Local Postgres**: e.g. `postgresql+psycopg://postgres:postgres@localhost:5432/letrava`.
  Create the database first with `createdb letrava`.

### Migrations

Alembic owns only the `public` schema. Supabase's `auth` schema is explicitly
excluded (see `alembic/env.py → include_object`), so you can point Alembic at
a Supabase Postgres without it ever touching the auth tables.

```bash
cd backend
alembic upgrade head           # apply all migrations
alembic downgrade -1           # roll back one revision
alembic revision -m "msg"      # author a new revision (review the file before committing)
```

The single migration `0001_initial_schema` creates `users`, `letters`, `tags`,
`letter_tags`, `reactions`, `comments`, `follows`, `saves`, `weekly_prompts`,
plus the 6-kind reaction CHECK, the no-self-follow CHECK, and the partial
unique index that enforces "at most one active weekly prompt".

### Run the API

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

Routes (all under `/api`):

| Method | Path                                            | Notes                                  |
|--------|-------------------------------------------------|----------------------------------------|
| GET    | `/health`                                       | liveness probe                         |
| POST   | `/api/me/init`                                  | create profile after magic-link login  |
| GET    | `/api/me`                                       | the viewer's own profile               |
| GET    | `/api/me/profile`                               | full profile + author stats            |
| POST   | `/api/letters`                                  | publish a letter                       |
| GET    | `/api/letters?feed=trending\|latest\|following` | feeds                                  |
| GET    | `/api/letters/{id}`                             | one letter                             |
| DELETE | `/api/letters/{id}`                             | author-only, returns 204               |
| PUT    | `/api/letters/{id}/reactions`                   | upsert; `{kind:null}` clears           |
| DELETE | `/api/letters/{id}/reactions`                   | clear, returns 204                     |
| POST   | `/api/letters/{id}/comments`                    | optional `parent_id` for one-level reply |
| GET    | `/api/letters/{id}/comments`                    | threaded (root + replies)              |
| POST   | `/api/users/{id}/follow`                        | follow                                 |
| DELETE | `/api/users/{id}/follow`                        | unfollow                               |
| GET    | `/api/users/{id}`                               | someone else's profile                 |
| POST   | `/api/letters/{id}/save`                        | bookmark                               |
| DELETE | `/api/letters/{id}/save`                        | un-bookmark                            |
| GET    | `/api/saves`                                    | the viewer's saved letters             |
| GET    | `/api/prompts/current`                          | the active weekly prompt (or 404)      |

Auth is `Authorization: Bearer <jwt>`. The token is whatever Supabase issues
after a magic-link login — the API verifies its signature with
`SUPABASE_JWT_SECRET`, accepts `aud=authenticated`, and uses `sub` (UUID)
as the user id.

### Run the tests

```bash
cd backend
pytest -q                      # 21 tests, ~3s on local Postgres
```

`tests/conftest.py` mints HS256 JWTs locally with the same secret — no
Supabase round-trip needed. The test DB is the same Postgres pointed at by
`DATABASE_URL`; the `_clean_tables` fixture truncates between tests.

> The fixture also calls `Base.metadata.create_all` — that means tests work
> even before you run `alembic upgrade head`, but **after** running the test
> suite the `alembic_version` row may say "at head" while the tables are
> gone. If you bounce between `pytest` and a live API on the same DB and
> see *"relation 'letters' does not exist"*, run
> `alembic downgrade base && alembic upgrade head`, or
> `DROP TABLE alembic_version` then `alembic upgrade head`.

---

## Frontend

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # → dist/
npm run preview    # preview the production build
```

The shell has one breakpoint. Above 540px wide, the phone shell is centered
on a cream backdrop, with an explainer sidebar at ≥1100px. At 540px and
below it expands to `100vw × 100dvh` and honors `safe-area-inset-bottom`.

### Project layout

```
src/
  main.jsx              entry
  App.jsx               shell + state machine
  styles.css            design tokens (colors, type, spacing, radii, shadows, motion)
  components/
    Shared.jsx          Logo, Avatar, Tag, Button, Card
    MobileChrome.jsx    TopBar, BottomNav, ScreenHeader, Search & Saved screens
    Onboarding.jsx      logged-out landing with top-5 trending
    Feed.jsx            Trending / Latest / Following + letter cards
    LetterDetail.jsx    letter, reactions, comments
    Profile.jsx         pseudonymous profile (self & other)
    Editor.jsx          full-screen composer
    LoginModal.jsx      bottom-sheet email auth
  data/
    letters.js          sample letters + reaction definitions (CURRENT data source)
public/
  letrava-mark.svg      icon-only mark
  letrava-wordmark.svg  full wordmark
```

---

## Wire the frontend to the backend

Right now the React app reads from `src/data/letters.js`. To switch it to
the live API you need three pieces.

**1. Proxy `/api` to FastAPI in dev.** Add a `proxy` block to `vite.config.js`:

```js
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: { '/api': 'http://127.0.0.1:8000' },
  },
});
```

`fetch('/api/letters')` from the React app then hits FastAPI with no CORS
dance in development.

**2. Add Supabase auth on the client.**

```bash
npm install @supabase/supabase-js
```

```js
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
```

Drop a `.env.local` at the repo root (Vite picks it up automatically):

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Wire `supabase.auth.signInWithOtp({ email })` into `LoginModal.jsx` for the
magic-link flow.

**3. Send the bearer token with every API call.**

```js
// src/lib/api.js
import { supabase } from './supabase';

export async function api(path, init = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { 'Content-Type': 'application/json', ...(init.headers || {}) };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  const res = await fetch(path, { ...init, headers });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}
```

After a fresh magic-link login the user has a Supabase JWT but no row in our
`users` table — call `POST /api/me/init` once with the chosen username,
palette, and bio. Subsequent requests just send the bearer token.

---

## Troubleshooting

**`AssertionError: Status code 204 must not have a response body` at boot.**
FastAPI 0.115 refuses to register a 204 endpoint that has a non-`Response`
return type or a `-> None` annotation that gets coerced into a JSON body.
The fix (already applied in `routes/letters.py` and `routes/reactions.py`):
drop the `-> None`, add `response_class=Response`, and
`return Response(status_code=204)` explicitly.

**`relation "letters" does not exist` after running tests.** The pytest
teardown drops every table; the `alembic_version` row survives and now lies
about the schema. Reset with `alembic downgrade base && alembic upgrade head`,
or `DROP TABLE alembic_version; alembic upgrade head`.

**Pytest assertion strings look mangled** (e.g. `"aa"` becoming `"a"` in
error output, assertions passing or failing inexplicably). `pytest 9.0.x`
shipped an assertion-rewriter regression that mangled short string literals
in keyword arguments. Stay on the pinned `pytest==8.3.4`. If you upgrade and
weird things start happening, run with `pytest --assert=plain` to confirm
that's what you're seeing.

**`401 Missing bearer token` on `/api/me/init`.** That endpoint is
authenticated — it expects the Supabase JWT in `Authorization: Bearer …`.
Anonymous calls correctly return 401.

**CORS errors from the browser.** Either set up the Vite proxy as above
(recommended in dev) or add the frontend origin to `CORS_ORIGINS` in
`backend/.env` (comma-separated; restart uvicorn).

**`Uncaught Error: supabaseUrl is required` in the browser console.**
Vite only exposes env vars whose names start with `VITE_` to client code.
Your `.env.local` must use `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
— bare `SUPABASE_URL` will silently resolve to `undefined` at
`import.meta.env.VITE_SUPABASE_URL`. After fixing the names, **restart
`npm run dev`** (Vite reads `.env.local` once at startup) and hard-refresh
the browser tab.

**Alembic tries to touch tables it shouldn't (e.g. Supabase auth tables).**
The `include_object` filter in `alembic/env.py` already restricts Alembic
to the `public` schema. If you've added models in another schema, update
that filter.

---

## Design source

The design was generated by Claude Design and exported as a handoff bundle.
The visual system — "Soft Social Minimal" — is encoded as CSS custom
properties in `src/styles.css`.
