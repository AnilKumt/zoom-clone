"""
Server-side permission policy for Room & Host actions.
All host commands are strictly validated here.
"""
from enum import Enum
from typing import Protocol


class HostAction(str, Enum):
    MUTE_ALL = "mute_all"
    UNMUTE_ALL = "unmute_all"
    MUTE_PARTICIPANT = "mute"
    REMOVE_PARTICIPANT = "remove"
    MAKE_HOST = "make_host"
    MAKE_CO_HOST = "make_co_host"
    END_MEETING = "end"


class PermissionPolicy(Protocol):
    def can(self, actor_role: str, action: HostAction, target_role: str | None = None) -> bool: ...


class HostPermissionPolicy:
    """Default server-side authorization policy."""

    def can(self, actor_role: str, action: HostAction, target_role: str | None = None) -> bool:
        if actor_role == "host":
            return True

        if actor_role == "co_host":
            if action in (HostAction.END_MEETING, HostAction.MAKE_HOST):
                return False
            # Co-hosts cannot target the host or other co-hosts
            if target_role in ("host", "co_host"):
                return False
            return True

        return False
