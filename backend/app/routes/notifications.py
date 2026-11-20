"""
Notifications router — Enterprise Database Driven Implementation.
Replaces in-memory stores with persistent SQLAlchemy queries against the Notification model,
strictly scoped to current user and tenant organization.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel
from sqlalchemy import select, func, desc, update
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.database import get_db
from backend.app.dependencies import get_current_active_user
from backend.app.models import Notification, User
from backend.app.core.websockets import ws_manager, authenticate_ws

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
    target_id: Optional[str] = None
    target_type: Optional[str] = None
    target_route: Optional[str] = None


class NotificationListResponse(BaseModel):
    items: List[NotificationItem]
    total: int
    unread_count: int
    page: int
    page_size: int


class UnreadCountResponse(BaseModel):
    unread_count: int
    sla_breach_count: int = 0


class InboxCountResponse(BaseModel):
    inbox_count: int


class MarkReadRequest(BaseModel):
    notification_id: str


class BulkMarkReadResponse(BaseModel):
    marked_count: int


def _format_notification_item(n: Notification) -> NotificationItem:
    actor = None
    if n.actor:
        actor = NotificationActor(
            id=n.actor.id,
            name=n.actor.full_name or n.actor.email,
            avatar_url=n.actor.avatar_url,
        )
    return NotificationItem(
        id=n.id,
        type=n.type,
        title=n.title,
        body=n.body,
        is_read=n.is_read,
        created_at=n.created_at.isoformat() if n.created_at else datetime.now(timezone.utc).isoformat(),
        actor=actor,
        target_id=n.target_id,
        target_type=n.target_type,
        target_route=n.target_route,
    )


# ---------------------------------------------------------------------------
# REST Endpoints
# ---------------------------------------------------------------------------

@router.get("", response_model=NotificationListResponse, summary="List notifications")
@router.get("/", response_model=NotificationListResponse, include_in_schema=False)
async def list_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
    inbox_only: bool = Query(False),
    type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Return paginated notifications strictly scoped to the authenticated user within their organization."""
    base_filter = [
        Notification.user_id == current_user.id,
        Notification.organization_id == current_user.organization_id,
    ]
    if unread_only:
        base_filter.append(Notification.is_read.is_(False))
    if inbox_only:
        base_filter.append(Notification.type.in_(["ticket_assigned", "mention", "comment"]))
    if type and type.lower() != "all":
        base_filter.append(Notification.type == type.lower())

    # Total count matching filters
    count_q = select(func.count(Notification.id)).where(*base_filter)
    count_res = await db.execute(count_q)
    total = count_res.scalar() or 0

    # Total unread count for badge matching current stream scope
    unread_filter = [
        Notification.user_id == current_user.id,
        Notification.organization_id == current_user.organization_id,
        Notification.is_read.is_(False),
    ]
    if inbox_only:
        unread_filter.append(Notification.type.in_(["ticket_assigned", "mention", "comment"]))
    if type and type.lower() != "all":
        unread_filter.append(Notification.type == type.lower())

    unread_q = select(func.count(Notification.id)).where(*unread_filter)
    unread_res = await db.execute(unread_q)
    unread_count = unread_res.scalar() or 0

    # Paginated query
    query = (
        select(Notification)
        .options(selectinload(Notification.actor))
        .where(*base_filter)
        .order_by(desc(Notification.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    res = await db.execute(query)
    notifications = res.scalars().all()

    items = [_format_notification_item(n) for n in notifications]

    return NotificationListResponse(
        items=items,
        total=total,
        unread_count=unread_count,
        page=page,
        page_size=page_size,
    )


@router.get("/unread-count", response_model=UnreadCountResponse, summary="Unread notification count")
async def get_unread_count(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns the total number of unread notifications for badge display."""
    unread_q = select(func.count(Notification.id)).where(
        Notification.user_id == current_user.id,
        Notification.organization_id == current_user.organization_id,
        Notification.is_read.is_(False),
    )
    res = await db.execute(unread_q)
    count = res.scalar() or 0

    breach_q = select(func.count(Notification.id)).where(
        Notification.user_id == current_user.id,
        Notification.organization_id == current_user.organization_id,
        Notification.is_read.is_(False),
        Notification.type == "sla_breach",
    )
    b_res = await db.execute(breach_q)
    breach_count = b_res.scalar() or 0

    return UnreadCountResponse(unread_count=count, sla_breach_count=breach_count)


@router.get("/inbox-count", response_model=InboxCountResponse, summary="Inbox badge count")
async def get_inbox_count(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns unread actionable notification count (assigned tickets, mentions, comments) for the user."""
    inbox_q = select(func.count(Notification.id)).where(
        Notification.user_id == current_user.id,
        Notification.organization_id == current_user.organization_id,
        Notification.is_read.is_(False),
        Notification.type.in_(["ticket_assigned", "mention", "comment"])
    )
    res = await db.execute(inbox_q)
    count = res.scalar() or 0
    return InboxCountResponse(inbox_count=count)


@router.patch("/{notification_id}/read", summary="Mark a notification as read")
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a single notification as read."""
    res = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
            Notification.organization_id == current_user.organization_id,
        )
    )
    notif = res.scalars().first()
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    notif.is_read = True
    await db.commit()

    await ws_manager.broadcast_to_user(
        current_user.id,
        {"event": "notification_read", "notification_id": notification_id, "user_id": current_user.id}
    )
    return {"success": True, "notification_id": notification_id}


@router.patch("/read-all", response_model=BulkMarkReadResponse, summary="Mark all notifications as read")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark every unread notification as read for the authenticated user."""
    stmt = (
        update(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.organization_id == current_user.organization_id,
            Notification.is_read.is_(False),
        )
        .values(is_read=True)
    )
    res = await db.execute(stmt)
    await db.commit()
    count = res.rowcount if hasattr(res, "rowcount") else 0

    if count:
        await ws_manager.broadcast_to_user(
            current_user.id,
            {"event": "all_notifications_read", "marked_count": count, "user_id": current_user.id}
        )
    return BulkMarkReadResponse(marked_count=count)


# ---------------------------------------------------------------------------
# WebSocket endpoint (Authenticated)
# ---------------------------------------------------------------------------

@router.websocket("/ws")
@router.websocket("/ws/{workspace_id}")
async def notifications_ws(
    websocket: WebSocket,
    workspace_id: Optional[str] = None,
    token: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticated WebSocket endpoint for real-time notification events.
    Strictly isolated per-user connection.
    """
    user = await authenticate_ws(websocket, token, db, required_workspace_id=workspace_id)
    if not user:
        return

    target_ws = workspace_id or user.organization_id
    await ws_manager.connect(websocket, target_ws, user_id=user.id)

    # Send current unread count on connect
    unread_q = select(func.count(Notification.id)).where(
        Notification.user_id == user.id,
        Notification.organization_id == user.organization_id,
        Notification.is_read.is_(False),
    )
    res = await db.execute(unread_q)
    unread = res.scalar() or 0
    await websocket.send_text(json.dumps({"event": "init", "unread_count": unread}))

    try:
        while True:
            raw_data = await websocket.receive_text()
            now = datetime.now(timezone.utc)
            ws_manager.touch_user_activity(user.id, now)

            # Throttle last_active_at update to at most once per minute
            should_update_dt = False
            if not user.last_active_at:
                should_update_dt = True
            else:
                last_dt = user.last_active_at if user.last_active_at.tzinfo else user.last_active_at.replace(tzinfo=timezone.utc)
                if (now - last_dt).total_seconds() >= 60:
                    should_update_dt = True

            if should_update_dt:
                user.last_active_at = now
                try:
                    await db.commit()
                except Exception:
                    await db.rollback()

            try:
                msg = json.loads(raw_data)
                ev = (msg.get("event") or msg.get("type") or "").lower()
                if ev in ("heartbeat", "ping"):
                    await websocket.send_text(json.dumps({"event": "pong", "timestamp": now.isoformat()}))
                elif ev in ("presence", "set_presence"):
                    new_pres = (msg.get("presence") or msg.get("status") or "").lower()
                    if new_pres in ("online", "away", "busy", "offline"):
                        ws_manager.set_user_status(user.id, new_pres)
                        await ws_manager.broadcast(
                            target_ws,
                            "presence_updated",
                            {
                                "user_id": user.id,
                                "presence": new_pres,
                                "last_active_at": user.last_active_at.isoformat() if user.last_active_at else None,
                            }
                        )
            except Exception:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, target_ws, user_id=user.id)
    except Exception:
        ws_manager.disconnect(websocket, target_ws, user_id=user.id)
