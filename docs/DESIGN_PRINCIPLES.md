# Design Principles & Patterns

## SOLID Principles in Code

| Principle | Where Applied | Concrete File Paths | Justification |
|---|---|---|---|
| **S**RP | Routers vs Services vs Repositories | `app/modules/meetings/router.py`, `app/modules/meetings/service.py` | Routers handle HTTP; services handle domain orchestration; repositories handle persistence. |
| **O**CP | WS Command Dispatcher & Handler Registry | `app/modules/rooms/dispatcher.py`, `app/modules/rooms/handlers/` | Adding new WebSocket message types requires writing a new handler class without modifying the dispatcher. |
| **L**SP | KeyValueStore Implementations | `app/infra/cache/redis_store.py`, `app/infra/cache/memory_store.py` | Both pass the exact same contract test suite (`tests/contract/test_key_value_store.py`) and are fully interchangeable. |
| **I**SP | Focused Protocols | `app/infra/email/base.py`, `app/modules/rooms/permissions.py` | Protocols define only the minimal methods required by clients (`EmailSender.send`, `PermissionPolicy.can`). |
| **D**IP | Dependency Injection via Composition Root | `app/container.py`, `app/modules/auth/service.py` | High-level domain services depend on abstract protocols, not concrete database or Redis implementations. |

---

## Design Patterns

| Pattern | Where Applied | Concrete File Paths |
|---|---|---|
| **Repository** | Data access abstraction | `app/modules/users/service.py`, `app/modules/meetings/service.py` |
| **Unit of Work** | Per-use-case transaction boundary | `app/db/unit_of_work.py` |
| **Service Layer / Facade** | Domain business logic orchestration | `app/modules/auth/service.py`, `app/modules/meetings/service.py` |
| **Factory** | Cache and App instantiation | `app/infra/cache/factory.py`, `app/main.py` |
| **Strategy** | Rate limiting & Auth modes | `app/infra/rate_limit/base.py`, `app/modules/auth/dependencies.py` |
| **Observer / Pub-Sub** | Event bus and WebSocket broadcast | `app/infra/events/bus.py`, `app/infra/pubsub/base.py` |
| **Command** | WebSocket message dispatching | `app/modules/rooms/dispatcher.py` |
| **State** | Meeting lifecycle transitions | `app/modules/meetings/domain.py` |
| **Chain of Responsibility** | Middleware & Auth resolution | `app/middleware/`, `app/modules/auth/dependencies.py` |
| **Proxy** | Next.js API rewrite proxy | `apps/web/next.config.mjs` |
