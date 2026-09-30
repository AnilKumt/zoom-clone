"""
Application configuration loaded from environment variables.
Fails fast at startup if required values are missing.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Application
    app_env: str = "development"
    debug: bool = False

    # Auth mode: "demo" uses a seeded default user; "full" requires login
    auth_mode: str = "demo"

    # Database
    database_url: str = "sqlite+aiosqlite:///./data/app.db"

    # Redis (optional — MemoryStore used as fallback in dev)
    redis_url: str | None = None

    # JWT secrets — required in full auth mode
    jwt_access_secret: str = "dev-access-secret-change-in-prod"
    jwt_refresh_secret: str = "dev-refresh-secret-change-in-prod"
    jwt_access_expire_minutes: int = 15
    jwt_refresh_expire_days: int = 7

    # OTP
    otp_hmac_secret: str = "dev-otp-hmac-secret-change-in-prod"
    expose_dev_otp: bool = True  # Log OTP to console in non-prod

    # CORS / security
    web_base_url: str = "http://localhost:3000"
    ws_base_url: str = "http://localhost:8000"
    allowed_origins: str = "http://localhost:3000"
    trusted_proxy_ips: str = "127.0.0.1"

    # Seed
    seed_on_start: bool = True
    seed_default_user_name: str = "Anil Kumawat"

    # SMTP (optional — ConsoleSender used as fallback)
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from: str = "noreply@zoomclone.dev"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    @property
    def trusted_proxy_ips_list(self) -> list[str]:
        return [ip.strip() for ip in self.trusted_proxy_ips.split(",")]


_settings: Settings | None = None


def get_settings() -> Settings:
    """Singleton accessor — call once per request via FastAPI Depends."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
