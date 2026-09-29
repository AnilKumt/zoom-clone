"""
Unit tests for Meeting domain state machine.
"""
import pytest
from datetime import datetime, timezone
from app.modules.meetings.domain import MeetingDomain, MeetingStatus
from app.core.exceptions import InvalidTransitionError, MeetingNotJoinableError


def test_meeting_start_transition():
    meeting = MeetingDomain(
        id="test-1",
        meeting_code="8338347512",
        host_id="user-1",
        status=MeetingStatus.SCHEDULED,
        scheduled_start_at=None,
        duration_minutes=60,
        passcode=None,
    )
    meeting.start()
    assert meeting.status == MeetingStatus.LIVE


def test_meeting_end_transition():
    meeting = MeetingDomain(
        id="test-1",
        meeting_code="8338347512",
        host_id="user-1",
        status=MeetingStatus.LIVE,
        scheduled_start_at=None,
        duration_minutes=60,
        passcode=None,
    )
    meeting.end()
    assert meeting.status == MeetingStatus.ENDED


def test_illegal_transition_raises():
    meeting = MeetingDomain(
        id="test-1",
        meeting_code="8338347512",
        host_id="user-1",
        status=MeetingStatus.ENDED,
        scheduled_start_at=None,
        duration_minutes=60,
        passcode=None,
    )
    with pytest.raises(InvalidTransitionError):
        meeting.start()


def test_assert_joinable_live():
    meeting = MeetingDomain(
        id="test-1",
        meeting_code="8338347512",
        host_id="user-1",
        status=MeetingStatus.LIVE,
        scheduled_start_at=None,
        duration_minutes=60,
        passcode=None,
    )
    # Should not raise
    meeting.assert_joinable()


def test_assert_joinable_ended_raises():
    meeting = MeetingDomain(
        id="test-1",
        meeting_code="8338347512",
        host_id="user-1",
        status=MeetingStatus.ENDED,
        scheduled_start_at=None,
        duration_minutes=60,
        passcode=None,
    )
    with pytest.raises(MeetingNotJoinableError) as exc_info:
        meeting.assert_joinable()
    assert exc_info.value.details.get("reason") == "ended"
