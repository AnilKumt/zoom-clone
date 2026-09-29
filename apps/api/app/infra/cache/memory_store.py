"""
In-memory KeyValueStore implementation.
Used as: (1) Redis fallback in dev, (2) test doubles, (3) when REDIS_URL is not set.
"""
import asyncio
from typing import Any
import time


class MemoryStore:
    """Thread-safe in-process key-value store with TTL support."""

    _instance: "MemoryStore | None" = None

    def __init__(self) -> None:
        self._store: dict[str, tuple[Any, float | None]] = {}  # key → (value, expiry_ts or None)
        self._lock = asyncio.Lock()
        self._hashes: dict[str, dict[str, str]] = {}
        self._sets: dict[str, set[str]] = {}
        self._zsets: dict[str, dict[str, float]] = {}

    @classmethod
    def instance(cls) -> "MemoryStore":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _is_expired(self, expiry: float | None) -> bool:
        return expiry is not None and time.time() > expiry

    async def get(self, key: str) -> str | None:
        async with self._lock:
            entry = self._store.get(key)
            if entry is None or self._is_expired(entry[1]):
                return None
            return entry[0]

    async def set(
        self, key: str, value: str, *, ttl: int | None = None, nx: bool = False
    ) -> bool:
        async with self._lock:
            if nx:
                existing = self._store.get(key)
                if existing and not self._is_expired(existing[1]):
                    return False
            expiry = time.time() + ttl if ttl else None
            self._store[key] = (value, expiry)
            return True

    async def getdel(self, key: str) -> str | None:
        async with self._lock:
            entry = self._store.pop(key, None)
            if entry is None or self._is_expired(entry[1]):
                return None
            return entry[0]

    async def incr(self, key: str, *, ttl_on_create: int | None = None) -> int:
        async with self._lock:
            existing = self._store.get(key)
            if existing is None or self._is_expired(existing[1]):
                expiry = time.time() + ttl_on_create if ttl_on_create else None
                self._store[key] = ("1", expiry)
                return 1
            new_val = int(existing[0]) + 1
            self._store[key] = (str(new_val), existing[1])
            return new_val

    async def delete(self, *keys: str) -> int:
        async with self._lock:
            count = 0
            for key in keys:
                if key in self._store:
                    del self._store[key]
                    count += 1
            return count

    async def hset(self, key: str, field: str, value: str) -> None:
        async with self._lock:
            if key not in self._hashes:
                self._hashes[key] = {}
            self._hashes[key][field] = value

    async def hget(self, key: str, field: str) -> str | None:
        async with self._lock:
            return self._hashes.get(key, {}).get(field)

    async def hdel(self, key: str, *fields: str) -> int:
        async with self._lock:
            h = self._hashes.get(key, {})
            removed = 0
            for f in fields:
                if f in h:
                    del h[f]
                    removed += 1
            return removed

    async def hgetall(self, key: str) -> dict[str, str]:
        async with self._lock:
            return dict(self._hashes.get(key, {}))

    async def sadd(self, key: str, *members: str) -> int:
        async with self._lock:
            if key not in self._sets:
                self._sets[key] = set()
            before = len(self._sets[key])
            self._sets[key].update(members)
            return len(self._sets[key]) - before

    async def sismember(self, key: str, member: str) -> bool:
        async with self._lock:
            return member in self._sets.get(key, set())

    async def zadd(self, key: str, mapping: dict[str, float]) -> None:
        async with self._lock:
            if key not in self._zsets:
                self._zsets[key] = {}
            self._zsets[key].update(mapping)

    async def zrem(self, key: str, *members: str) -> int:
        async with self._lock:
            z = self._zsets.get(key, {})
            removed = 0
            for m in members:
                if m in z:
                    del z[m]
                    removed += 1
            return removed

    async def publish(self, channel: str, message: str) -> None:
        # In-memory: no cross-process pub/sub — a no-op for single-instance dev
        pass
