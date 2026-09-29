"""
Unit of Work pattern implementation: encapsulates database transactions per use-case.
"""
from typing import Protocol
from sqlalchemy.ext.asyncio import AsyncSession


class AbstractUnitOfWork(Protocol):
    session: AsyncSession

    async def __aenter__(self) -> "AbstractUnitOfWork": ...
    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None: ...
    async def commit(self) -> None: ...
    async def rollback(self) -> None: ...


class SqlAlchemyUnitOfWork:
    """SQLAlchemy transaction wrapper."""

    def __init__(self, session_factory) -> None:
        self.session_factory = session_factory
        self.session: AsyncSession | None = None

    async def __aenter__(self) -> "SqlAlchemyUnitOfWork":
        self.session = self.session_factory()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        if exc_type is not None:
            await self.rollback()
        if self.session:
            await self.session.close()

    async def commit(self) -> None:
        if self.session:
            await self.session.commit()

    async def rollback(self) -> None:
        if self.session:
            await self.session.rollback()
