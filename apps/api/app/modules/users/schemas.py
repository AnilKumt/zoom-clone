"""Pydantic schemas for User serialization."""
from pydantic import BaseModel, ConfigDict


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    name: str
    avatar_url: str | None
    personal_meeting_id: str
    personal_link_name: str | None
    timezone: str
    plan: str
    is_demo: bool
