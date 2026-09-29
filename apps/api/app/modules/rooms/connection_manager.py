"""
Room Connection Manager: maintains live WebSocket connections per room on this server instance.
"""
from fastapi import WebSocket
import json
import logging
from typing import Any
from app.infra.cache.base import KeyValueStore

logger = logging.getLogger("room_manager")


class ConnectionManager:
    """Manages active WebSockets and facilitates local + Redis pub/sub broadcasting."""

    def __init__(self, cache: KeyValueStore) -> None:
        self._cache = cache
        # room_code -> dict[participant_id, WebSocket]
        self._rooms: dict[str, dict[str, WebSocket]] = {}

    async def connect(self, room_code: str, participant_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        if room_code not in self._rooms:
            self._rooms[room_code] = {}
        self._rooms[room_code][participant_id] = websocket

    def disconnect(self, room_code: str, participant_id: str) -> None:
        if room_code in self._rooms and participant_id in self._rooms[room_code]:
            del self._rooms[room_code][participant_id]
            if not self._rooms[room_code]:
                del self._rooms[room_code]

    async def send_personal(self, websocket: WebSocket, msg_type: str, payload: Any) -> None:
        envelope = {
            "v": 1,
            "type": msg_type,
            "payload": payload,
        }
        await websocket.send_text(json.dumps(envelope))

    async def broadcast_local(self, room_code: str, msg_type: str, payload: Any, exclude_pid: str | None = None) -> None:
        if room_code not in self._rooms:
            return
        envelope = {
            "v": 1,
            "type": msg_type,
            "payload": payload,
        }
        raw = json.dumps(envelope)
        for pid, ws in list(self._rooms[room_code].items()):
            if exclude_pid and pid == exclude_pid:
                continue
            try:
                await ws.send_text(raw)
            except Exception as e:
                logger.warning(f"Error broadcasting to socket {pid}: {e}")

    async def close_participant(self, room_code: str, participant_id: str, code: int = 1000, reason: str = "") -> None:
        if room_code in self._rooms and participant_id in self._rooms[room_code]:
            ws = self._rooms[room_code][participant_id]
            try:
                await ws.close(code=code, reason=reason)
            except Exception:
                pass
            self.disconnect(room_code, participant_id)
