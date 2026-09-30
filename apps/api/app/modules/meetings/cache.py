"""
Meeting cache-aside helpers and invalidation subscribers.
"""
import json
from typing import Any

from app.core.constants import MEETING_CACHE_TTL
from app.infra.cache.base import KeyValueStore
from app.infra.cache.factory import get_cache_store
from app.infra.events.bus import MeetingEnded, MeetingStarted, get_event_bus


def get_meeting_cache_key(code: str) -> str:
    return f"cache:meeting:{code}"


async def get_cached_public_meeting(
    code: str, cache: KeyValueStore | None = None
) -> dict[str, Any] | None:
    try:
        value = await (cache or get_cache_store()).get(get_meeting_cache_key(code))
        if value is None:
            return None
        cached = json.loads(value)
        return cached if isinstance(cached, dict) else None
    except Exception:
        return None


async def cache_public_meeting(
    code: str, value: dict[str, Any], cache: KeyValueStore | None = None
) -> None:
    try:
        await (cache or get_cache_store()).set(
            get_meeting_cache_key(code), json.dumps(value), ttl=MEETING_CACHE_TTL
        )
    except Exception:
        pass


async def invalidate_public_meeting(code: str, cache: KeyValueStore | None = None) -> None:
    try:
        await (cache or get_cache_store()).delete(get_meeting_cache_key(code))
    except Exception:
        pass


async def on_meeting_started(event: MeetingStarted) -> None:
    await invalidate_public_meeting(event.meeting_code)


async def on_meeting_ended(event: MeetingEnded) -> None:
    await invalidate_public_meeting(event.meeting_code)


def register_meeting_event_subscribers() -> None:
    bus = get_event_bus()
    bus.subscribe(MeetingStarted, on_meeting_started)
    bus.subscribe(MeetingEnded, on_meeting_ended)
