"""
Auth dependency: resolves the current user from JWT cookie or falls back to demo user.
Order: (1) valid access token → user; (2) demo mode → seeded demo user; (3) → 401.
"""
from fastapi import Depends, Cookie, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.modules.users.service import UserService
from app.modules.users.models import User
from app.core.config import get_settings
from app.core.exceptions import UnauthorizedError


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
    access_token: str | None = Cookie(default=None),
) -> User:
    """Resolve current user — see §11.1 of the blueprint for the resolution chain."""
    settings = get_settings()
    user_service = UserService(db)

    # Step 1: Try JWT access token from cookie
    if access_token:
        try:
            from jose import jwt, JWTError  # type: ignore[import-untyped]
            payload = jwt.decode(access_token, settings.jwt_access_secret, algorithms=["HS256"])
            user_id: str | None = payload.get("sub")
            if user_id:
                try:
                    return await user_service.get_by_id(user_id)
                except Exception:
                    pass
        except Exception:
            pass

    # Step 2: Demo mode fallback — evaluators get a working app without auth setup
    if settings.auth_mode == "demo":
        demo_user = await user_service.get_demo_user()
        if demo_user:
            return demo_user

    raise UnauthorizedError()


async def get_optional_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
    access_token: str | None = Cookie(default=None),
) -> User | None:
    """Like get_current_user but returns None instead of raising 401."""
    try:
        return await get_current_user(request, db, access_token)
    except UnauthorizedError:
        return None
