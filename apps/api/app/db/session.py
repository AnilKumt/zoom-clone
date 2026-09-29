"""
Async SQLAlchemy engine and session factory.
Configured with WAL mode and appropriate pragmas for SQLite.
"""
import os
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import event, text
from app.core.config import get_settings

_engine = None
_session_factory = None


async def init_db() -> None:
    """Create engine, apply WAL pragmas, and create all tables."""
    global _engine, _session_factory
    settings = get_settings()

    # Ensure data directory exists for SQLite file path
    db_path = settings.database_url.replace("sqlite+aiosqlite:///", "")
    dir_part = os.path.dirname(db_path.lstrip("./"))
    if dir_part:
        os.makedirs(dir_part, exist_ok=True)
    else:
        os.makedirs("data", exist_ok=True)

    _engine = create_async_engine(
        settings.database_url,
        echo=settings.debug,
        connect_args={
            "check_same_thread": False,
            "timeout": 5,
        },
    )

    _session_factory = async_sessionmaker(
        _engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    # Apply WAL and other pragmas on every new connection
    @event.listens_for(_engine.sync_engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):  # type: ignore[misc]
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()

    # Create all tables
    from app.db.base import Base
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


def get_session_factory():  # type: ignore[return]
    return _session_factory


async def get_db() -> AsyncSession:
    """FastAPI dependency — yields a session and commits/rolls back on exit."""
    factory = get_session_factory()
    async with factory() as session:
        yield session
