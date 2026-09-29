"""
Command Dispatcher following Open-Closed Principle (OCP).
Adding new message types is done by registering handlers without modifying the dispatcher.
"""
from typing import Protocol, ClassVar, Any
from dataclasses import dataclass
from fastapi import WebSocket
from app.modules.rooms.connection_manager import ConnectionManager
from app.infra.cache.base import KeyValueStore


@dataclass
class RoomContext:
    room_code: str
    participant_id: str
    role: str
    display_name: str
    user_id: str | None
    ws: WebSocket
    manager: ConnectionManager
    cache: KeyValueStore


class CommandHandler(Protocol):
    type: ClassVar[str]
    async def handle(self, ctx: RoomContext, payload: dict[str, Any]) -> None: ...


class Dispatcher:
    """Registry-based command dispatcher."""

    def __init__(self) -> None:
        self._handlers: dict[str, CommandHandler] = {}

    def register(self, handler: CommandHandler) -> None:
        self._handlers[handler.type] = handler

    async def dispatch(self, ctx: RoomContext, msg_type: str, payload: dict[str, Any]) -> None:
        handler = self._handlers.get(msg_type)
        if handler:
            await handler.handle(ctx, payload)
        elif msg_type == "ping":
            await ctx.manager.send_personal(ctx.ws, "pong", {})
