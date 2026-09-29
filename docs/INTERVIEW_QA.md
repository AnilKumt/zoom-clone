# Interview Q&A Playbook

### 1. "Where is SOLID applied in your code?"
- **DIP**: `container.py` and service constructors depend on `KeyValueStore` and `EmailSender` protocols.
- **OCP**: `modules/rooms/dispatcher.py` registers handlers dynamically.
- **LSP**: `RedisStore` and `MemoryStore` pass the same contract tests in `tests/contract/test_key_value_store.py`.
- **SRP**: Clean split between FastAPI routers, domain services, and database models.
- **ISP**: Tiny interfaces like `EmailSender.send` and `PermissionPolicy.can`.

### 2. "How do you prevent a non-host from muting everyone?"
Client UI hides buttons, but the backend verifies every command server-side in `HostPermissionPolicy.can()`. Non-host mute commands are rejected with an error event.

### 3. "What if two users create meetings at the same moment and get the same code?"
Meeting IDs are 10 digits selected uniformly from a 9-billion integer space. The database enforces a `UNIQUE(meeting_code)` constraint. If an `IntegrityError` occurs, an optimistic retry loop generates a fresh code (up to 5 attempts).

### 4. "How does the application scale horizontally?"
FastAPI instances are stateless. Live presence is stored in Redis HASHes, and WebSocket events are fanned out across instances using Redis pub/sub. Any instance can handle any WebSocket connection.

### 5. "Why use single-use WebSocket tickets?"
Passing long-lived JWTs in WebSocket query strings is vulnerable to URL logging, browser history leaks, and proxy exposure. Instead, the client exchanges its credentials for a single-use 30-second ticket over REST. The WebSocket endpoint validates and destroys it atomically using `GETDEL`.
