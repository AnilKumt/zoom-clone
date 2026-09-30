"""
Auth HTTP router: register, verify, login, refresh, logout, forgot-password.
Sets secure httpOnly cookies for access and refresh tokens.
"""
from fastapi import APIRouter, Depends, Response, Request, Cookie
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.infra.cache.factory import get_cache_store
from app.modules.auth.service import AuthService
from app.modules.auth.schemas import (
    RequestOtpRequest,
    VerifyRegisterRequest,
    LoginRequest,
    ForgotPasswordRequest,
    VerifyForgotPasswordRequest,
    ResetPasswordRequest,
    AuthResponse,
)
from app.modules.users.schemas import UserResponse
from app.modules.auth.dependencies import get_current_user
from app.modules.users.models import User

router = APIRouter()


def get_auth_service(
    db: AsyncSession = Depends(get_db),
    cache=Depends(get_cache_store),
) -> AuthService:
    return AuthService(db, cache)


@router.post("/register/request-otp", status_code=202)
async def request_otp(
    dto: RequestOtpRequest,
    service: AuthService = Depends(get_auth_service),
):
    await service.request_register_otp(dto)
    return {"message": "If the email is valid, a verification code has been sent."}


@router.post("/register/verify", response_model=UserResponse, status_code=201)
async def verify_register(
    dto: VerifyRegisterRequest,
    response: Response,
    service: AuthService = Depends(get_auth_service),
):
    user, access_token, refresh_token = await service.verify_register_otp(dto)

    # Set httpOnly cookies
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=False,  # Set to True in production
        max_age=15 * 60,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=7 * 86400,
        path="/api/v1/auth",
    )

    return UserResponse.model_validate(user)


@router.post("/login", response_model=UserResponse)
async def login(
    dto: LoginRequest,
    response: Response,
    service: AuthService = Depends(get_auth_service),
):
    user, access_token, refresh_token = await service.login(dto)

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=15 * 60,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=7 * 86400,
        path="/api/v1/auth",
    )

    return UserResponse.model_validate(user)


@router.post("/refresh")
async def refresh_session(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    service: AuthService = Depends(get_auth_service),
):
    if not refresh_token:
        from app.core.exceptions import UnauthorizedError
        raise UnauthorizedError("No refresh token provided.")

    new_access, new_refresh = await service.refresh_session(refresh_token)

    response.set_cookie(
        key="access_token",
        value=new_access,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=15 * 60,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=new_refresh,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=7 * 86400,
        path="/api/v1/auth",
    )

    return {"message": "Session refreshed successfully"}


@router.post("/logout")
async def logout(
    response: Response,
    current_user: User = Depends(get_current_user),
    access_token: str | None = Cookie(default=None),
    refresh_token: str | None = Cookie(default=None),
    service: AuthService = Depends(get_auth_service),
):
    await service.logout(current_user.id, access_token, refresh_token)
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/api/v1/auth")
    return {"message": "Logged out successfully"}


@router.post("/password/forgot", status_code=202)
async def forgot_password(
    dto: ForgotPasswordRequest,
    service: AuthService = Depends(get_auth_service),
):
    await service.request_password_reset(dto)
    return {"message": "If the email is registered, reset instructions have been sent."}


@router.post("/password/verify-otp")
async def verify_forgot_password(
    dto: VerifyForgotPasswordRequest,
    service: AuthService = Depends(get_auth_service),
):
    reset_token = await service.verify_password_reset_otp(dto)
    return {"reset_token": reset_token}


@router.post("/password/reset")
async def reset_password(
    dto: ResetPasswordRequest,
    service: AuthService = Depends(get_auth_service),
):
    await service.reset_password(dto)
    return {"message": "Password reset successfully."}
