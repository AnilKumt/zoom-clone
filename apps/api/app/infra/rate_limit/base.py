"""
Rate limiting abstractions and algorithms.
"""
from typing import Protocol
from dataclasses import dataclass
import time
from app.infra.cache.base import KeyValueStore


@dataclass
class RateLimitResult:
    allowed: bool
    limit: int
    remaining: int
    reset_epoch: int
    retry_after: int = 0


class RateLimitAlgorithm(Protocol):
    async def check(self, key: str, limit: int, window_s: int) -> RateLimitResult: ...


class FixedWindowLimiter:
    """Fixed-window counter algorithm with atomic increment."""

    def __init__(self, store: KeyValueStore) -> None:
        self._store = store

    async def check(self, key: str, limit: int, window_s: int) -> RateLimitResult:
        now = int(time.time())
        window_start = (now // window_s) * window_s
        reset_epoch = window_start + window_s
        bucket_key = f"{key}:{window_start}"

        current_count = await self._store.incr(bucket_key, ttl_on_create=window_s + 5)
        remaining = max(0, limit - current_count)
        allowed = current_count <= limit
        retry_after = reset_epoch - now if not allowed else 0

        return RateLimitResult(
            allowed=allowed,
            limit=limit,
            remaining=remaining,
            reset_epoch=reset_epoch,
            retry_after=retry_after,
        )


class RateLimitPolicy:
    GLOBAL_ANON_LIMIT = 100
    GLOBAL_AUTH_LIMIT = 1000
    WINDOW_15M = 900

    PUBLIC_JOIN_ANON_LIMIT = 30
    PUBLIC_JOIN_AUTH_LIMIT = 60
    WINDOW_1M = 60
