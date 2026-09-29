"""
KeyValueStore protocol and Redis implementation.
"""
from typing import Protocol, Any
import json
import redis.asyncio as aioredis


class KeyValueStore(Protocol):
    async def get(self, key: str) -> str | None: ...
    async def set(self, key: str, value: str, *, ttl: int | None = None, nx: bool = False) -> bool: ...
    async def getdel(self, key: str) -> str | None: ...
    async def incr(self, key: str, *, ttl_on_create: int | None = None) -> int: ...
    async def delete(self, *keys: str) -> int: ...
    async def hset(self, key: str, field: str, value: str) -> None: ...
    async def hget(self, key: str, field: str) -> str | None: ...
    async def hdel(self, key: str, *fields: str) -> int: ...
    async def hgetall(self, key: str) -> dict[str, str]: ...
    async def sadd(self, key: str, *members: str) -> int: ...
    async def sismember(self, key: str, member: str) -> bool: ...
    async def zadd(self, key: str, mapping: dict[str, float]) -> None: ...
    async def zrem(self, key: str, *members: str) -> int: ...


class RedisStore:
    """Async Redis implementation of KeyValueStore."""

    def __init__(self, client: aioredis.Redis) -> None:
        self._client = client

    async def get(self, key: str) -> str | None:
        val = await self._client.get(key)
        return val.decode("utf-8") if isinstance(val, bytes) else val

    async def set(self, key: str, value: str, *, ttl: int | None = None, nx: bool = False) -> bool:
        res = await self._client.set(key, value, ex=ttl, nx=nx)
        return bool(res)

    async def getdel(self, key: str) -> str | None:
        val = await self._client.getdel(key)
        return val.decode("utf-8") if isinstance(val, bytes) else val

    async def incr(self, key: str, *, ttl_on_create: int | None = None) -> int:
        val = await self._client.incr(key)
        if val == 1 and ttl_on_create:
            await self._client.expire(key, ttl_on_create)
        return val

    async def delete(self, *keys: str) -> int:
        if not keys:
            return 0
        return await self._client.delete(*keys)

    async def hset(self, key: str, field: str, value: str) -> None:
        await self._client.hset(key, field, value)

    async def hget(self, key: str, field: str) -> str | None:
        val = await self._client.hget(key, field)
        return val.decode("utf-8") if isinstance(val, bytes) else val

    async def hdel(self, key: str, *fields: str) -> int:
        if not fields:
            return 0
        return await self._client.hdel(key, *fields)

    async def hgetall(self, key: str) -> dict[str, str]:
        raw = await self._client.hgetall(key)
        return {
            (k.decode("utf-8") if isinstance(k, bytes) else k): (v.decode("utf-8") if isinstance(v, bytes) else v)
            for k, v in raw.items()
        }

    async def sadd(self, key: str, *members: str) -> int:
        if not members:
            return 0
        return await self._client.sadd(key, *members)

    async def sismember(self, key: str, member: str) -> bool:
        res = await self._client.sismember(key, member)
        return bool(res)

    async def zadd(self, key: str, mapping: dict[str, float]) -> None:
        await self._client.zadd(key, mapping)

    async def zrem(self, key: str, *members: str) -> int:
        if not members:
            return 0
        return await self._client.zrem(key, *members)
