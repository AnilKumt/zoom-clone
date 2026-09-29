# ADR 0005: SQLite WAL Mode with Concurrency Pragmas

## Context
SQLite with default settings serializes readers and writers, causing database locks during concurrent operations.

## Decision
We configure SQLite with Write-Ahead Logging (`PRAGMA journal_mode=WAL;`), `busy_timeout=5000`, and `synchronous=NORMAL;` across all connections.

## Consequences
- Unlimited concurrent readers without blocking writes.
- 5-second lock timeout prevents immediate transaction failures.
- Postgres migration is a zero-code change (`DATABASE_URL` + Alembic migration).
