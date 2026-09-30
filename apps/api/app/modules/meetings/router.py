"""Meeting HTTP endpoints."""
import json
from collections.abc import Awaitable, Callable
from typing import Any
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.modules.meetings.service import MeetingService
from app.modules.meetings.schemas import (
    MeetingResponse,
    PublicMeetingResponse,
    ScheduleMeetingRequest,
    JoinMeetingRequest,
    JoinMeetingResponse,
    MeetingListResponse,
)
from app.modules.auth.dependencies import get_current_user, get_optional_user
from app.modules.users.models import User
from app.core.config import get_settings
from app.infra.cache.factory import get_cache_store
from app.infra.cache.base import KeyValueStore
from app.core.constants import IDEMPOTENCY_TTL_SECONDS
from app.core.exceptions import ConflictError

router = APIRouter()


def get_kv_store():  # type: ignore[return]
    """Return the shared cache used for WebSocket tickets and room state."""
    return get_cache_store()


def get_meeting_service(
    db: AsyncSession = Depends(get_db), cache: KeyValueStore = Depends(get_kv_store)
) -> MeetingService:
    return MeetingService(db, cache)


async def _with_idempotency(
    kv_store: KeyValueStore,
    user_id: str,
    operation: str,
    idempotency_key: str | None,
    action: Callable[[], Awaitable[MeetingResponse]],
) -> MeetingResponse:
    if not idempotency_key:
        return await action()

    cache_key = f"idempotency:meetings:{operation}:{user_id}:{idempotency_key}"
    pending = json.dumps({"state": "PENDING"})
    if not await kv_store.set(cache_key, pending, ttl=IDEMPOTENCY_TTL_SECONDS, nx=True):
        existing = await kv_store.get(cache_key)
        if existing:
            record: dict[str, Any] = json.loads(existing)
            if record.get("state") == "COMPLETE":
                return MeetingResponse.model_validate(record["response"])
        raise ConflictError("Request is still in progress", "REQUEST_IN_PROGRESS")

    try:
        response = await action()
        await kv_store.set(
            cache_key,
            json.dumps({"state": "COMPLETE", "response": response.model_dump(mode="json")}),
            ttl=IDEMPOTENCY_TTL_SECONDS,
        )
        return response
    except Exception:
        await kv_store.delete(cache_key)
        raise


@router.post("/instant", response_model=MeetingResponse, status_code=201)
async def create_instant_meeting(
    request: Request,
    current_user: User = Depends(get_current_user),
    service: MeetingService = Depends(get_meeting_service),
    kv_store: KeyValueStore = Depends(get_kv_store),
) -> MeetingResponse:
    async def create() -> MeetingResponse:
        meeting, invite_url = await service.create_instant(current_user)
        settings = get_settings()
        response = MeetingResponse.from_meeting(meeting, settings.web_base_url)
        response.invite_url = invite_url
        return response

    return await _with_idempotency(
        kv_store, current_user.id, "instant", request.headers.get("Idempotency-Key"), create
    )


@router.post("", response_model=MeetingResponse, status_code=201)
async def schedule_meeting(
    request: Request,
    dto: ScheduleMeetingRequest,
    current_user: User = Depends(get_current_user),
    service: MeetingService = Depends(get_meeting_service),
    kv_store: KeyValueStore = Depends(get_kv_store),
) -> MeetingResponse:
    async def create() -> MeetingResponse:
        meeting = await service.schedule(current_user, dto)
        settings = get_settings()
        return MeetingResponse.from_meeting(meeting, settings.web_base_url)

    return await _with_idempotency(
        kv_store, current_user.id, "scheduled", request.headers.get("Idempotency-Key"), create
    )


@router.get("", response_model=MeetingListResponse)
async def list_meetings(
    scope: str = "upcoming",
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    service: MeetingService = Depends(get_meeting_service),
) -> MeetingListResponse:
    settings = get_settings()
    if scope == "upcoming":
        meetings = await service.list_upcoming(current_user, limit)
    else:
        meetings = await service.list_previous(current_user, limit)
    return MeetingListResponse(
        items=[MeetingResponse.from_meeting(m, settings.web_base_url) for m in meetings],
        next_cursor=None,
    )


@router.get("/{code}/public", response_model=PublicMeetingResponse)
async def get_public_meeting(
    code: str, service: MeetingService = Depends(get_meeting_service)
) -> PublicMeetingResponse:
    """Public endpoint — no auth — for join page validation."""
    info = await service.get_public(code)
    return PublicMeetingResponse(**info)


@router.post("/{code}/start", response_model=MeetingResponse)
async def start_meeting(
    code: str,
    current_user: User = Depends(get_current_user),
    service: MeetingService = Depends(get_meeting_service),
) -> MeetingResponse:
    meeting = await service.start(code, current_user)
    settings = get_settings()
    return MeetingResponse.from_meeting(meeting, settings.web_base_url)


@router.get("/{code}", response_model=MeetingResponse)
async def get_meeting(
    code: str,
    current_user: User = Depends(get_current_user),
    service: MeetingService = Depends(get_meeting_service),
) -> MeetingResponse:
    settings = get_settings()
    meeting = await service.get_by_code(code, current_user)
    return MeetingResponse.from_meeting(meeting, settings.web_base_url)


@router.post("/{code}/join", response_model=JoinMeetingResponse)
async def join_meeting(
    code: str,
    dto: JoinMeetingRequest,
    current_user: User | None = Depends(get_optional_user),
    service: MeetingService = Depends(get_meeting_service),
    kv_store=Depends(get_kv_store),
) -> JoinMeetingResponse:
    result = await service.join(code, dto, current_user, kv_store)
    return JoinMeetingResponse(**result)
