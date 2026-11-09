"""
Notifications routes — Batch 2
Endpoints: list, mark-read, mark-all-read, unread-count
WebSocket: /ws for real-time new-notification push events
"""
from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel, Field

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class NotificationActor(BaseModel):
    id: str
    name: str
    avatar_url: Optional[str] = None


class NotificationItem(BaseModel):
    id: str
    type: str                       # ticket_assigned | sla_breach | comment | mention | system
    title: str
    body: str
    is_read: bool = False
    created_at: str                 # ISO-8601
    actor: Optional[NotificationActor] = None
    target_id: Optional[str] = None  # TKT-xxx / TASK-xxx / PRJ-xxx
    target_type: Optional[str] = None  # ticket | task | project
    target_route: Optional[str] = None  # frontend route


class NotificationListResponse(BaseModel):
    items: List[NotificationItem]
    total: int
    unread_count: int
    page: int
    page_size: int


class UnreadCountResponse(BaseModel):
    unread_count: int


class MarkReadRequest(BaseModel):
    notification_id: str


class BulkMarkReadResponse(BaseModel):
    marked_count: int


# ---------------------------------------------------------------------------
# In-memory store (replaced by DB in production)
# ---------------------------------------------------------------------------

_NOTIFICATIONS: List[dict] = [
    {
        "id": "notif_001",
        "type": "sla_breach",
        "title": "SLA Breach — TKT-1025",
        "body": "Auth proxy latency spike crossed SLA threshold. Immediate action required.",
        "is_read": False,
        "created_at": "2026-11-09T06:52:00Z",
        "actor": {"id": "usr_sys", "name": "System Bot", "avatar_url": None},
        "target_id": "TKT-1025",
        "target_type": "ticket",
        "target_route": "/workspace/tickets/TKT-1025",
    },
    {
        "id": "notif_002",
        "type": "ticket_assigned",
        "title": "Ticket Assigned — TKT-1031",
        "body": "Payment Webhook retry queue exhaustion has been assigned to you.",
        "is_read": False,
        "created_at": "2026-11-09T06:40:00Z",
        "actor": {
            "id": "usr_02",
            "name": "Aarav Mehta",
            "avatar_url": "https://lh3.googleusercontent.com/aida-public/AB6AXuDqo8GgKfFsr5cHkqp1lCuMgd1yOtshoM_YSGgJFFDK0Qgzdq0EUdwPnnMhWjR-vLKk-ohcrmXdD__DMIkM0sihddxtnQilLqE9PAGu-e-IxSgqZa2oyFX_FUbcgOdaYbxR0hdK5dugjU4JeIkGzzlFNdKCR8haQg1EvM3Xzb0YLd2kUzSzoev5QLC1O4W2A7GXgHhIPq6RPxCszdG_snfOg4RAAUrndtuYU-ioTyhB",
        },
        "target_id": "TKT-1031",
        "target_type": "ticket",
        "target_route": "/workspace/tickets/TKT-1031",
    },
    {
        "id": "notif_003",
        "type": "mention",
        "title": "Mention in TKT-1028",
        "body": "David K. mentioned you: '@maya please review the Kafka lag investigation.'",
        "is_read": False,
        "created_at": "2026-11-09T05:55:00Z",
        "actor": {
            "id": "usr_03",
            "name": "David K.",
            "avatar_url": "https://lh3.googleusercontent.com/aida-public/AB6AXuCgpxBabcNP-VflfUu9YxPtRNgBmTPculGmwVPxmA67FPyIuIwm4qwUa1SZB6Ob31t9xz2dfM-HZGM2mWeTTF8ELwGn7hk3zWhLyvo_abqg4as9rbKLAfWH1NfG9EvhTsIbj1jFGmgXElKtRxt-hPjG_KnFLOimtvCmZlBcEHsiM3uP1jk1DMXrsJH360536mg0WTLxlUGj0OVUbNjOySGUYJkfs01YGDuLe34eZ1DO",
        },
        "target_id": "TKT-1028",
        "target_type": "ticket",
        "target_route": "/workspace/tickets/TKT-1028",
    },
    {
        "id": "notif_004",
        "type": "comment",
        "title": "New Comment — TKT-1019",
        "body": "Priya Nair added a comment on cross-region telemetry replication failover.",
        "is_read": True,
        "created_at": "2026-11-09T04:30:00Z",
        "actor": {
            "id": "usr_04",
            "name": "Priya Nair",
            "avatar_url": "https://lh3.googleusercontent.com/aida-public/AB6AXuAEr672y36GRoGPHj6QXmjQ6FVZEYKIXOkynZXObLyfier5tVYr9Bd0TdLPzVwhakG4-1yl4Eo9I_4Ptq8N0OPGgQIJ6YCz2ra55-vKMKWwEmtA_PiWfF0RNfQBh8Sw9Qu6oU7sAhzBn6-fi_1lLFe5oUINz4TvjpZ72jWQobwHD-stL4W8xlP_eYZKa8nQXvroDFyG_bJhq6SIuurny8EwByq_n1HQ86BXP7zXa53O",
        },
        "target_id": "TKT-1019",
        "target_type": "ticket",
        "target_route": "/workspace/tickets/TKT-1019",
    },
    {
        "id": "notif_005",
        "type": "system",
        "title": "SLA Policy Updated",
        "body": "Workspace SLA for P1 tickets updated from 60m to 45m response window.",
        "is_read": True,
        "created_at": "2026-11-08T22:00:00Z",
        "actor": {"id": "usr_sys", "name": "System Bot", "avatar_url": None},
        "target_id": None,
        "target_type": None,
        "target_route": "/workspace/settings/sla",
    },
]

# WebSocket connection manager
_ws_clients: list[WebSocket] = []


async def _broadcast(payload: dict) -> None:
    """Broadcast a JSON payload to all connected WebSocket clients."""
    message = json.dumps(payload)
    dead: list[WebSocket] = []
    for ws in _ws_clients:
        try:
            await ws.send_text(message)
        except Exception:
            dead.append(ws)
    for ws in dead:
        _ws_clients.remove(ws)


# ---------------------------------------------------------------------------
# REST Endpoints
# ---------------------------------------------------------------------------

@router.get("", response_model=NotificationListResponse, summary="List notifications")
async def list_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
):
    """Return paginated notifications for the current user."""
    items = _NOTIFICATIONS
    if unread_only:
        items = [n for n in items if not n["is_read"]]

    total = len(items)
    start = (page - 1) * page_size
    end = start + page_size
    page_items = items[start:end]

    unread_count = sum(1 for n in _NOTIFICATIONS if not n["is_read"])

    return {
        "items": page_items,
        "total": total,
        "unread_count": unread_count,
        "page": page,
        "page_size": page_size,
    }


@router.get("/unread-count", response_model=UnreadCountResponse, summary="Unread notification count")
async def get_unread_count():
    """Returns the total number of unread notifications for badge display."""
    count = sum(1 for n in _NOTIFICATIONS if not n["is_read"])
    return {"unread_count": count}


@router.patch("/{notification_id}/read", summary="Mark a notification as read")
async def mark_notification_read(notification_id: str):
    """Mark a single notification as read."""
    for notif in _NOTIFICATIONS:
        if notif["id"] == notification_id:
            notif["is_read"] = True
            await _broadcast({"event": "notification_read", "notification_id": notification_id})
            return {"success": True, "notification_id": notification_id}
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")


@router.patch("/read-all", response_model=BulkMarkReadResponse, summary="Mark all notifications as read")
async def mark_all_notifications_read():
    """Mark every unread notification as read."""
    count = 0
    for notif in _NOTIFICATIONS:
        if not notif["is_read"]:
            notif["is_read"] = True
            count += 1
    if count:
        await _broadcast({"event": "all_notifications_read", "marked_count": count})
    return {"marked_count": count}


# ---------------------------------------------------------------------------
# WebSocket endpoint
# ---------------------------------------------------------------------------

@router.websocket("/ws")
async def notifications_ws(websocket: WebSocket):
    """
    WebSocket endpoint for real-time notification events.
    Events pushed:
      - new_notification   : { event, notification }
      - notification_read  : { event, notification_id }
      - all_notifications_read : { event, marked_count }
    """
    await websocket.accept()
    _ws_clients.append(websocket)
    # Send current unread count on connect
    unread = sum(1 for n in _NOTIFICATIONS if not n["is_read"])
    await websocket.send_text(json.dumps({"event": "init", "unread_count": unread}))
    try:
        while True:
            await asyncio.sleep(30)  # keep-alive ping
            await websocket.send_text(json.dumps({"event": "ping"}))
    except WebSocketDisconnect:
        _ws_clients.remove(websocket)
    except Exception:
        if websocket in _ws_clients:
            _ws_clients.remove(websocket)
