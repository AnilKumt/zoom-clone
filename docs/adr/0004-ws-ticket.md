# ADR 0004: Single-Use WebSocket Authentication Tickets

## Context
WebSocket connections cannot send custom HTTP headers during the initial handshake, and putting JWTs in query strings leaks secrets in access logs and browser histories.

## Decision
We issue a cryptographically random, 30-second single-use ticket via REST `POST /meetings/{code}/join`. The WebSocket endpoint consumes and deletes it atomically on connect using Redis `GETDEL`.

## Consequences
- No long-lived tokens in query strings.
- Replay attacks are prevented (tickets cannot be reused).
