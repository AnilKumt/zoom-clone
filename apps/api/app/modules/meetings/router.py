"""Meeting HTTP endpoints."""
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

router = APIRouter()


def get_meeting_service(db: AsyncSession = Depends(get_db)) -> MeetingService:
    return MeetingService(db)


def get_kv_store():  # type: ignore[return]
    """Returns MemoryStore for now — swapped for Redis in Phase 5."""
    from app.infra.cache.memory_store import MemoryStore
    return MemoryStore.instance()


@router.post("/instant", response_model=MeetingResponse, status_code=201)
async def create_instant_meeting(
    request: Request,
    current_user: User = Depends(get_current_user),
    service: MeetingService = Depends(get_meeting_service),
) -> MeetingResponse:
    meeting, invite_url = await service.create_instant(current_user)
    settings = get_settings()
    resp = MeetingResponse.from_meeting(meeting, settings.web_base_url)
    resp.invite_url = invite_url
    return resp


@router.post("", response_model=MeetingResponse, status_code=201)
async def schedule_meeting(
    dto: ScheduleMeetingRequest,
    current_user: User = Depends(get_current_user),
    service: MeetingService = Depends(get_meeting_service),
) -> MeetingResponse:
    meeting = await service.schedule(current_user, dto)
    settings = get_settings()
    return MeetingResponse.from_meeting(meeting, settings.web_base_url)


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
