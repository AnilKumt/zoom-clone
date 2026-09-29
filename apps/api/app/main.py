"""
FastAPI application factory.
All configuration, middleware, and router registration happens here.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.session import init_db
from app.middleware.request_id import RequestIdMiddleware
from app.middleware.access_log import AccessLogMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.api.v1.router import api_router
from app.seed.seed import run_seed


@asynccontextmanager
async def lifespan(app: FastAPI):  # type: ignore[misc]
    """Initialize resources on startup; clean up on shutdown."""
    settings = get_settings()
    configure_logging(debug=settings.debug)

    await init_db()

    if settings.seed_on_start:
        await run_seed()

    yield
    # Cleanup: engine and connection pool close automatically via SQLAlchemy GC


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Zoom Clone API",
        version="1.0.0",
        # Expose docs only in debug mode to avoid leaking schema in production
        docs_url="/docs" if settings.debug else None,
        redoc_url="/redoc" if settings.debug else None,
        lifespan=lifespan,
    )

    # CORS — only allow configured origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Custom middleware — outermost first (request_id before access_log for correlation)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(AccessLogMiddleware)
    app.add_middleware(RequestIdMiddleware)

    app.include_router(api_router, prefix="/api/v1")

    return app


app = create_app()
