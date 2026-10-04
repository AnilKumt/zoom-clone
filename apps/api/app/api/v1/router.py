"""Aggregates all module routers under /api/v1."""
from fastapi import APIRouter
from app.modules.meetings.router import router as meetings_router
from app.modules.users.router import router as users_router
from app.modules.auth.router import router as auth_router
from app.modules.rooms.ws_router import router as rooms_router
from app.infra.cache.factory import get_cache_store
from app.core.config import get_settings

api_router = APIRouter()


@api_router.get("/healthz", tags=["health"])
async def health_check() -> dict:
    """Liveness probe — always returns 200 if the process is alive."""
    return {"status": "ok"}


@api_router.get("/readyz", tags=["health"])
async def readiness_check() -> dict:
    """Readiness probe — checks DB and Redis connectivity."""
    from app.db.session import get_session_factory
    from sqlalchemy import text

    checks: dict = {"db": False, "redis": False}
    errors: list[str] = []

    try:
        factory = get_session_factory()
        async with factory() as session:
            await session.execute(text("SELECT 1"))
        checks["db"] = True
    except Exception as e:
        errors.append(f"db: {e}")

    try:
        settings = get_settings()
        await get_cache_store().get("healthcheck:readiness")
        checks["redis"] = True
        if not settings.redis_url:
            errors.append("redis: using in-memory fallback")
    except Exception as e:
        errors.append(f"redis: {e}")

    all_ok = all(checks.values())
    return {"status": "ok" if all_ok else "degraded", "checks": checks, "errors": errors}


api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(users_router, prefix="/users", tags=["users"])
api_router.include_router(meetings_router, prefix="/meetings", tags=["meetings"])
api_router.include_router(rooms_router, prefix="", tags=["rooms"])
api_router.add_api_route("/me", users_router.routes[0].endpoint, methods=["GET"], tags=["users"], response_model=users_router.routes[0].response_model)  # type: ignore[arg-type]
