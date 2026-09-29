"""Pydantic schemas for meeting request/response serialization."""
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import Literal


class MeetingSettingsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    host_video_on: bool
    participant_video_on: bool
    mute_on_entry: bool
    join_before_host: bool
    waiting_room: bool
    allow_self_unmute: bool
    chat_enabled: bool


class MeetingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    meeting_code: str
    host_id: str
    host_name: str = ""
    title: str
    description: str | None
    kind: str
    status: str
    scheduled_start_at: datetime | None
    duration_minutes: int | None
    timezone: str
    requires_passcode: bool = False
    invite_url: str = ""
    started_at: datetime | None
    ended_at: datetime | None
    created_at: datetime

    @classmethod
    def from_meeting(cls, meeting: object, base_url: str = "") -> "MeetingResponse":
        # Access attributes dynamically to keep schema decoupled from ORM model
        m = meeting  # type: ignore[assignment]
        return cls(
            id=m.id,  # type: ignore[attr-defined]
            meeting_code=m.meeting_code,  # type: ignore[attr-defined]
            host_id=m.host_id,  # type: ignore[attr-defined]
            host_name=m.host.name if m.host else "",  # type: ignore[attr-defined]
            title=m.title,  # type: ignore[attr-defined]
            description=m.description,  # type: ignore[attr-defined]
            kind=m.kind,  # type: ignore[attr-defined]
            status=m.status,  # type: ignore[attr-defined]
            scheduled_start_at=m.scheduled_start_at,  # type: ignore[attr-defined]
            duration_minutes=m.duration_minutes,  # type: ignore[attr-defined]
            timezone=m.timezone,  # type: ignore[attr-defined]
            requires_passcode=bool(m.passcode),  # type: ignore[attr-defined]
            invite_url=f"{base_url}/j/{m.meeting_code}",  # type: ignore[attr-defined]
            started_at=m.started_at,  # type: ignore[attr-defined]
            ended_at=m.ended_at,  # type: ignore[attr-defined]
            created_at=m.created_at,  # type: ignore[attr-defined]
        )


class PublicMeetingResponse(BaseModel):
    exists: bool
    status: str | None
    title: str | None
    host_name: str | None
    requires_passcode: bool


class ScheduleMeetingRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    scheduled_start_at: datetime
    duration_minutes: int = Field(ge=5, le=1440)
    timezone: str = Field(default="UTC")
    meeting_id_type: Literal["generate", "personal"] = "generate"
    passcode: str | None = Field(default=None, max_length=10)
    host_video_on: bool = True
    participant_video_on: bool = True
    mute_on_entry: bool = False
    join_before_host: bool = False
    waiting_room: bool = False


class JoinMeetingRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    display_name: str = Field(min_length=1, max_length=60)
    passcode: str | None = None
    participant_id: str | None = None  # For idempotent rejoin


class JoinMeetingResponse(BaseModel):
    participant_id: str
    role: str
    ws_url: str
    ws_ticket: str
    ice_servers: list[dict]  # type: ignore[type-arg]


class MeetingListResponse(BaseModel):
    items: list[MeetingResponse]
    next_cursor: str | None
