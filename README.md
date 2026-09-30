# zoom — Zoom Web-App Clone

> A faithful, full-stack Zoom web-app clone built as a take-home SDE-2 exercise. The UI is pixel-matched to Zoom's portal, and the backend demonstrates senior-level system design: layered architecture, Redis, real-time WebSockets, OTP auth, and host controls enforced on the server.

---

## Screenshots

> _Screenshots go here — run the app and capture `/home`, `/join`, `/welcome`, and the meeting room._

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js 14+ (App Router, TypeScript) | SPA with SSR capability; file-based routing |
| Styling | Tailwind CSS + CSS custom properties | Design tokens prevent hex hard-coding |
| UI Components | shadcn/ui + Radix UI primitives | Accessible, unstyled base |
| State (server) | TanStack Query | Stale-while-revalidate, cache invalidation |
| State (room) | Zustand | Minimal, predictable ephemeral state |
| Forms | react-hook-form + zod | Type-safe validation mirrored from backend |
| Backend | FastAPI (async, Python 3.12) | Fast, auto-documented, strict typing |
| ORM | SQLAlchemy 2.0 async | Repository pattern; swap DB without rewriting |
| DB | SQLite (WAL mode) | Required; Postgres is a `DATABASE_URL` change |
| Migrations | Alembic | Reproducible schema evolution |
| Cache / RT | Redis (+ MemoryStore fallback) | TTLs, counters, pub/sub — wrong tool for SQLite |
| Auth | JWT (httpOnly cookies) + Email OTP | XSS-safe; OTP prevents password-only attacks |
| Real-time | WebSocket (FastAPI) | Presence, host controls, chat |
| Testing | pytest, Vitest, Playwright | Layered coverage |
| CI | GitHub Actions | Lint → type-check → test → build |

---

## Quick Start

### Option A: Docker (recommended)

```bash
# 1. Copy env files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 2. Start everything
docker-compose up

# 3. Open http://localhost:3000
```

### Option B: Local development

**Prerequisites:** Node 22+, Python 3.12+, Redis (optional — MemoryStore used as fallback)

```bash
# Backend
cd apps/api
pip install -e ".[dev]"
python -m app.seed          # seed database
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd apps/web
npm install
npm run dev
# Open http://localhost:3000
```

### Make commands

```bash
make dev          # docker-compose up (all services)
make dev-api      # uvicorn with --reload
make dev-web      # next dev
make seed         # seed the database
make migrate      # alembic upgrade head
make test         # run all tests
make lint         # ruff + mypy + eslint + tsc
```

---

## Environment Variables

### `apps/api/.env`

| Variable | Default | Required | Description |
|---|---|---|---|
| `DATABASE_URL` | `sqlite+aiosqlite:///./data/app.db` | ✅ | SQLAlchemy async DB URL |
| `REDIS_URL` | _(none)_ | ❌ | Redis URL; MemoryStore used if absent |
| `AUTH_MODE` | `demo` | ✅ | `demo` = auto-login as seed user; `full` = require auth |
| `JWT_ACCESS_SECRET` | _(dev default)_ | ✅ prod | HMAC secret for access tokens |
| `JWT_REFRESH_SECRET` | _(dev default)_ | ✅ prod | HMAC secret for refresh tokens |
| `OTP_HMAC_SECRET` | _(dev default)_ | ✅ prod | HMAC secret for OTP storage |
| `WEB_BASE_URL` | `http://localhost:3000` | ✅ | Used in invite links |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | ✅ | Comma-separated CORS origins |
| `SEED_ON_START` | `true` | ❌ | Run seed on startup |
| `SEED_DEFAULT_USER_NAME` | `Anil Kumawat` | ❌ | Demo user display name |
| `EXPOSE_DEV_OTP` | `true` | ❌ | Log OTP to console (non-prod only) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` | _(none)_ | ❌ | Email; ConsoleSender used if absent |

### `apps/web/.env.local`

| Variable | Default | Description |
|---|---|---|
| `API_ORIGIN` | `http://localhost:8000` | FastAPI URL for Next.js rewrites |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:8000` | WebSocket base URL (direct) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Public app URL |
| `NEXT_PUBLIC_AUTH_MODE` | `demo` | Controls middleware and UI hints |

---

## Project Structure

```
zoom-clone/
├── apps/
│   ├── web/               # Next.js 14+ App Router SPA
│   │   ├── app/           # Route segments (portal, public, auth, room)
│   │   ├── features/      # Feature-sliced: dashboard, meetings, room, auth
│   │   ├── components/    # Shared UI: layout/, ui/, shared/
│   │   ├── lib/           # api-client, meeting-code, utils, env
│   │   └── providers/     # QueryProvider, AuthProvider, ToastProvider
│   └── api/               # FastAPI modular monolith
│       └── app/
│           ├── core/      # config, exceptions, ids, clock, logging
│           ├── db/        # session, base, unit_of_work
│           ├── infra/     # cache, pubsub, email, rate_limit, events
│           ├── middleware/ # request_id, access_log, security_headers
│           ├── modules/   # auth, users, meetings, participants, rooms, chat
│           ├── api/v1/    # aggregated routers
│           └── seed/      # idempotent seed data
├── packages/contracts/    # OpenAPI-generated TypeScript types (shared)
├── docs/                  # HLD, LLD, DATABASE, REDIS, JOURNEYS, ADRs
└── docker-compose.yml
```

---

## Feature Tier Checklist

### P0 — Must-have

- [x] ✅ Landing Dashboard (`/home`) — nav, sidebar, profile card, quick actions, upcoming/recent meetings, PMI
- [x] ✅ Instant meeting — unique 10-digit ID, invite link, redirect to lobby → room
- [x] ✅ Join meeting — by ID, spaced ID, dashed ID, invite URL, personal link name
- [x] ✅ Schedule meeting — topic, description, date, time, duration, timezone, passcode, video settings
- [x] ✅ SQLite schema — 6 tables, constraints, indexes, WAL mode
- [x] ✅ Alembic migrations + idempotent seed
- [x] ✅ README + deployment docs

### ⭐ P1 — Preferred (implemented and remaining work)

- [~] 🟡 **Responsive design** — responsive portal/lobby styles exist; room mobile bottom-sheet and viewport coverage remain
- [~] 🟡 **Authentication** — OTP signup, login, refresh rotation, forgot-password reset, and demo fallback work; refresh-session revocation and production cookie hardening remain
- [~] 🟡 **Host controls** — mute and remove authorization/state updates work; host reassignment, durable participant status, and cross-instance enforcement remain
- [~] 🟡 **Redis** — rate limiting, OTP, refresh allowlist, WS tickets, presence, cache-aside, idempotency, and readiness checks are wired; pub/sub fan-out and distributed locks remain
- [~] 🟡 **Real-time room presence** — snapshot, media, hand, join/leave, and toasts work on one API instance; heartbeat/reaper and cross-instance presence remain
- [~] 🟡 **Engineering quality** — CI/build/type-check paths exist; broader auth/room/Redis integration coverage and responsive E2E coverage remain
- [~] 🟡 **Docs** — core docs exist; `JOURNEYS.md` and tier status still need alignment with the executable Redis/pub-sub and host-control behavior

### P2 — Stretch

- [x] ✅ WebRTC video mesh (≤4 peers) — signaling, camera capture, renegotiation, and remote streams
- [~] 🟡 In-meeting chat — outbound and server relay exist; inbound UI handling remains
- [~] 🟡 Reactions / raise hand — raise-hand state works; reaction UI/server event handling remains
- [ ] ⏳ Screen share

---

## Deployment

| Service | Platform | URL |
|---|---|---|
| Frontend | Vercel | `https://zoom-clone-web.vercel.app` _(update after deploy)_ |
| API | Render / Railway | `https://zoom-clone-api.onrender.com` _(update after deploy)_ |
| Redis | Render Key Value / Upstash | Managed |

### Vercel (web)

1. Import `apps/web` as the root.
2. Set env vars: `API_ORIGIN`, `NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_AUTH_MODE=demo`.

### Render (api)

1. Create a Web Service from `apps/api`, Dockerfile runtime.
2. Add a Persistent Disk at `/app/data` for SQLite.
3. Set all required env vars.
4. Add a Redis instance; set `REDIS_URL`.

---

## Assumptions

1. **Default user pre-logged in** (`AUTH_MODE=demo`): evaluators can use the app without creating an account. The demo user has Personal Meeting ID `833 834 7512`.
2. **10-digit numeric Meeting IDs**: generated with `secrets.randbelow` over a 9-billion range; UNIQUE constraint + retry on collision.
3. **"New Meeting" label** used instead of Zoom's "Host" to match the assignment wording; a tooltip says "Host a meeting".
4. **Mesh WebRTC** (P2): capped at ~4 peers; SFU (LiveKit/mediasoup) is the documented upgrade path.
5. **SQLite on persistent disk**: if the platform has no persistent disk, the DB is re-seeded on boot (documented; demo still works).
6. **SMTP optional**: if `SMTP_HOST` is not set, OTPs are logged to the console (guarded by `EXPOSE_DEV_OTP=true`); evaluators can complete signup.
7. **Redis optional**: if `REDIS_URL` is not set, `MemoryStore` (in-process) is used. Pub/sub fan-out works within a single instance.
8. **Timezone display**: stored as IANA string; converted at the client using `date-fns-tz`.

---

## Known Limitations

- SQLite is single-writer; under high concurrent writes it serializes (WAL + busy_timeout handles this). Postgres upgrade is a `DATABASE_URL` change.
- MemoryStore pub/sub is no-op: multiple API instances cannot cross-communicate without Redis.
- WebRTC uses a small-room mesh with browser STUN support; it needs TURN/SFU infrastructure for production scale.
- In-process event bus loses events if the process crashes (upgrade: transactional outbox pattern).
- Waiting room is stored in `meeting_settings` but not enforced in the WebSocket flow (P2).

---

## Running Tests

```bash
# API tests
cd apps/api
pytest tests/ -v --tb=short

# Web tests
cd apps/web
npm test              # Vitest unit tests
npm run test:e2e      # Playwright end-to-end

# Type checks
cd apps/api && mypy app/ --ignore-missing-imports
cd apps/web && npx tsc --noEmit
```

---

## License

MIT — see [LICENSE](./LICENSE).
