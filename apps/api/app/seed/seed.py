"""
Idempotent database seed — safe to run multiple times.
Timestamps are relative to now so the demo never looks stale.
"""
from datetime import datetime, timezone, timedelta
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_session_factory
from app.modules.users.models import User
from app.modules.meetings.models import Meeting, MeetingSettings
from app.core.ids import generate_ulid, generate_meeting_code
from app.core.config import get_settings

logger = logging.getLogger(__name__)

USERS_DATA = [
    {
        "email": "demo@zoomclone.dev",
        "name": "Anil Kumawat",
        "personal_meeting_id": "8338347512",
        "is_demo": True,
        "timezone": "Asia/Kolkata",
    },
    {
        "email": "arnav@example.com",
        "name": "Arnav Sharda",
        "personal_meeting_id": "7712345678",
        "timezone": "Asia/Kolkata",
    },
    {
        "email": "priya@example.com",
        "name": "Priya Menon",
        "personal_meeting_id": "8823456789",
        "timezone": "Asia/Kolkata",
    },
    {
        "email": "test@example.com",
        "name": "Test User",
        "personal_meeting_id": "9934567890",
        "timezone": "UTC",
    },
    {
        "email": "manager@example.com",
        "name": "Sarah Johnson",
        "personal_meeting_id": "1145678901",
        "timezone": "America/New_York",
    },
    {
        "email": "design@example.com",
        "name": "Raj Kumar",
        "personal_meeting_id": "2256789012",
        "timezone": "Asia/Kolkata",
    },
]


async def run_seed() -> None:
    """Upsert seed data. Safe to call multiple times."""
    factory = get_session_factory()
    if not factory:
        logger.warning("Seed skipped: DB not initialized")
        return

    settings = get_settings()
    # Allow overriding demo user name via environment
    USERS_DATA[0]["name"] = settings.seed_default_user_name

    async with factory() as db:
        users = await _seed_users(db)
        await _seed_meetings(db, users)
    logger.info("Seed completed")


async def _seed_users(db: AsyncSession) -> dict[str, User]:
    users: dict[str, User] = {}
    for data in USERS_DATA:
        result = await db.execute(select(User).where(User.email == data["email"]))
        user = result.scalar_one_or_none()
        if not user:
            user = User(
                id=generate_ulid(),
                email=data["email"],
                name=data["name"],
                personal_meeting_id=data.get("personal_meeting_id", generate_meeting_code()),
                is_demo=data.get("is_demo", False),
                timezone=data.get("timezone", "UTC"),
            )
            db.add(user)
        users[data["email"]] = user
    await db.commit()
    return users


async def _seed_meetings(db: AsyncSession, users: dict[str, User]) -> None:
    demo_user = users["demo@zoomclone.dev"]
    now = datetime.now(timezone.utc)

    meetings_data = [
        # Upcoming
        {"title": "Sprint Planning", "kind": "scheduled", "status": "scheduled",
         "start": now + timedelta(hours=2), "duration": 45, "host": demo_user},
        {"title": "Design Review", "kind": "scheduled", "status": "scheduled",
         "start": now + timedelta(days=1, hours=11), "duration": 60, "host": demo_user},
        {"title": "1:1 with Manager", "kind": "scheduled", "status": "scheduled",
         "start": now + timedelta(days=3), "duration": 30, "passcode": "123456", "host": demo_user},
        {"title": "All Hands", "kind": "scheduled", "status": "scheduled",
         "start": now + timedelta(days=7), "duration": 90, "host": demo_user},
        # Live (for demo)
        {"title": "Daily Standup", "kind": "instant", "status": "live",
         "start": now - timedelta(minutes=5), "duration": 15, "host": demo_user},
        # Previous
        {"title": "Arnav Sharda's Zoom Meeting", "kind": "instant", "status": "ended",
         "start": now - timedelta(days=1),
         "end": now - timedelta(hours=23),
         "host": users.get("arnav@example.com", demo_user)},
        {"title": "Product Retrospective", "kind": "scheduled", "status": "ended",
         "start": now - timedelta(days=3), "end": now - timedelta(days=3) + timedelta(hours=2),
         "host": demo_user},
        {"title": "Priya Menon's Zoom Meeting", "kind": "instant", "status": "ended",
         "start": now - timedelta(days=5), "end": now - timedelta(days=5) + timedelta(hours=1),
         "host": users.get("priya@example.com", demo_user)},
        {"title": "Team Sync", "kind": "scheduled", "status": "ended",
         "start": now - timedelta(days=7), "end": now - timedelta(days=7) + timedelta(hours=1),
         "host": demo_user},
        {"title": "Q3 Planning Session", "kind": "scheduled", "status": "ended",
         "start": now - timedelta(days=14), "end": now - timedelta(days=14) + timedelta(hours=3),
         "host": demo_user},
    ]

    for m_data in meetings_data:
        # Idempotency: skip if title+host+status combo already exists
        result = await db.execute(
            select(Meeting).where(
                Meeting.host_id == m_data["host"].id,
                Meeting.title == m_data["title"],
                Meeting.status == m_data["status"],
            )
        )
        if result.scalar_one_or_none():
            continue

        meeting = Meeting(
            id=generate_ulid(),
            meeting_code=generate_meeting_code(),
            host_id=m_data["host"].id,
            title=m_data["title"],
            kind=m_data["kind"],
            status=m_data["status"],
            scheduled_start_at=m_data.get("start"),
            duration_minutes=m_data.get("duration", 60),
            timezone="Asia/Kolkata",
            passcode=m_data.get("passcode"),
            started_at=m_data.get("start") if m_data["status"] in ("live", "ended") else None,
            ended_at=m_data.get("end"),
        )
        db.add(meeting)
        await db.flush()

        ms = MeetingSettings(meeting_id=meeting.id)
        db.add(ms)

    await db.commit()
