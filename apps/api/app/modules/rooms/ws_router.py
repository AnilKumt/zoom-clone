"""
Full WebSocket router for live Zoom meeting rooms.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
import json
import logging
from app.infra.cache.factory import get_cache_store
from app.modules.rooms.connection_manager import ConnectionManager
from app.modules.rooms.dispatcher import Dispatcher, RoomContext
from app.modules.rooms.handlers.media import (
    MediaStateHandler,
    HandToggleHandler,
    ChatMessageHandler,
    HostCommandsHandler,
)

logger = logging.getLogger("ws_room")

router = APIRouter()

# Singletons for room lifecycle
_cache = get_cache_store()
_manager = ConnectionManager(_cache)
_dispatcher = Dispatcher()

# Register OCP handlers
_dispatcher.register(MediaStateHandler())
_dispatcher.register(HandToggleHandler())
_dispatcher.register(ChatMessageHandler())
_dispatcher.register(HostCommandsHandler())


@router.websocket("/ws/rooms/{code}")
async def room_websocket(websocket: WebSocket, code: str, ticket: str = Query(default="")):
    """
    WebSocket endpoint:
    1. Authenticates single-use ticket via GETDEL (30s lifetime)
    2. Registers connection in ConnectionManager & Redis presence
    3. Sends initial room snapshot to client
    4. Dispatches commands to registered handlers
    5. Cleans up presence on disconnect and notifies room
    """
    cache = get_cache_store()

    # Step 1: Validate single-use ticket
    ticket_raw = await cache.getdel(f"ws:ticket:{ticket}")
    if not ticket_raw:
        # 4001: Bad ticket
        await websocket.close(code=4001, reason="Invalid or expired ticket")
        return

    ticket_data = json.loads(ticket_raw)
    pid = ticket_data["participant_id"]
    display_name = ticket_data["display_name"]
    role = ticket_data["role"]
    user_id = ticket_data.get("user_id")

    # Step 2: Accept connection
    await _manager.connect(code, pid, websocket)

    # Step 3: Register presence in Redis HASH
    presence_entry = {
        "id": pid,
        "display_name": display_name,
        "role": role,
        "audio": True,
        "video": True,
        "hand_raised": False,
    }
    await cache.hset(f"room:{code}:presence", pid, json.dumps(presence_entry))

    # Step 4: Send initial room snapshot
    all_presence = await cache.hgetall(f"room:{code}:presence")
    participants_list = [json.loads(p) for p in all_presence.values()]
    allow_self_unmute = (await cache.hget(f"room:{code}:state", "allow_self_unmute")) != "false"

    await _manager.send_personal(
        websocket,
        "room.snapshot",
        {
            "participants": participants_list,
            "state": {"allow_self_unmute": allow_self_unmute},
        },
    )

    # Broadcast join to others
    await _manager.broadcast_local(code, "participant.joined", presence_entry, exclude_pid=pid)

    ctx = RoomContext(
        room_code=code,
        participant_id=pid,
        role=role,
        display_name=display_name,
        user_id=user_id,
        ws=websocket,
        manager=_manager,
        cache=cache,
    )

    # Step 5: Receive & dispatch loop
    try:
        while True:
            raw_text = await websocket.receive_text()
            if len(raw_text) > 16384:  # 16 KB max
                continue

            msg = json.parse_raw(raw_text) if hasattr(json, "parse_raw") else json.loads(raw_text)
            msg_type = msg.get("type", "")
            payload = msg.get("payload", {})

            # Map host commands to host.command handler
            if msg_type.startswith("host."):
                action = msg_type.replace("host.", "")
                await _dispatcher.dispatch(ctx, "host.command", {"action": action, **payload})
            else:
                await _dispatcher.dispatch(ctx, msg_type, payload)

    except WebSocketDisconnect:
        logger.info(f"Participant {pid} disconnected from room {code}")
    finally:
        _manager.disconnect(code, pid)
        await cache.hdel(f"room:{code}:presence", pid)
        await _manager.broadcast_local(code, "participant.left", {"id": pid, "display_name": display_name})
