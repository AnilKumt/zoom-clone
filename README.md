# Zoom Clone

A full-stack Zoom web application clone built with Next.js, FastAPI, SQLite, and WebSockets. The application replicates Zoom's portal design, core meeting workflows, and real-time collaboration features.

## Live Demo

- **Frontend Application**: https://zoom-2.netlify.app
- **Backend API & WebSockets**: https://zoom-clone-pr52.onrender.com
- **Swagger API Documentation**: https://zoom-clone-pr52.onrender.com/docs

## Tech Stack

- **Frontend**: Next.js 14+ (App Router, TypeScript, SPA mode)
- **Backend**: Python 3.12, FastAPI (async), Uvicorn
- **Database**: SQLite with Write-Ahead Logging (WAL) mode, SQLAlchemy 2.0 (async), Alembic
- **Real-Time & Ephemeral State**: Redis (Upstash) for WebSockets, single-use tickets, and room presence
- **Video & Audio**: WebRTC peer-to-peer mesh
- **UI & Styling**: Tailwind CSS, Radix UI primitives, Lucide React, Sonner
- **State Management & Data Fetching**: TanStack Query (React Query), Zustand
- **Form Handling & Validation**: React Hook Form, Zod

## Features

### Core Features
- **Landing Dashboard (`/home`)**: Zoom-style navigation bar, sidebar navigation, user profile card with Personal Meeting ID (PMI), quick action tiles, upcoming meetings list, and previous meetings list.
- **Instant Meeting Creation**: Generates a collision-resistant 10-digit numeric meeting ID, creates shareable `/j/{code}` invite links, and routes the host through the pre-meeting lobby into the room.
- **Join Meeting**: Allows joining by meeting ID (raw digits, spaced, or dashed) or direct invite URL, includes pre-join display name prompt, and validates meeting existence and passcode requirements.
- **Schedule Meetings**: Form supporting topic, description, date/time pickers, duration, timezone selection, optional passcode, and camera/mic entry defaults. Stored in SQLite and immediately rendered in upcoming lists.
- **Pre-Meeting Lobby (`/meeting/{code}/lobby`)**: Camera video preview, microphone toggle, name entry, passcode validation, and media permission error fallback.

### Bonus Features
- **Responsive Design**: Adapts layout across desktop, tablet, and mobile screen sizes.
- **User Authentication & Demo Mode**: Pre-configured with a default seeded user (`Anil Kumawat`) for evaluator access; supports optional Email OTP authentication with JWT httpOnly cookie rotation.
- **Real-Time Video & Audio**: WebRTC mesh peer connection supporting camera and microphone communication with independent background audio playback that persists when video is turned off.
- **In-Meeting Chat**: Real-time broadcast messaging across all connected participants with sender names and timestamps.
- **In-Meeting Reactions**: Animated floating emoji reactions broadcast to all room participants and displayed as on-tile badges.
- **Host Controls**: Server-enforced role verification for muting participants, removing participants with connection termination, and ending meetings for all attendees.

## Database Schema

The database uses SQLite in WAL (Write-Ahead Logging) mode to allow concurrent readers without blocking writes.

### Entity Relationship & Tables

```
+--------------------+           +----------------------+
|       users        | 1       * |       meetings       |
+--------------------+-----------+----------------------+
| id (PK, ULID)      |           | id (PK, ULID)        |
| email (Unique)     |           | meeting_code (Unique)|
| name               |           | host_id (FK -> users)|
| password_hash      |           | title                |
| personal_meeting_id|           | description          |
| timezone           |           | kind                 |
| plan               |           | status               |
| is_demo            |           | scheduled_start_at   |
| is_active          |           | duration_minutes     |
| created_at         |           | timezone             |
| updated_at         |           | passcode             |
+--------------------+           | started_at, ended_at |
                                 +----------------------+
                                            | 1
                                            |
                                            | 1
                                 +----------------------+
                                 |   meeting_settings   |
                                 +----------------------+
                                 | meeting_id (PK, FK)  |
                                 | host_video_on        |
                                 | participant_video_on |
                                 | mute_on_entry        |
                                 | join_before_host     |
                                 | waiting_room         |
                                 | allow_self_unmute    |
                                 | chat_enabled         |
                                 +----------------------+

+----------------------+
|     participants     |
+----------------------+
| id (PK, ULID)        |
| meeting_id (FK)      |
| user_id (FK, Nullable|
| guest_key            |
| display_name         |
| role                 |
| status               |
| joined_at            |
| left_at              |
| removed_by (FK)      |
+----------------------+
```

### Key Design Decisions
- **1:1 Settings Separation**: Extracted `meeting_settings` from `meetings` to maintain a narrow, performant table for high-frequency list queries while adhering to Single Responsibility Principle.
- **Immutable Attendance Records**: Every join action generates a new `participants` record, preserving complete historical attendance even across rejoins.
- **ULID Primary Keys**: High-performance, lexically sortable identifiers prevent predictable sequential ID enumeration.
- **Database Constraints & Indexes**: Enforces check constraints on statuses and emails, alongside composite indexes on `(host_id, status, scheduled_start_at)` to optimize upcoming meeting queries.
- **Redis for Ephemeral State**: High-frequency, short-lived data (30-second single-use WebSocket tickets, room presence hashes, rate limits) are managed in Redis to prevent SQLite write-lock contention.

## API Endpoints

### Authentication & Users
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/users/me` | Fetch currently authenticated user profile |
| POST | `/api/v1/auth/register/request-otp` | Initiate email registration by sending an OTP |
| POST | `/api/v1/auth/register/verify-otp` | Verify OTP and create user account |
| POST | `/api/v1/auth/login` | Authenticate with email/password and set JWT cookies |
| POST | `/api/v1/auth/refresh` | Rotate access and refresh tokens |
| POST | `/api/v1/auth/logout` | Revoke session and clear cookies |
| POST | `/api/v1/auth/password/forgot` | Request password reset link |

### Meetings
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/meetings/instant` | Create and immediately start an instant meeting |
| POST | `/api/v1/meetings` | Schedule a meeting with custom settings |
| GET | `/api/v1/meetings` | List upcoming or previous meetings for the authenticated user |
| GET | `/api/v1/meetings/{code}` | Get detailed meeting information (Host view) |
| GET | `/api/v1/meetings/{code}/public` | Get public meeting status and passcode requirements (Join page view) |
| POST | `/api/v1/meetings/{code}/join` | Validate meeting joinability, record attendance, and mint a 30s WebSocket ticket |

### Real-Time WebSockets
| Protocol | Path | Purpose |
|---|---|---|
| WS | `/api/v1/ws/rooms/{code}?ticket={ticket}` | Bidirectional room communication: presence, signaling, host commands, and chat |

## Local Setup

### Prerequisites
- Node.js 20+ and npm
- Python 3.12+
- Redis (Optional; an in-memory fallback store is included for local development)

### Backend

```bash
# 1. Navigate to backend directory
cd apps/api

# 2. Create virtual environment and install dependencies
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

pip install -e ".[dev]"

# 3. Configure environment variables
cp .env.example .env

# 4. Seed the database
python -m app.seed

# 5. Start the FastAPI server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
# 1. Navigate to frontend directory
cd apps/web

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local

# 4. Start Next.js development server
npm run dev
```

Open http://localhost:3000 in your browser.

### Seeding the Database

The database automatically seeds default users and mock upcoming/recent meetings on startup if `SEED_ON_START=true`. You can also trigger manual seeding at any time:

```bash
cd apps/api
python -m app.seed
```

## Environment Variables

### Backend (`apps/api/.env`)

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite+aiosqlite:///./data/app.db` | Async database connection URL |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL (falls back to memory store if unavailable) |
| `AUTH_MODE` | `demo` | Set to `demo` for automated demo user login or `full` for strict JWT auth |
| `JWT_ACCESS_SECRET` | `change-me-in-production` | Secret key for signing access tokens |
| `JWT_REFRESH_SECRET` | `change-me-in-production` | Secret key for signing refresh tokens |
| `OTP_HMAC_SECRET` | `change-me-in-production` | Secret key for hashing one-time passwords |
| `WEB_BASE_URL` | `http://localhost:3000` | Base URL used for invite link generation |
| `WS_BASE_URL` | `http://localhost:8000` | Base URL used for WebSocket connection establishment |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated allowed CORS origins |
| `SEED_ON_START` | `true` | Runs database seeder upon application startup |
| `SEED_DEFAULT_USER_NAME` | `Anil Kumawat` | Display name assigned to the default demo user |
| `EXPOSE_DEV_OTP` | `true` | Logs generated OTPs to standard output in development mode |

### Frontend (`apps/web/.env.local`)

| Variable | Default | Description |
|---|---|---|
| `API_ORIGIN` | `http://localhost:8000` | Backend API origin for Next.js HTTP rewrites |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:8000` | Direct backend WebSocket URL |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Public URL of the frontend application |
| `NEXT_PUBLIC_AUTH_MODE` | `demo` | Authentication mode flag (`demo` or `full`) |

## Assumptions

1. **Default User Logged In**: `AUTH_MODE=demo` is active by default to eliminate onboarding friction for evaluators. The default user is seeded as `Anil Kumawat` with Personal Meeting ID `833 834 7512`.
2. **10-Digit Meeting IDs**: Generated using uniform cryptographic distribution over 9 billion possible identifiers, backed by database uniqueness constraints with collision retry logic.
3. **P2P WebRTC Mesh**: Built for small-group conferences (2 to 4 participants). Larger room sizes are architected to transition to a Selective Forwarding Unit (SFU) server.
4. **WebSocket Authentication**: Utilizes single-use 30-second ticket tokens exchanged over HTTP before WebSocket connection upgrade, preventing token exposure in server access logs.
5. **Decoupled Audio Playback**: Background audio streams are isolated from video element lifecycles to prevent audio interruption when participants turn off their cameras.

## Known Limitations / Future Improvements

- **WebRTC Scalability (SFU Transition)**: The current implementation utilizes a full client-side mesh topology, which scales at O(N^2) network connections. Production scaling beyond 4 concurrent video streams will integrate an SFU (e.g., LiveKit or mediasoup).
- **SQLite Concurrency**: SQLite with WAL mode handles multiple concurrent readers and serialized writers. For horizontal multi-node deployments with heavy write concurrency, the persistence layer can be switched to PostgreSQL by updating `DATABASE_URL`.
- **Screen Sharing**: Video and audio channels are fully functional; screen-capture stream negotiation via `getDisplayMedia` is planned for the next iteration.
- **Recording & Cloud Storage**: Meeting attendance and session timestamps are stored; server-side composite stream recording will be added via external media pipeline workers.
