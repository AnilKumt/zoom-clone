"""
Clock abstraction for testability — never call datetime.now() directly in services.
Inject this via dependency injection.
"""
from datetime import datetime, timezone
from typing import Protocol


class Clock(Protocol):
    def utcnow(self) -> datetime: ...


class SystemClock:
    """Production clock — returns real UTC time."""

    def utcnow(self) -> datetime:
        return datetime.now(timezone.utc)


# Singleton for non-DI contexts (middleware, etc.)
utc_now = SystemClock().utcnow
