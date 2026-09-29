"""
Contract tests for KeyValueStore implementations (LSP verification).
Both MemoryStore and RedisStore must pass these exact same tests.
"""
import pytest
from app.infra.cache.memory_store import MemoryStore


@pytest.fixture
def memory_store():
    return MemoryStore()


@pytest.mark.asyncio
async def test_get_set_basic(memory_store):
    await memory_store.set("test:key", "value123")
    val = await memory_store.get("test:key")
    assert val == "value123"


@pytest.mark.asyncio
async def test_getdel_single_use(memory_store):
    await memory_store.set("test:ticket", "secret-payload")
    val = await memory_store.getdel("test:ticket")
    assert val == "secret-payload"
    # Second read must return None (single-use semantics)
    val2 = await memory_store.get("test:ticket")
    assert val2 is None


@pytest.mark.asyncio
async def test_incr_counter(memory_store):
    count1 = await memory_store.incr("test:counter")
    assert count1 == 1
    count2 = await memory_store.incr("test:counter")
    assert count2 == 2


@pytest.mark.asyncio
async def test_hash_operations(memory_store):
    await memory_store.hset("room:123:presence", "user1", "alice")
    await memory_store.hset("room:123:presence", "user2", "bob")

    val1 = await memory_store.hget("room:123:presence", "user1")
    assert val1 == "alice"

    all_users = await memory_store.hgetall("room:123:presence")
    assert len(all_users) == 2
    assert all_users["user1"] == "alice"
    assert all_users["user2"] == "bob"

    await memory_store.hdel("room:123:presence", "user1")
    all_users_after = await memory_store.hgetall("room:123:presence")
    assert len(all_users_after) == 1
    assert "user1" not in all_users_after
