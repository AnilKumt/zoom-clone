"""User domain service."""
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.modules.users.models import User
from app.core.exceptions import NotFoundError


class UserService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_by_id(self, user_id: str) -> User:
        result = await self._db.execute(
            select(User).where(User.id == user_id, User.is_active.is_(True))
        )
        user = result.scalar_one_or_none()
        if not user:
            raise NotFoundError("User", user_id)
        return user

    async def get_by_email(self, email: str) -> User | None:
        result = await self._db.execute(
            select(User).where(User.email == email.lower(), User.is_active.is_(True))
        )
        return result.scalar_one_or_none()

    async def get_demo_user(self) -> User | None:
        """Return the seeded demo user — used in demo auth_mode."""
        result = await self._db.execute(
            select(User).where(User.is_demo.is_(True), User.is_active.is_(True))
        )
        return result.scalar_one_or_none()


def get_user_service(db: AsyncSession = Depends(get_db)) -> UserService:
    return UserService(db)
