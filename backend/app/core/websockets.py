import json
import logging
from datetime import datetime, timezone
from typing import Dict, Set, Optional
from fastapi import WebSocket, status
from jose import jwt, JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.config import settings
from backend.app.models import User, Organization
from backend.app.enums import PresenceStatus

logger = logging.getLogger(__name__)


class WorkspaceWebSocketManager:
    """Manages real-time WebSocket connections partitioned by workspace/organization and user."""

    def __init__(self):
        self._active_connections: Dict[str, Set[WebSocket]] = {}
        self._user_connections: Dict[str, Set[WebSocket]] = {}
        self._user_statuses: Dict[str, str] = {}  # In-memory store for user-set status (online, away, busy, offline)
        self._last_active_cached: Dict[str, datetime] = {}
        self._user_workspace: Dict[str, str] = {}

    def set_user_status(self, user_id: str, status_val: str) -> str:
        clean = (status_val or "").strip().lower()
        if clean not in ("online", "away", "busy", "offline"):
            clean = "online"
        self._user_statuses[user_id] = clean
        return clean

    def get_user_status(self, user_id: str) -> Optional[str]:
        return self._user_statuses.get(user_id)

    def is_user_connected(self, user_id: str) -> bool:
        return bool(self._user_connections.get(user_id))

    def touch_user_activity(self, user_id: str, dt: Optional[datetime] = None) -> None:
        self._last_active_cached[user_id] = dt or datetime.now(timezone.utc)

    def get_cached_last_active(self, user_id: str) -> Optional[datetime]:
        return self._last_active_cached.get(user_id)

    async def connect(self, websocket: WebSocket, workspace_id: str, user_id: Optional[str] = None):
        await websocket.accept()
        if workspace_id not in self._active_connections:
            self._active_connections[workspace_id] = set()
        self._active_connections[workspace_id].add(websocket)

        if user_id:
            if user_id not in self._user_connections:
                self._user_connections[user_id] = set()
            self._user_connections[user_id].add(websocket)
            self._user_workspace[user_id] = workspace_id
            now = datetime.now(timezone.utc)
            self.touch_user_activity(user_id, now)

            # Broadcast presence change to workspace
            user_set = self.get_user_status(user_id)
            effective_presence = user_set if user_set in ("away", "busy", "offline") else "online"
            await self.broadcast(
                workspace_id,
                "presence_updated",
                {
                    "user_id": user_id,
                    "presence": effective_presence,
                    "last_active_at": now.isoformat(),
                }
            )

        logger.info(f"WebSocket client connected to workspace {workspace_id} (user: {user_id or 'anonymous'})")

    def disconnect(self, websocket: WebSocket, workspace_id: str, user_id: Optional[str] = None):
        if workspace_id in self._active_connections:
            self._active_connections[workspace_id].discard(websocket)
            if not self._active_connections[workspace_id]:
                del self._active_connections[workspace_id]

        target_uid = user_id
        if target_uid and target_uid in self._user_connections:
            self._user_connections[target_uid].discard(websocket)
            if not self._user_connections[target_uid]:
                del self._user_connections[target_uid]
        else:
            # Check all user sets to safely remove dead connection if user_id wasn't passed
            for uid, conns in list(self._user_connections.items()):
                if websocket in conns:
                    conns.discard(websocket)
                    target_uid = uid
                    if not conns:
                        del self._user_connections[uid]

        logger.info(f"WebSocket client disconnected from workspace {workspace_id}")

    async def broadcast(self, workspace_id: str, event_type: str, data: dict):
        """Broadcasts event to all active clients in the specified workspace."""
        if workspace_id not in self._active_connections:
            return

        message = json.dumps({
            "event": event_type.lower(),
            "data": data,
        }, default=str)

        dead_connections = set()
        for connection in list(self._active_connections[workspace_id]):
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.warning(f"Failed to send to WebSocket: {e}")
                dead_connections.add(connection)

        for dead in dead_connections:
            self.disconnect(dead, workspace_id)

    async def broadcast_to_workspace(self, workspace_id: str, payload: dict, target_user_id: Optional[str] = None):
        """Helper to broadcast dict payload to workspace clients, optionally restricted to a target user."""
        if target_user_id:
            await self.broadcast_to_user(target_user_id, payload)
            return

        if workspace_id not in self._active_connections:
            return
        message = json.dumps(payload, default=str)
        dead_connections = set()
        for connection in list(self._active_connections[workspace_id]):
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.warning(f"Failed to send to WebSocket: {e}")
                dead_connections.add(connection)
        for dead in dead_connections:
            self.disconnect(dead, workspace_id)

    async def broadcast_to_user(self, user_id: str, payload: dict):
        """Helper to broadcast dict payload exclusively to the specified recipient user's active connections."""
        if user_id not in self._user_connections:
            return
        message = json.dumps(payload, default=str)
        dead_connections = set()
        for connection in list(self._user_connections[user_id]):
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.warning(f"Failed to send user-scoped WebSocket to {user_id}: {e}")
                dead_connections.add(connection)
        for dead in dead_connections:
            # find workspace to properly clean up
            for ws_id, ws_set in list(self._active_connections.items()):
                if dead in ws_set:
                    self.disconnect(dead, ws_id, user_id=user_id)
                    break
            else:
                self.disconnect(dead, "", user_id=user_id)


ws_manager = WorkspaceWebSocketManager()


async def authenticate_ws(
    websocket: WebSocket,
    token: Optional[str],
    db: AsyncSession,
    required_workspace_id: Optional[str] = None
) -> Optional[User]:
    """
    Cryptographically authenticates WebSocket handshake against active JWT session.
    Verifies tenant membership if required_workspace_id is provided.
    Rejects and closes with WS_1008_POLICY_VIOLATION on failure.
    """
    if not token or token in ("null", "undefined"):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing authentication token")
        return None

    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type", "access")
        if not user_id or token_type != "access":
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token claims")
            return None
    except JWTError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid or expired token")
        return None

    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalars().first()
    if not user or not user.is_active:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="User account invalid or inactive")
        return None

    if required_workspace_id:
        if user.organization_id != required_workspace_id:
            # Check slug matching as well
            org_res = await db.execute(select(Organization).where(Organization.id == user.organization_id))
            org = org_res.scalars().first()
            if not org or org.slug != required_workspace_id:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Unauthorized tenant access")
                return None

    return user
