"""
PubSub protocol for cross-instance and in-process fanout.
"""
from typing import Protocol, AsyncIterator
import asyncio


class PubSub(Protocol):
    async def publish(self, channel: str, message: str) -> None: ...
    async def subscribe(self, channel: str) -> AsyncIterator[str]: ...


class MemoryPubSub:
    """In-memory pub-sub for single-instance development."""

    def __init__(self) -> None:
        self._subscribers: dict[str, set[asyncio.Queue[str]]] = {}
        self._lock = asyncio.Lock()

    async def publish(self, channel: str, message: str) -> None:
        async with self._lock:
            queues = list(self._subscribers.get(channel, set()))
        for q in queues:
            await q.put(message)

    async def subscribe(self, channel: str) -> AsyncIterator[str]:
        q: asyncio.Queue[str] = asyncio.Queue()
        async with self._lock:
            if channel not in self._subscribers:
                self._subscribers[channel] = set()
            self._subscribers[channel].add(q)
        try:
            while True:
                msg = await q.get()
                yield msg
        finally:
            async with self._lock:
                if channel in self._subscribers and q in self._subscribers[channel]:
                    self._subscribers[channel].remove(q)


class RedisPubSub:
    """Redis-backed pub-sub for cross-instance fanout."""

    def __init__(self, redis_client) -> None:
        self._client = redis_client

    async def publish(self, channel: str, message: str) -> None:
        await self._client.publish(channel, message)

    async def subscribe(self, channel: str) -> AsyncIterator[str]:
        pubsub = self._client.pubsub()
        await pubsub.subscribe(channel)
        try:
            async for msg in pubsub.listen():
                if msg["type"] == "message":
                    data = msg["data"]
                    yield data.decode("utf-8") if isinstance(data, bytes) else str(data)
        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.close()
