"""
Handlers for media and interaction states.
"""
from typing import ClassVar, Any
import json
from app.modules.rooms.dispatcher import CommandHandler, RoomContext
from app.modules.rooms.permissions import HostPermissionPolicy, HostAction


class MediaStateHandler:
    type: ClassVar[str] = "media.state"

    async def handle(self, ctx: RoomContext, payload: dict[str, Any]) -> None:
        audio = payload.get("audio", True)
        video = payload.get("video", True)

        # Check self-unmute restriction
        state_raw = await ctx.cache.hget(f"room:{ctx.room_code}:state", "allow_self_unmute")
        allow_self_unmute = state_raw != "false"

        if not allow_self_unmute and audio and ctx.role not in ("host", "co_host"):
            # Reject unmute
            await ctx.manager.send_personal(ctx.ws, "error", {"code": "SELF_UNMUTE_FORBIDDEN"})
            return

        # Update presence in Redis
        p_json = await ctx.cache.hget(f"room:{ctx.room_code}:presence", ctx.participant_id)
        if p_json:
            p_data = json.loads(p_json)
            p_data["audio"] = audio
            p_data["video"] = video
            await ctx.cache.hset(f"room:{ctx.room_code}:presence", ctx.participant_id, json.dumps(p_data))

        # Broadcast update to room
        await ctx.manager.broadcast_local(
            ctx.room_code,
            "participant.updated",
            {
                "id": ctx.participant_id,
                "display_name": ctx.display_name,
                "role": ctx.role,
                "audio": audio,
                "video": video,
            },
        )


class HandToggleHandler:
    type: ClassVar[str] = "hand.toggle"

    async def handle(self, ctx: RoomContext, payload: dict[str, Any]) -> None:
        raised = payload.get("hand_raised", True)
        await ctx.manager.broadcast_local(
            ctx.room_code,
            "hand.updated",
            {
                "participant_id": ctx.participant_id,
                "hand_raised": raised,
            },
        )


class ChatMessageHandler:
    type: ClassVar[str] = "chat.message"

    async def handle(self, ctx: RoomContext, payload: dict[str, Any]) -> None:
        text = payload.get("text", "")[:2000]
        if not text.strip():
            return

        await ctx.manager.broadcast_local(
            ctx.room_code,
            "chat.message",
            {
                "id": payload.get("id", ""),
                "sender": ctx.display_name,
                "text": text,
                "time": payload.get("time", ""),
            },
            exclude_pid=ctx.participant_id,
        )


class ReactionHandler:
    type: ClassVar[str] = "reaction.send"

    async def handle(self, ctx: RoomContext, payload: dict[str, Any]) -> None:
        emoji = str(payload.get("emoji", ""))[:8]
        if not emoji:
            return
        await ctx.manager.broadcast_local(
            ctx.room_code,
            "reaction.received",
            {"participant_id": ctx.participant_id, "sender": ctx.display_name, "emoji": emoji},
        )


class RtcSignalHandler:
    """Relay WebRTC negotiation messages to one participant in the room."""

    def __init__(self, message_type: str) -> None:
        self.type = message_type

    async def handle(self, ctx: RoomContext, payload: dict[str, Any]) -> None:
        target_id = payload.get("target_id")
        if not isinstance(target_id, str) or target_id == ctx.participant_id:
            return
        signal = {key: value for key, value in payload.items() if key != "target_id"}
        signal["from_id"] = ctx.participant_id
        await ctx.manager.send_to_participant(ctx.room_code, target_id, self.type, signal)


class HostCommandsHandler:
    """Handles host action commands: mute_all, mute, remove, end."""
    type: ClassVar[str] = "host.command"

    def __init__(self) -> None:
        self.policy = HostPermissionPolicy()

    async def handle(self, ctx: RoomContext, payload: dict[str, Any]) -> None:
        action = payload.get("action")
        target_id = payload.get("target_id") or payload.get("participant_id")

        if action == "mute_all":
            if not self.policy.can(ctx.role, HostAction.MUTE_ALL):
                await ctx.manager.send_personal(ctx.ws, "error", {"code": "FORBIDDEN"})
                return

            allow_self_unmute = payload.get("allow_self_unmute", True)
            await ctx.cache.hset(f"room:{ctx.room_code}:state", "allow_self_unmute", "true" if allow_self_unmute else "false")
            presence = await ctx.cache.hgetall(f"room:{ctx.room_code}:presence")
            for participant_id, raw in presence.items():
                participant = json.loads(raw)
                if participant_id != ctx.participant_id:
                    participant["audio"] = False
                    await ctx.cache.hset(
                        f"room:{ctx.room_code}:presence", participant_id, json.dumps(participant)
                    )
            await ctx.manager.broadcast_local(
                ctx.room_code,
                "host.muted_all",
                {"allow_self_unmute": allow_self_unmute, "by": ctx.participant_id},
            )

        elif action in ("mute", "unmute") and target_id:
            target = await ctx.cache.hget(f"room:{ctx.room_code}:presence", target_id)
            target_role = json.loads(target).get("role") if target else None
            host_action = HostAction.MUTE_PARTICIPANT
            if not self.policy.can(ctx.role, host_action, target_role):
                await ctx.manager.send_personal(ctx.ws, "error", {"code": "FORBIDDEN"})
                return
            if target:
                participant = json.loads(target)
                participant["audio"] = action == "unmute"
                await ctx.cache.hset(
                    f"room:{ctx.room_code}:presence", target_id, json.dumps(participant)
                )
                await ctx.manager.broadcast_local(
                    ctx.room_code,
                    "participant.updated",
                    participant,
                )

        elif action == "unmute_all":
            if not self.policy.can(ctx.role, HostAction.UNMUTE_ALL):
                await ctx.manager.send_personal(ctx.ws, "error", {"code": "FORBIDDEN"})
                return
            await ctx.cache.hset(f"room:{ctx.room_code}:state", "allow_self_unmute", "true")
            presence = await ctx.cache.hgetall(f"room:{ctx.room_code}:presence")
            for participant_id, raw in presence.items():
                participant = json.loads(raw)
                participant["audio"] = True
                await ctx.cache.hset(
                    f"room:{ctx.room_code}:presence", participant_id, json.dumps(participant)
                )
            await ctx.manager.broadcast_local(ctx.room_code, "host.unmuted_all", {"by": ctx.participant_id})

        elif action == "remove" and target_id:
            target = await ctx.cache.hget(f"room:{ctx.room_code}:presence", target_id)
            target_role = json.loads(target).get("role") if target else None
            if not self.policy.can(ctx.role, HostAction.REMOVE_PARTICIPANT, target_role):
                await ctx.manager.send_personal(ctx.ws, "error", {"code": "FORBIDDEN"})
                return

            # Ban participant & close socket with 4003
            await ctx.cache.sadd(f"room:{ctx.room_code}:banned", target_id)
            await ctx.cache.hdel(f"room:{ctx.room_code}:presence", target_id)
            await ctx.manager.close_participant(ctx.room_code, target_id, code=4003, reason="Removed by host")
            await ctx.manager.broadcast_local(
                ctx.room_code,
                "participant.left",
                {"id": target_id, "display_name": "Removed Participant"},
            )

        elif action == "end":
            if not self.policy.can(ctx.role, HostAction.END_MEETING):
                await ctx.manager.send_personal(ctx.ws, "error", {"code": "FORBIDDEN"})
                return

            await ctx.manager.broadcast_local(ctx.room_code, "meeting.ended", {"by": ctx.participant_id})
