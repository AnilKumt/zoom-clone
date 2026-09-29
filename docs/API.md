# API Specification

Base URL: `/api/v1`

## Unified Error Envelope

```json
{
  "error": {
    "code": "MEETING_NOT_FOUND",
    "message": "Meeting not found",
    "details": {},
    "request_id": "req-9f2c3a1b"
  }
}
```

## Endpoints

### Health
- `GET /healthz` — Liveness check (`200 OK`)
- `GET /readyz` — Readiness check (`SELECT 1` on DB + Redis ping)

### Auth
- `POST /auth/register/request-otp` — `{ email, name }` → `202 Accepted`
- `POST /auth/register/verify` — `{ email, name, otp, password }` → `201 Created` + set cookies
- `POST /auth/login` — `{ email, password }` → `200 OK` + set cookies
- `POST /auth/refresh` — uses `refresh_token` cookie → `200 OK` + rotated cookies
- `POST /auth/logout` — revokes session + deletes cookies

### Users
- `GET /users/me` — Authenticated profile (returns demo user in demo mode)

### Meetings
- `POST /meetings/instant` — Create & start instant 10-digit meeting → `201 Created`
- `POST /meetings` — Schedule a meeting with settings → `201 Created`
- `GET /meetings?scope=upcoming|previous` — Keyset-paginated meeting lists
- `GET /meetings/{code}/public` — Unauthenticated join-page existence validation
- `GET /meetings/{code}` — Full meeting details (host only)
- `POST /meetings/{code}/join` — `{ display_name, passcode? }` → `{ participant, ws_url, ws_ticket }`

### WebSocket
- `WSS /ws/rooms/{code}?ticket={single_use_ticket}`
  - S→C: `room.snapshot`, `participant.joined`, `participant.left`, `participant.updated`, `host.muted_all`, `meeting.ended`
  - C→S: `media.state`, `hand.toggle`, `chat.message`, `host.mute_all`, `host.mute`, `host.remove`, `host.end`
