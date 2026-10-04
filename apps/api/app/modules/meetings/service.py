"""
Meeting domain service — orchestrates creation, scheduling, joining.
All business rules live here; no HTTP or SQL concerns.
"""
import json
import secrets
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.constants import MEETING_CODE_MAX_RETRIES, WS_TICKET_TTL_SECONDS
from app.core.exceptions import ConflictError, MeetingNotJoinableError, NotFoundError
from app.core.ids import generate_meeting_code, generate_ulid
from app.infra.cache.base import KeyValueStore
from app.modules.meetings.cache import (
    cache_public_meeting,
    get_cached_public_meeting,
    invalidate_public_meeting,
)
from app.modules.meetings.domain import MeetingDomain
from app.modules.meetings.models import Meeting, MeetingSettings, Participant
from app.modules.meetings.schemas import JoinMeetingRequest, ScheduleMeetingRequest
from app.modules.users.models import User


class MeetingService:
    """Handles instant meeting, scheduling, joining, and state transitions."""

    def __init__(self, db: AsyncSession, cache: KeyValueStore) -> None:
        self._db = db
        self._cache = cache

    async def create_instant(self, user: User) -> tuple[Meeting, str]:
        """Create and immediately start an instant meeting. Returns (meeting, invite_url)."""
        settings = get_settings()
        title = f"{user.name}'s Zoom Meeting"
        meeting = await self._create_meeting(
            host=user,
            title=title,
            kind="instant",
            status="live",
            started_at=datetime.now(UTC),
        )
        invite_url = f"{settings.web_base_url}/j/{meeting.meeting_code}"
        return meeting, invite_url

    async def schedule(self, user: User, dto: ScheduleMeetingRequest) -> Meeting:
        """Create a scheduled meeting."""
        return await self._create_meeting(
            host=user,
            title=dto.title,
            kind="scheduled",
            status="scheduled",
            description=dto.description,
            scheduled_start_at=dto.scheduled_start_at,
            duration_minutes=dto.duration_minutes,
            timezone=dto.timezone,
            passcode=dto.passcode,
            settings={
                "host_video_on": dto.host_video_on,
                "participant_video_on": dto.participant_video_on,
                "mute_on_entry": dto.mute_on_entry,
                "join_before_host": dto.join_before_host,
                "waiting_room": dto.waiting_room,
            },
        )

    async def get_public(self, code: str) -> dict:  # type: ignore[type-arg]
        """Return minimal info about a meeting for the join page (no auth required)."""
        cached = await get_cached_public_meeting(code, self._cache)
        if cached is not None:
            return cached

        meeting = await self._get_by_code(code)
        if not meeting:
            result = {
                "exists": False, "status": None,
                "title": None, "host_name": None, "requires_passcode": False,
            }
        else:
            result = {
                "exists": True,
                "status": meeting.status,
                "title": meeting.title,
                "host_name": meeting.host.name if meeting.host else None,
                "requires_passcode": bool(meeting.passcode),
            }
        await cache_public_meeting(code, result, self._cache)
        return result

    async def get_by_code(self, code: str, user: User) -> Meeting:
        meeting = await self._get_by_code(code)
        if not meeting or meeting.host_id != user.id:
            raise NotFoundError("Meeting", code)
        return meeting

    async def start(self, code: str, user: User) -> Meeting:
        """Start a scheduled meeting after verifying the requesting host."""
        meeting = await self.get_by_code(code, user)
        lifecycle = MeetingDomain(
            id=meeting.id,
            meeting_code=meeting.meeting_code,
            host_id=meeting.host_id,
            status=meeting.status,
            scheduled_start_at=meeting.scheduled_start_at,
            duration_minutes=meeting.duration_minutes,
            passcode=meeting.passcode,
            join_before_host=meeting.settings.join_before_host if meeting.settings else False,
        )
        lifecycle.start()
        meeting.status = lifecycle.status
        meeting.started_at = datetime.now(UTC)
        await self._db.commit()
        await self._db.refresh(meeting)
        await invalidate_public_meeting(code, self._cache)
        return meeting

    async def end(self, code: str, user: User) -> Meeting:
        """End a live meeting (host-only)."""
        meeting = await self.get_by_code(code, user)
        meeting.status = "ended"
        meeting.ended_at = datetime.now(UTC)
        # Update any currently joined participant rows
        part_result = await self._db.execute(
            select(Participant).where(
                Participant.meeting_id == meeting.id,
                Participant.status == "joined",
            )
        )
        for p in part_result.scalars().all():
            p.status = "left"
            p.left_at = datetime.now(UTC)

        await self._db.commit()
        await self._db.refresh(meeting)
        await invalidate_public_meeting(code, self._cache)
        return meeting

    async def list_participants(self, code: str) -> list[Participant]:
        """List active or all participants for a given meeting."""
        meeting = await self._get_by_code(code)
        if not meeting:
            raise NotFoundError("Meeting", code)
        result = await self._db.execute(
            select(Participant)
            .where(Participant.meeting_id == meeting.id)
            .order_by(Participant.joined_at)
        )
        return list(result.scalars().all())

    async def leave(self, code: str, participant_id: str) -> bool:
        """Mark a participant as left."""
        meeting = await self._get_by_code(code)
        if not meeting:
            raise NotFoundError("Meeting", code)
        result = await self._db.execute(
            select(Participant).where(
                Participant.id == participant_id,
                Participant.meeting_id == meeting.id,
            )
        )
        participant = result.scalar_one_or_none()
        if participant and participant.status == "joined":
            participant.status = "left"
            participant.left_at = datetime.now(UTC)
            await self._db.commit()
            return True
        return False

    async def remove_participant(self, code: str, participant_id: str, host_user: User) -> bool:
        """Remove a participant from the meeting (host-only)."""
        meeting = await self.get_by_code(code, host_user)
        result = await self._db.execute(
            select(Participant).where(
                Participant.id == participant_id,
                Participant.meeting_id == meeting.id,
            )
        )
        participant = result.scalar_one_or_none()
        if participant:
            participant.status = "removed"
            participant.left_at = datetime.now(UTC)
            participant.removed_by = host_user.id
            await self._db.commit()
            return True
        return False

    async def list_upcoming(self, user: User, limit: int = 20) -> list[Meeting]:
        now = datetime.now(UTC)
        result = await self._db.execute(
            select(Meeting)
            .where(
                Meeting.host_id == user.id,
                Meeting.status == "scheduled",
                Meeting.scheduled_start_at >= now,
            )
            .order_by(Meeting.scheduled_start_at)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def list_previous(self, user: User, limit: int = 20) -> list[Meeting]:
        result = await self._db.execute(
            select(Meeting)
            .where(Meeting.host_id == user.id, Meeting.status == "ended")
            .order_by(Meeting.ended_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def join(
        self, code: str, dto: JoinMeetingRequest, user: User | None, kv_store: object
    ) -> dict:  # type: ignore[type-arg]
        """Validate joinability, create participant row, mint WS ticket."""
        meeting = await self._get_by_code(code)
        if not meeting:
            raise MeetingNotJoinableError("not_found")
        if meeting.status == "ended":
            raise MeetingNotJoinableError("ended")
        if meeting.status == "cancelled":
            raise MeetingNotJoinableError("cancelled")
        if meeting.status != "live":
            if not (meeting.settings and meeting.settings.join_before_host):
                raise MeetingNotJoinableError("not_started")

        if meeting.passcode and dto.passcode != meeting.passcode:
            raise MeetingNotJoinableError("wrong_passcode")

        role = "host" if (user and user.id == meeting.host_id) else "participant"

        participant = Participant(
            id=generate_ulid(),
            meeting_id=meeting.id,
            user_id=user.id if user else None,
            guest_key=secrets.token_hex(8) if not user else None,
            display_name=dto.display_name,
            role=role,
            status="joined",
            joined_at=datetime.now(UTC),
        )
        self._db.add(participant)
        await self._db.commit()
        await self._db.refresh(participant)

        # Mint single-use WS ticket stored in KV store
        ticket = secrets.token_urlsafe(32)
        ticket_data = {
            "participant_id": participant.id,
            "meeting_code": code,
            "user_id": user.id if user else None,
            "display_name": dto.display_name,
            "role": role,
        }
        await kv_store.set(  # type: ignore[union-attr]
            f"ws:ticket:{ticket}", json.dumps(ticket_data), ttl=WS_TICKET_TTL_SECONDS
        )

        settings_cfg = get_settings()
        raw_ws_base = (settings_cfg.ws_base_url or "").strip().rstrip("/")
        if not raw_ws_base:
            raw_ws_base = (settings_cfg.web_base_url or "http://localhost:8000").strip().rstrip("/")

        if raw_ws_base.startswith("https://"):
            ws_base = "wss://" + raw_ws_base[8:]
        elif raw_ws_base.startswith("http://"):
            ws_base = "ws://" + raw_ws_base[7:]
        elif raw_ws_base.startswith("wss://") or raw_ws_base.startswith("ws://"):
            ws_base = raw_ws_base
        else:
            ws_base = f"wss://{raw_ws_base}"

        return {
            "participant_id": participant.id,
            "role": role,
            "ws_url": f"{ws_base}/api/v1/ws/rooms/{code}",
            "ws_ticket": ticket,
            "ice_servers": [{"urls": "stun:stun.l.google.com:19302"}],
        }

    async def _create_meeting(self, host: User, title: str, kind: str, status: str, **kwargs) -> Meeting:  # type: ignore[no-untyped-def]
        """Internal helper: create meeting + settings with unique code retry."""
        settings_data: dict = kwargs.pop("settings", {})  # type: ignore[assignment]
        for attempt in range(MEETING_CODE_MAX_RETRIES):
            code = generate_meeting_code()
            try:
                meeting = Meeting(
                    meeting_code=code,
                    host_id=host.id,
                    title=title,
                    kind=kind,
                    status=status,
                    **kwargs,
                )
                self._db.add(meeting)
                await self._db.flush()  # Trigger unique constraint check before commit

                ms = MeetingSettings(meeting_id=meeting.id, **settings_data)
                self._db.add(ms)
                await self._db.commit()
                await self._db.refresh(meeting)
                return meeting
            except IntegrityError:
                # Code collision (extremely rare) — rollback and retry
                await self._db.rollback()
                if attempt == MEETING_CODE_MAX_RETRIES - 1:
                    raise ConflictError("Could not generate unique meeting code", "CODE_COLLISION")
        raise ConflictError("Could not generate unique meeting code", "CODE_COLLISION")

    async def _get_by_code(self, code: str) -> Meeting | None:
        result = await self._db.execute(
            select(Meeting).where(Meeting.meeting_code == code)
        )
        return result.scalar_one_or_none()
