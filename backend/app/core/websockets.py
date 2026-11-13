import json
import logging
from typing import Dict, Set, Optional
from fastapi import WebSocket, status
from jose import jwt, JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.config import settings
from backend.app.models import User, Organization

logger = logging.getLogger(__name__)


class WorkspaceWebSocketManager:
    """Manages real-time WebSocket connections partitioned by workspace/organization."""

    def __init__(self):
        self._active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, workspace_id: str):
        await websocket.accept()
        if workspace_id not in self._active_connections:
            self._active_connections[workspace_id] = set()
        self._active_connections[workspace_id].add(websocket)
        logger.info(f"WebSocket client connected to workspace {workspace_id}")

    def disconnect(self, websocket: WebSocket, workspace_id: str):
        if workspace_id in self._active_connections:
            self._active_connections[workspace_id].discard(websocket)
            if not self._active_connections[workspace_id]:
                del self._active_connections[workspace_id]
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

    async def broadcast_to_workspace(self, workspace_id: str, payload: dict):
        """Helper to broadcast dict payload to workspace clients."""
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
