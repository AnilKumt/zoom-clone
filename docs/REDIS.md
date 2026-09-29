# Redis Usage

> Redis = sticky notes on a fridge that fall off by themselves (TTL). The database is the filing cabinet. Redis holds what needs to be fast, ephemeral, or shared across processes.

## Key Prefix Convention

All keys are prefixed `zoom:{env}:` (e.g. `zoom:prod:`). This document omits the prefix for brevity.

## Keyspace Reference

| Key pattern | Type | TTL | Purpose |
|---|---|---|---|
| `rl:{policy}:{subject}` | STRING counter | window | **Rate limiting**. Subject = `user:{id}` if authed, else `ip:{ip}` |
| `otp:{purpose}:{email}` | STRING (HMAC of OTP) | 300s | OTP storage. `purpose` ∈ `register`, `reset` — scoped to prevent cross-purpose reuse |
| `otp_attempts:{purpose}:{email}` | STRING counter | 300s | Wrong-code attempt counter (lock at 3) |
| `otp_lock:{purpose}:{email}` | STRING | 1800s | 30-minute lockout after 3 failed verifications |
| `otp_cooldown:{purpose}:{email}` | STRING | 60s | Prevent OTP resend within 60s |
| `otp_req_count:{purpose}:{email}` | STRING counter | 3600s | OTP requests per hour |
| `otp_spam_lock:{purpose}:{email}` | STRING | 3600s | Lock after 3 requests/hour |
| `login_fail:{email}` | STRING counter | 900s | Failed login counter |
| `login_lock:{email}` | STRING | 900s | 15-minute login lockout |
| `auth:refresh:{user_id}:{jti}` | STRING | 7d | **Refresh-token allowlist** — rotation + reuse detection |
| `auth:deny:{jti}` | STRING | remaining lifetime | Access-token denylist on logout |
| `auth:reset:{sha256(token)}` | STRING (email) | 600s | Single-use password-reset token |
| `ws:ticket:{ticket}` | STRING JSON | 30s | **Single-use WS auth ticket** (`GETDEL`) |
| `room:{code}:presence` | HASH `pid → JSON` | none (cleaned on leave) | Live participants: name, role, audio, video, hand |
| `room:{code}:hb` | ZSET `pid → last_seen_ts` | none | Heartbeat; reaper evicts > 60s stale entries |
| `room:{code}:state` | HASH | 24h | Room flags: `allow_self_unmute`, `locked`, `host_pid` |
| `room:{code}:banned` | SET | 24h | Removed user_ids/guest_keys — cannot rejoin |
| `room:{code}` | PUB/SUB channel | — | **Cross-instance fan-out** |
| `cache:meeting:{code}` | STRING JSON | 60s | **Cache-aside** for meeting public lookup |
| `idem:{subject}:{key}` | STRING JSON | 24h | **Idempotency** for POST /meetings* (`SET NX`) |
| `lock:meeting:{code}` | STRING (`SET NX PX 5000`) | 5s | **Distributed lock** for start/end/host-promotion |

## Why Redis for Each Use Case

### Rate limiting
SQLite counters would require a write-lock on every request. Redis `INCR` is atomic and sub-millisecond. The Lua script `INCR + EXPIRE NX` performs this in one round trip.

**Fail-open:** If Redis is unreachable, rate limiting is skipped and the error is logged. Availability of the app beats a brief unprotected window.

### OTP storage
OTP is stored as `HMAC-SHA256(otp, server_secret)` — if Redis is ever breached, raw codes are not exposed. TTL of 300s means stale codes auto-expire without any cleanup job.

### Refresh-token allowlist
Stateless refresh JWTs are cryptographically valid until expiry. The allowlist (`auth:refresh:{uid}:{jti}`) lets us revoke them by deleting the Redis key. On reuse detection (valid JWT but missing jti), we `SCAN auth:refresh:{uid}:*` and delete all — force re-login.

### WS ticket
`GETDEL` is atomic — the ticket is consumed exactly once. Even if a malicious actor captures the ticket from the URL, it's already been deleted by the time they try to reuse it (30s window).

### Presence (HASH per room)
Redis HASHes are the natural structure for "a room's participants." `HSET room:{code}:presence pid json` and `HGETALL` give the full roster in O(n). The ZSET heartbeat (`zadd hb now pid`) enables the reaper to evict stale connections.

### Pub/sub fan-out
Each API instance subscribes to `room:{code}` at WebSocket connect time. When one instance broadcasts, it publishes to Redis; Redis delivers to all subscribers (all instances). This makes the API horizontally scalable without sticky sessions.

### Cache-aside (meeting lookup)
`GET /meetings/{code}/public` is called on every join page validation. Caching the result for 60s prevents N DB reads during a spike. The event bus subscriber `DEL cache:meeting:{code}` on any meeting state change.

### Idempotency keys
`SET idem:user:key "PENDING" NX EX 86400` is atomic. If the key already exists, the request is either still in-flight (`PENDING`) → 409, or complete (stored response) → replay. This prevents double-meeting creation from double-clicks.

### Distributed lock
`SET lock:meeting:{code} 1 NX PX 5000` ensures only one API instance can transition a meeting's state at a time. The `PX 5000` auto-releases the lock if the holder crashes.

## Failure Modes

| Failure | Behaviour | Reason |
|---|---|---|
| Redis unreachable (rate limit) | Fail-open, log warning | App availability > brief unprotected window |
| Redis unreachable (OTP) | Fail-closed, return 503 | OTP without storage = security hole |
| Redis unreachable (session) | Fail-closed if no valid JWT | Safety default |
| Redis unreachable (presence) | Disconnect WS clients, log | Can't track who's in the room |
| MemoryStore used | Pub/sub is no-op, counters in-process | Single-instance dev; documented |
