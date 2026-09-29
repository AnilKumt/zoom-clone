"""
Cache factory: provides RedisStore if configured, else fallback MemoryStore.
"""
from app.core.config import get_settings
from app.infra.cache.base import KeyValueStore, RedisStore
from app.infra.cache.memory_store import MemoryStore

_kv_store: KeyValueStore | None = None


def get_cache_store() -> KeyValueStore:
    global _kv_store
    if _kv_store is None:
        settings = get_settings()
        if settings.redis_url:
            import redis.asyncio as aioredis
            client = aioredis.from_url(settings.redis_url, decode_responses=False)
            _kv_store = RedisStore(client)
        else:
            _kv_store = MemoryStore.instance()
    return _kv_store
