"""Meeting ORM models — meetings, settings, and participants."""
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, CheckConstraint, Index
from app.db.base import Base, TimestampMixin
from app.core.ids import generate_ulid


class Meeting(Base, TimestampMixin):
    __tablename__ = "meetings"
    __table_args__ = (
        CheckConstraint("kind IN ('instant','scheduled','personal')", name="ck_meetings_kind"),
        CheckConstraint(
            "status IN ('scheduled','live','ended','cancelled')", name="ck_meetings_status"
        ),
        CheckConstraint(
            "duration_minutes IS NULL OR (duration_minutes >= 5 AND duration_minutes <= 1440)",
            name="ck_meetings_duration",
        ),
        Index("ix_meetings_host_status_start", "host_id", "status", "scheduled_start_at"),
        Index("ix_meetings_host_ended", "host_id", "ended_at"),
        Index("ix_meetings_status", "status"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_ulid)
    meeting_code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)
    host_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    kind: Mapped[str] = mapped_column(String, nullable=False)  # instant | scheduled | personal
    status: Mapped[str] = mapped_column(String, nullable=False, default="scheduled")
    scheduled_start_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    timezone: Mapped[str] = mapped_column(String, default="UTC", nullable=False)
    passcode: Mapped[str | None] = mapped_column(String, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    host: Mapped["User"] = relationship(lazy="joined")  # type: ignore[name-defined]
    settings: Mapped["MeetingSettings"] = relationship(
        back_populates="meeting", uselist=False, lazy="joined", cascade="all, delete-orphan"
    )
    participants: Mapped[list["Participant"]] = relationship(
        back_populates="meeting", lazy="noload", cascade="all, delete-orphan"
    )


class MeetingSettings(Base):
    """1:1 extension of Meeting — keeps meetings table narrow (SRP at table level)."""

    __tablename__ = "meeting_settings"

    meeting_id: Mapped[str] = mapped_column(
        String, ForeignKey("meetings.id", ondelete="CASCADE"), primary_key=True
    )
    host_video_on: Mapped[bool] = mapped_column(Boolean, default=True)
    participant_video_on: Mapped[bool] = mapped_column(Boolean, default=True)
    mute_on_entry: Mapped[bool] = mapped_column(Boolean, default=False)
    join_before_host: Mapped[bool] = mapped_column(Boolean, default=False)
    waiting_room: Mapped[bool] = mapped_column(Boolean, default=False)
    allow_self_unmute: Mapped[bool] = mapped_column(Boolean, default=True)
    chat_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    meeting: Mapped[Meeting] = relationship(back_populates="settings")


class Participant(Base):
    """One row per join session — rejoin creates a new row (attendance history)."""

    __tablename__ = "participants"
    __table_args__ = (
        CheckConstraint(
            "role IN ('host','co_host','participant')", name="ck_participants_role"
        ),
        CheckConstraint(
            "status IN ('joined','left','removed')", name="ck_participants_status"
        ),
        Index("ix_participants_meeting_status", "meeting_id", "status"),
        Index("ix_participants_user_joined", "user_id", "joined_at"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_ulid)
    meeting_id: Mapped[str] = mapped_column(
        String, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    guest_key: Mapped[str | None] = mapped_column(String, nullable=True)
    display_name: Mapped[str] = mapped_column(String(60), nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False, default="participant")
    status: Mapped[str] = mapped_column(String, nullable=False, default="joined")
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    left_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    removed_by: Mapped[str | None] = mapped_column(
        String, ForeignKey("participants.id"), nullable=True
    )

    meeting: Mapped[Meeting] = relationship(back_populates="participants")
    user: Mapped["User | None"] = relationship(lazy="joined")  # type: ignore[name-defined]
