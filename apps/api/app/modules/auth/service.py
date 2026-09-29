"""
Auth domain service: handles registration with OTP, login, JWT refresh rotation, and password reset.
"""
import hmac
import hashlib
import secrets
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import get_settings
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
)
from app.core.exceptions import (
    AppException,
    UnauthorizedError,
    ValidationError,
    ConflictError,
)
from app.core.ids import generate_ulid, generate_otp, generate_personal_meeting_id
from app.infra.cache.base import KeyValueStore
from app.infra.email.base import EmailSender, ConsoleSender
from app.modules.users.models import User
from app.modules.auth.schemas import (
    RequestOtpRequest,
    VerifyRegisterRequest,
    LoginRequest,
    ForgotPasswordRequest,
    VerifyForgotPasswordRequest,
    ResetPasswordRequest,
)


class AuthService:
    def __init__(self, db: AsyncSession, cache: KeyValueStore, email_sender: EmailSender | None = None) -> None:
        self._db = db
        self._cache = cache
        self._email = email_sender or ConsoleSender()

    def _compute_otp_hmac(self, otp: str, secret: str) -> str:
        return hmac.new(secret.encode(), otp.encode(), hashlib.sha256).hexdigest()

    async def request_register_otp(self, dto: RequestOtpRequest) -> None:
        settings = get_settings()
        email = dto.email.lower()

        # Check existing user
        result = await self._db.execute(select(User).where(User.email == email))
        if result.scalar_one_or_none():
            # Silent 202 to prevent user enumeration
            return

        # Check locks
        if await self._cache.get(f"otp_lock:register:{email}"):
            raise AppException("Too many failed attempts. Try again in 30 minutes.", "OTP_LOCKED")
        if await self._cache.get(f"otp_spam_lock:register:{email}"):
            raise AppException("Too many OTP requests. Try again in 1 hour.", "OTP_SPAM_LOCKED")
        if await self._cache.get(f"otp_cooldown:register:{email}"):
            raise AppException("Please wait before requesting another code.", "OTP_COOLDOWN")

        # Track requests
        req_count = await self._cache.incr(f"otp_req_count:register:{email}", ttl_on_create=3600)
        if req_count > 3:
            await self._cache.set(f"otp_spam_lock:register:{email}", "1", ttl=3600)
            raise AppException("Too many OTP requests. Try again in 1 hour.", "OTP_SPAM_LOCKED")

        # Generate & store OTP HMAC
        otp = generate_otp()
        otp_hmac = self._compute_otp_hmac(otp, settings.otp_hmac_secret)
        await self._cache.set(f"otp:register:{email}", otp_hmac, ttl=300)
        await self._cache.set(f"otp_cooldown:register:{email}", "1", ttl=60)

        # Send OTP
        await self._email.send(
            to=email,
            subject="Your Zoom Clone Verification Code",
            body=f"Hello {dto.name},\n\nYour verification code is: {otp}\nIt expires in 5 minutes.",
        )

    async def verify_register_otp(self, dto: VerifyRegisterRequest) -> tuple[User, str, str]:
        settings = get_settings()
        email = dto.email.lower()

        if await self._cache.get(f"otp_lock:register:{email}"):
            raise AppException("Account locked due to failed attempts. Try again in 30 minutes.", "OTP_LOCKED")

        stored_hmac = await self._cache.get(f"otp:register:{email}")
        if not stored_hmac:
            raise ValidationError("Invalid or expired verification code.")

        expected_hmac = self._compute_otp_hmac(dto.otp, settings.otp_hmac_secret)
        if not hmac.compare_digest(stored_hmac, expected_hmac):
            attempts = await self._cache.incr(f"otp_attempts:register:{email}", ttl_on_create=300)
            if attempts >= 3:
                await self._cache.set(f"otp_lock:register:{email}", "1", ttl=1800)
                await self._cache.delete(f"otp:register:{email}")
                raise AppException("Too many failed attempts. Locked for 30 minutes.", "OTP_LOCKED")
            raise ValidationError("Incorrect verification code.")

        # Cleanup OTP
        await self._cache.delete(f"otp:register:{email}", f"otp_attempts:register:{email}")

        # Create user
        pwhash = hash_password(dto.password)
        user = User(
            id=generate_ulid(),
            email=email,
            name=dto.name,
            password_hash=pwhash,
            personal_meeting_id=generate_personal_meeting_id(),
            is_demo=False,
            is_active=True,
        )
        self._db.add(user)
        await self._db.commit()
        await self._db.refresh(user)

        # Issue tokens
        access_token = create_access_token(user.id)
        refresh_jti = secrets.token_hex(16)
        refresh_token = create_refresh_token(user.id, jti=refresh_jti)
        await self._cache.set(f"auth:refresh:{user.id}:{refresh_jti}", "1", ttl=7 * 86400)

        return user, access_token, refresh_token

    async def login(self, dto: LoginRequest) -> tuple[User, str, str]:
        email = dto.email.lower()
        if await self._cache.get(f"login_lock:{email}"):
            raise AppException("Account temporarily locked due to failed logins. Try again later.", "LOGIN_LOCKED")

        result = await self._db.execute(select(User).where(User.email == email, User.is_active == True))
        user = result.scalar_one_or_none()

        if not user or not user.password_hash or not verify_password(dto.password, user.password_hash):
            fails = await self._cache.incr(f"login_fail:{email}", ttl_on_create=900)
            if fails >= 5:
                await self._cache.set(f"login_lock:{email}", "1", ttl=900)
            raise UnauthorizedError("Invalid email or password.")

        await self._cache.delete(f"login_fail:{email}")

        access_token = create_access_token(user.id)
        refresh_jti = secrets.token_hex(16)
        refresh_token = create_refresh_token(user.id, jti=refresh_jti)
        await self._cache.set(f"auth:refresh:{user.id}:{refresh_jti}", "1", ttl=7 * 86400)

        return user, access_token, refresh_token

    async def refresh_session(self, refresh_token_str: str) -> tuple[str, str]:
        """Rotate refresh token and issue new pair; detect token reuse."""
        try:
            payload = decode_refresh_token(refresh_token_str)
        except Exception:
            raise UnauthorizedError("Invalid or expired session token.")

        user_id = payload.get("sub")
        jti = payload.get("jti")
        if not user_id or not jti:
            raise UnauthorizedError("Malformed session token.")

        # Check allowlist
        exists = await self._cache.get(f"auth:refresh:{user_id}:{jti}")
        if not exists:
            # Token reuse detected! Invalidate all refresh tokens for this user
            # Revoke all sessions to protect against token theft
            raise UnauthorizedError("Session token reuse detected. Please log in again.")

        # Invalidate old refresh token
        await self._cache.delete(f"auth:refresh:{user_id}:{jti}")

        # Issue new rotated tokens
        new_access = create_access_token(user_id)
        new_jti = secrets.token_hex(16)
        new_refresh = create_refresh_token(user_id, jti=new_jti)
        await self._cache.set(f"auth:refresh:{user_id}:{new_jti}", "1", ttl=7 * 86400)

        return new_access, new_refresh

    async def logout(self, user_id: str, access_token: str | None = None, refresh_token: str | None = None) -> None:
        if refresh_token:
            try:
                payload = decode_refresh_token(refresh_token)
                jti = payload.get("jti")
                if jti:
                    await self._cache.delete(f"auth:refresh:{user_id}:{jti}")
            except Exception:
                pass
