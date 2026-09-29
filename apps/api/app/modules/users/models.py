"""User ORM model — represents registered and demo users."""
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Boolean, CheckConstraint
from app.db.base import Base, TimestampMixin
from app.core.ids import generate_ulid, generate_meeting_code


class User(Base, TimestampMixin):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("email = lower(email)", name="ck_users_email_lower"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_ulid)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)
    personal_meeting_id: Mapped[str] = mapped_column(
        String(10), unique=True, nullable=False, default=generate_meeting_code
    )
    personal_link_name: Mapped[str | None] = mapped_column(String(32), unique=True, nullable=True)
    timezone: Mapped[str] = mapped_column(String, default="UTC", nullable=False)
    plan: Mapped[str] = mapped_column(String, default="workplace_basic", nullable=False)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Avoid circular import: forward ref resolved at mapper config time
    meetings: Mapped[list["Meeting"]] = relationship(back_populates="host", lazy="noload")  # type: ignore[name-defined]
