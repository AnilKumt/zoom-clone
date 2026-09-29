"""
Integration tests for Meeting REST endpoints using AsyncClient.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.session import init_db
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
