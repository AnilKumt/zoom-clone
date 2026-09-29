"""
Meeting cache-aside helpers and invalidation subscribers.
"""
import json
from app.infra.cache.factory import get_cache_store
from app.infra.events.bus import get_event_bus, MeetingStarted, MeetingEnded


def get_meeting_cache_key(code: str) -> str:
    return f"cache:meeting:{code}"


async def on_meeting_started(event: MeetingStarted) -> None:
    cache = get_cache_store()
    await cache.delete(get_meeting_cache_key(event.meeting_code))


async def on_meeting_ended(event: MeetingEnded) -> None:
    cache = get_cache_store()
    await cache.delete(get_meeting_cache_key(event.meeting_code))


def register_meeting_event_subscribers() -> None:
    bus = get_event_bus()
    bus.subscribe(MeetingStarted, on_meeting_started)
    bus.subscribe(MeetingEnded, on_meeting_ended)
