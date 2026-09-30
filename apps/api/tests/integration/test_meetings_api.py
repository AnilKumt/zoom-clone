"""
Integration tests for Meeting REST endpoints using AsyncClient.
"""
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.constants import IDEMPOTENCY_TTL_SECONDS
from app.db.session import get_session_factory, init_db
from app.infra.cache.factory import get_cache_store
from app.infra.cache.memory_store import MemoryStore
from app.modules.meetings.cache import get_meeting_cache_key
from app.modules.meetings.router import get_kv_store
from app.modules.users.models import User
from app.main import app
from app.seed.seed import run_seed


@pytest.fixture(autouse=True)
async def setup_db():
    await init_db()
    await run_seed()


@pytest.mark.asyncio
async def test_health_endpoints():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/healthz")
        assert res.status_code == 200
        assert res.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_create_instant_meeting():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/v1/meetings/instant")
        assert res.status_code == 201
        data = res.json()
        assert "meeting_code" in data
        assert len(data["meeting_code"]) == 10
        assert data["status"] == "live"
        assert data["kind"] == "instant"


@pytest.mark.asyncio
async def test_idempotent_instant_meeting_replays_response():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = {"Idempotency-Key": "instant-replay-test"}
        first = await client.post("/api/v1/meetings/instant", headers=headers)
        second = await client.post("/api/v1/meetings/instant", headers=headers)

        assert first.status_code == 201
        assert second.status_code == 201
        assert second.json() == first.json()


@pytest.mark.asyncio
async def test_idempotent_scheduled_meeting_replays_response():
    payload = {
        "title": "Idempotent schedule test",
        "scheduled_start_at": "2030-01-01T12:00:00Z",
        "duration_minutes": 30,
    }
    cache = MemoryStore()
    app.dependency_overrides[get_kv_store] = lambda: cache
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            headers = {"Idempotency-Key": "scheduled-replay-test"}
            first = await client.post("/api/v1/meetings", json=payload, headers=headers)
            second = await client.post("/api/v1/meetings", json=payload, headers=headers)
    finally:
        app.dependency_overrides.pop(get_kv_store, None)

    assert first.status_code == 201
    assert second.status_code == 201
    assert second.json() == first.json()


@pytest.mark.asyncio
async def test_idempotent_meeting_rejects_pending_request():
    cache = MemoryStore()
    key = "pending-request-test"
    async with get_session_factory()() as db:
        result = await db.execute(select(User).where(User.email == "demo@zoomclone.dev"))
        demo_user = result.scalar_one()
    cache_key = f"idempotency:meetings:instant:{demo_user.id}:{key}"
    await cache.set(cache_key, '{"state":"PENDING"}', ttl=IDEMPOTENCY_TTL_SECONDS)
    app.dependency_overrides[get_kv_store] = lambda: cache

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/meetings/instant", headers={"Idempotency-Key": key}
            )
    finally:
        app.dependency_overrides.pop(get_kv_store, None)

    await cache.delete(cache_key)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "REQUEST_IN_PROGRESS"


@pytest.mark.asyncio
async def test_public_lookup_cache_is_invalidated_when_meeting_starts():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        scheduled = await client.post(
            "/api/v1/meetings",
            json={
                "title": "Cache invalidation test",
                "scheduled_start_at": "2030-01-01T12:00:00Z",
                "duration_minutes": 30,
            },
        )
        code = scheduled.json()["meeting_code"]
        await client.get(f"/api/v1/meetings/{code}/public")
        assert await get_cache_store().get(get_meeting_cache_key(code)) is not None

        started = await client.post(f"/api/v1/meetings/{code}/start")

    assert started.status_code == 200
    assert await get_cache_store().get(get_meeting_cache_key(code)) is None


@pytest.mark.asyncio
async def test_public_meeting_lookup():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create meeting
        create_res = await client.post("/api/v1/meetings/instant")
        code = create_res.json()["meeting_code"]

        # 2. Public lookup
        public_res = await client.get(f"/api/v1/meetings/{code}/public")
        assert public_res.status_code == 200
        data = public_res.json()
        assert data["exists"] is True
        assert data["status"] == "live"


@pytest.mark.asyncio
async def test_invalid_meeting_public_lookup():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/meetings/0000000000/public")
        assert res.status_code == 200
        assert res.json()["exists"] is False
