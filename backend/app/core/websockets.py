import json
import logging
from typing import Dict, Set
from fastapi import WebSocket

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
        """Broadcasts event to all active clients in the workspace. Event type is lowercase."""
        if workspace_id not in self._active_connections:
            return

        message = json.dumps({
            "event": event_type.lower(),
            "data": data,
        })

        dead_connections = set()
        for connection in self._active_connections[workspace_id]:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.warning(f"Failed to send to WebSocket: {e}")
                dead_connections.add(connection)

        for dead in dead_connections:
            self.disconnect(dead, workspace_id)


ws_manager = WorkspaceWebSocketManager()

