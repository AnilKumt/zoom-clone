"""
In-process event bus for decoupled domain event handling (Observer pattern).
"""
from typing import Callable, Any, Type, Awaitable
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class DomainEvent:
    occurred_at: datetime


@dataclass(frozen=True)
class MeetingStarted(DomainEvent):
    meeting_id: str
    meeting_code: str
    host_id: str


@dataclass(frozen=True)
class MeetingEnded(DomainEvent):
    meeting_id: str
    meeting_code: str
    ended_by: str


@dataclass(frozen=True)
class ParticipantJoined(DomainEvent):
    meeting_id: str
    participant_id: str
    display_name: str


@dataclass(frozen=True)
class ParticipantRemoved(DomainEvent):
    meeting_id: str
    participant_id: str
    removed_by: str


EventHandler = Callable[[Any], Awaitable[None]]


class EventBus:
    """Publish-subscribe domain event bus."""

    def __init__(self) -> None:
        self._handlers: dict[Type[DomainEvent], list[EventHandler]] = {}

    def subscribe(self, event_type: Type[DomainEvent], handler: EventHandler) -> None:
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)

    async def publish(self, event: DomainEvent) -> None:
        handlers = self._handlers.get(type(event), [])
        for handler in handlers:
            try:
                await handler(event)
            except Exception as e:
                import logging
                logging.getLogger("event_bus").error(f"Error executing event handler {handler}: {e}")


# Global singleton instance
_event_bus = EventBus()


def get_event_bus() -> EventBus:
    return _event_bus
