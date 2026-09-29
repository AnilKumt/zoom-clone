"""
Pure domain logic for Meeting lifecycle and state transitions.
Unit-tested and independent of database or HTTP frameworks.
"""
from dataclasses import dataclass
from datetime import datetime, timezone
from app.core.exceptions import InvalidTransitionError, MeetingNotJoinableError


class MeetingStatus:
    SCHEDULED = "scheduled"
    LIVE = "live"
    ENDED = "ended"
    CANCELLED = "cancelled"


@dataclass
class MeetingDomain:
    id: str
    meeting_code: str
    host_id: str
    status: str
    scheduled_start_at: datetime | None
    duration_minutes: int | None
    passcode: str | None
    join_before_host: bool = False

    def start(self) -> None:
        """Transition scheduled -> live."""
        if self.status != MeetingStatus.SCHEDULED:
            raise InvalidTransitionError(self.status, MeetingStatus.LIVE)
        self.status = MeetingStatus.LIVE

    def end(self) -> None:
        """Transition live -> ended."""
        if self.status != MeetingStatus.LIVE:
            raise InvalidTransitionError(self.status, MeetingStatus.ENDED)
        self.status = MeetingStatus.ENDED

    def cancel(self) -> None:
        """Transition scheduled -> cancelled."""
        if self.status != MeetingStatus.SCHEDULED:
            raise InvalidTransitionError(self.status, MeetingStatus.CANCELLED)
        self.status = MeetingStatus.CANCELLED

    def assert_joinable(self, now: datetime | None = None) -> None:
        """Assert whether a participant can join."""
        if self.status == MeetingStatus.ENDED:
            raise MeetingNotJoinableError("ended")
        if self.status == MeetingStatus.CANCELLED:
            raise MeetingNotJoinableError("cancelled")

        if self.status == MeetingStatus.LIVE:
            return

        if self.status == MeetingStatus.SCHEDULED:
            if not self.join_before_host:
                raise MeetingNotJoinableError("not_started")
            # If join_before_host allowed, verify we are within start time window
            if self.scheduled_start_at:
                current_time = now or datetime.now(timezone.utc)
                diff = (self.scheduled_start_at - current_time).total_seconds()
                if diff > 900:  # More than 15 minutes before scheduled start
                    raise MeetingNotJoinableError("too_early")
            return

        raise MeetingNotJoinableError("invalid_status")
