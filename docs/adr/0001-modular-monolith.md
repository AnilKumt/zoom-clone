# ADR 0001: Modular Monolith Architecture

## Context
We need a robust, scalable system that can be built and maintained efficiently while allowing clean modular extraction in the future.

## Decision
We choose a **modular monolith** with clear bounded contexts (`auth`, `users`, `meetings`, `participants`, `rooms`, `chat`). Modules communicate strictly through public service interfaces and domain events, never through direct database table joins.

## Consequences
- Single deployment unit simplifies CI/CD, local development, and operations.
- Strong domain encapsulation enables straightforward extraction into microservices if needed later.
