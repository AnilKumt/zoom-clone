# ADR 0002: Redis for Ephemeral State and Pub/Sub

## Context
Real-time presence, token rotation, rate limiting, and cross-instance messaging require fast, TTL-supported storage.

## Decision
We utilize **Redis** for all ephemeral state (OTP codes, presence hashes, refresh allowlists, distributed locks) and pub/sub channels. SQLite is reserved solely for durable facts. In development, a thread-safe `MemoryStore` provides an in-process fallback.

## Consequences
- Sub-millisecond atomic counter increments and presence queries.
- Clean horizontal scaling across stateless API nodes.
