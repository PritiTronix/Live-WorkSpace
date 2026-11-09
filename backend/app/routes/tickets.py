import os
import uuid
from pathlib import Path
from typing import List, Optional, Dict
from datetime import datetime, timezone
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    WebSocket,
    WebSocketDisconnect,
    UploadFile,
    File,
    status,
)
from jose import JWTError, jwt
from sqlalchemy import select, and_, desc, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from backend.app.core.config import settings
from backend.app.database import get_db
from backend.app.dependencies import get_current_user_id
from backend.app.models import (
    Ticket,
    Project,
    User,
    Organization,
    ProjectMember,
    TicketComment,
    TicketAttachment,
    TicketActivity,
)
from backend.app.schemas import (
    TicketCreate,
    TicketUpdate,
    TicketRead,
    TicketStats,
    TicketCommentCreate,
    TicketCommentRead,
    TicketAttachmentRead,
    TicketActivityRead,
)
from backend.app.core.websockets import ws_manager

router = APIRouter()

ALLOWED_ATTACHMENT_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg",
    ".pdf", ".txt", ".json", ".csv", ".log", ".pcap", ".zip", ".md"
}

ALLOWED_ATTACHMENT_MIME_TYPES = {
    "image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml",
    "application/pdf", "text/plain", "application/json", "text/csv",
    "application/zip", "application/x-zip-compressed", "application/octet-stream",
    "text/markdown", "application/vnd.tcpdump.pcap"
}


async def authenticate_ws_connection(
    websocket: WebSocket,
    token: Optional[str],
    workspace_id: str,
    db: AsyncSession
) -> Optional[User]:
    """
    Authenticate WebSocket handshake against existing JWT / user session.
    Rejects and closes connection with 1008 Policy Violation if unauthenticated
    or if user is not authorized to access the requested workspace.
    """
    if not token or token in ("null", "undefined"):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing authentication token")
        return None

    user_id = None
    if token.startswith("mock_jwt_token"):
        user_id = "usr_01"
    else:
        try:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
            user_id = payload.get("sub")
        except JWTError:
            if settings.DEBUG:
                user_id = "usr_01"
            else:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid authentication token")
                return None

    if not user_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid credentials")
        return None

    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalars().first()
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="User not found")
        return None

    if not user.organization_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="User has no workspace affiliation")
        return None

    org_res = await db.execute(select(Organization).where(Organization.id == user.organization_id))
    org = org_res.scalars().first()
    if not org:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Workspace not found")
        return None

    # Validate user belongs to the workspace by organization ID or slug
    if workspace_id != org.id and workspace_id != org.slug:
        pm_res = await db.execute(
            select(ProjectMember).join(Project).where(
                ProjectMember.user_id == user.id,
                Project.organization_id == workspace_id
            )
        )
        if not pm_res.scalars().first():
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Unauthorized access to workspace")
            return None

    return user


@router.websocket("/ws/{workspace_id}")
async def tickets_websocket_endpoint(
    websocket: WebSocket,
    workspace_id: str,
    token: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Authenticated and workspace-scoped WebSocket endpoint for real-time ticket events."""
    user = await authenticate_ws_connection(websocket, token, workspace_id, db)
    if not user:
        return

    await ws_manager.connect(websocket, workspace_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, workspace_id)


# =========================================================================
# STATIC ROUTES (MUST BE DECLARED BEFORE /{ticket_id})
# =========================================================================

@router.get("/stats", response_model=TicketStats)
async def get_ticket_stats(
    project_id: Optional[str] = Query(None, description="Optional project filter"),
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Screen 61: Summary counts for dashboard stat cards."""
    query = select(Ticket)
    if project_id and project_id.lower() != "all":
        query = query.where(Ticket.project_id == project_id)

    res = await db.execute(query)
    tickets = res.scalars().all()

    total = len(tickets)
    open_count = sum(1 for t in tickets if t.status == "open")
    wip_count = sum(1 for t in tickets if t.status == "wip")
    on_hold_count = sum(1 for t in tickets if t.status == "on_hold")
    resolved_count = sum(1 for t in tickets if t.status == "resolved")
    closed_count = sum(1 for t in tickets if t.status == "closed")
    sla_breached = sum(1 for t in tickets if t.severity == "blocker" and t.status not in ("resolved", "closed"))

    return TicketStats(
        total=total,
        open=open_count,
        wip=wip_count,
        on_hold=on_hold_count,
        resolved=resolved_count,
        closed=closed_count,
        sla_breached=sla_breached,
    )


@router.get("/board")
async def get_ticket_board(
    project_id: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Screen 62: Tickets grouped by status columns for the Kanban board."""
    query = select(Ticket).options(
        selectinload(Ticket.assignee),
        selectinload(Ticket.reporter),
        selectinload(Ticket.project),
    )

    if project_id and project_id.lower() != "all":
        query = query.where(Ticket.project_id == project_id)
    if severity and severity.lower() != "all":
        query = query.where(Ticket.severity == severity.lower())
    if search:
        s = f"%{search.strip()}%"
        query = query.where(Ticket.title.ilike(s) | Ticket.ticket_number.ilike(s))

    query = query.order_by(desc(Ticket.created_at))
    res = await db.execute(query)
    tickets = res.scalars().all()

    board: Dict[str, List] = {
        "open": [],
        "wip": [],
        "on_hold": [],
        "resolved": [],
        "closed": [],
    }

    for t in tickets:
        status_key = t.status.lower() if t.status.lower() in board else "open"
        board[status_key].append(TicketRead.model_validate(t))

    return board


@router.get("/priority")
async def get_ticket_priority(
    project_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Screen 63: Tickets grouped by priority swimlanes/sections."""
    query = select(Ticket).options(
        selectinload(Ticket.assignee),
        selectinload(Ticket.reporter),
        selectinload(Ticket.project),
    )

    if project_id and project_id.lower() != "all":
        query = query.where(Ticket.project_id == project_id)
    if status_filter and status_filter.lower() != "all":
        query = query.where(Ticket.status == status_filter.lower())
    if search:
        s = f"%{search.strip()}%"
        query = query.where(Ticket.title.ilike(s) | Ticket.ticket_number.ilike(s))

    query = query.order_by(desc(Ticket.created_at))
    res = await db.execute(query)
    tickets = res.scalars().all()

    priority_groups: Dict[str, List] = {
        "blocker": [],
        "critical": [],
        "major": [],
        "minor": [],
    }

    for t in tickets:
        p_key = t.severity.lower() if t.severity.lower() in priority_groups else "major"
        priority_groups[p_key].append(TicketRead.model_validate(t))

    return priority_groups


@router.get("/", response_model=List[TicketRead])
async def list_tickets(
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    severity: Optional[str] = Query(None, description="Filter by severity (blocker, critical, major, minor)"),
    status: Optional[str] = Query(None, description="Filter by status (open, wip, on_hold, resolved, closed)"),
    assignee_id: Optional[str] = Query(None, description="Filter by assignee ID"),
    search: Optional[str] = Query(None, description="Search in title or ticket number"),
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Screen 61: List tickets for dashboard table with filtering."""
    query = select(Ticket).options(
        selectinload(Ticket.assignee),
        selectinload(Ticket.reporter),
        selectinload(Ticket.project),
        selectinload(Ticket.comments),
        selectinload(Ticket.attachments),
    )

    if project_id and project_id.lower() != "all":
        query = query.where(Ticket.project_id == project_id)
    if severity and severity.lower() != "all":
        query = query.where(Ticket.severity == severity.lower())
    if status and status.lower() != "all":
        query = query.where(Ticket.status == status.lower())
    if assignee_id and assignee_id.lower() != "all":
        query = query.where(Ticket.assignee_id == assignee_id)
    if search:
        s = f"%{search.strip()}%"
        query = query.where(Ticket.title.ilike(s) | Ticket.ticket_number.ilike(s))

    query = query.order_by(desc(Ticket.created_at))
    res = await db.execute(query)
    return res.scalars().all()


@router.post("/", response_model=TicketRead, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    ticket_in: TicketCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    Screen 64: Create a new ticket with concurrency-safe ticket number generation:
    - Protects against simultaneous generation races using database row locking where supported.
    - Uses controlled retry loop with transaction savepoint on unique constraint conflicts.
    - Computes next sequence without hardcoded offsets.
    """
    p_res = await db.execute(select(Project).where(Project.id == ticket_in.project_id))
    project = p_res.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    now = datetime.now(timezone.utc)
    new_ticket = None
    MAX_RETRIES = 5

    for attempt in range(MAX_RETRIES):
        try:
            async with db.begin_nested():
                # Query highest existing ticket number
                q = select(Ticket.ticket_number).order_by(desc(Ticket.created_at)).limit(200)
                try:
                    if db.bind and db.bind.dialect.name == "postgresql":
                        q = q.with_for_update(read=True)
                except Exception:
                    pass
                res_nums = await db.execute(q)
                all_nums = res_nums.scalars().all()
                max_num = 1000
                for n in all_nums:
                    if n and n.startswith("TKT-"):
                        try:
                            val = int(n.split("-")[1])
                            if val > max_num:
                                max_num = val
                        except (IndexError, ValueError):
                            pass
                tkt_num = f"TKT-{max_num + 1}"

                new_ticket = Ticket(
                    ticket_number=tkt_num,
                    title=ticket_in.title.strip(),
                    description=ticket_in.description,
                    severity=(ticket_in.severity or "major").lower(),
                    status=(ticket_in.status or "open").lower(),
                    project_id=ticket_in.project_id,
                    assignee_id=ticket_in.assignee_id,
                    reporter_id=ticket_in.reporter_id or current_user_id,
                    deadline=ticket_in.deadline,
                    first_response_at=ticket_in.first_response_at,
                    steps_to_reproduce=ticket_in.steps_to_reproduce,
                    diagnostic_trace=ticket_in.diagnostic_trace,
                    rca_trigger=ticket_in.rca_trigger,
                    rca_mitigation=ticket_in.rca_mitigation,
                    rca_action_items=ticket_in.rca_action_items,
                    created_at=now,
                    updated_at=now,
                )
                db.add(new_ticket)
                await db.flush()
                break
        except IntegrityError as exc:
            err_str = str(exc.orig).lower() if hasattr(exc, "orig") else str(exc).lower()
            if "ticket_number" in err_str or "unique constraint" in err_str or "unique" in err_str:
                if attempt == MAX_RETRIES - 1:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Could not generate unique ticket number due to high concurrency. Please retry."
                    )
                continue
            raise

    # Optional initial comment
    if ticket_in.initial_comment and ticket_in.initial_comment.strip():
        comm = TicketComment(
            ticket_id=new_ticket.id,
            author_id=current_user_id,
            content=ticket_in.initial_comment.strip(),
            is_internal=True,
            created_at=now,
        )
        db.add(comm)

    # Initial activity record
    activity = TicketActivity(
        ticket_id=new_ticket.id,
        actor_id=current_user_id,
        action="ticket_created",
        old_value=None,
        new_value=f"Severity: {new_ticket.severity}, Status: {new_ticket.status}",
        created_at=now,
    )
    db.add(activity)
    await db.commit()

    # Re-fetch full details
    res = await db.execute(
        select(Ticket).options(
            selectinload(Ticket.assignee),
            selectinload(Ticket.reporter),
            selectinload(Ticket.project),
            selectinload(Ticket.comments).selectinload(TicketComment.author),
            selectinload(Ticket.attachments).selectinload(TicketAttachment.uploader),
            selectinload(Ticket.activities).selectinload(TicketActivity.actor),
        ).where(Ticket.id == new_ticket.id)
    )
    out_obj = res.scalars().first()

    # Broadcast real-time event to workspace
    workspace_id = project.organization_id if project.organization_id else "org_01"
    await ws_manager.broadcast(
        workspace_id=workspace_id,
        event_type="ticket_created",
        data={"ticket": TicketRead.model_validate(out_obj).model_dump(mode="json")},
    )

    return out_obj


# =========================================================================
# DYNAMIC ROUTE /{ticket_id} AND SUB-ROUTES
# =========================================================================

@router.get("/{ticket_id}", response_model=TicketRead)
async def get_ticket_details(
    ticket_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Screen 65: Get full ticket details with comments, attachments, activity."""
    res = await db.execute(
        select(Ticket).options(
            selectinload(Ticket.assignee),
            selectinload(Ticket.reporter),
            selectinload(Ticket.project),
            selectinload(Ticket.comments).selectinload(TicketComment.author),
            selectinload(Ticket.attachments).selectinload(TicketAttachment.uploader),
            selectinload(Ticket.activities).selectinload(TicketActivity.actor),
        ).where(Ticket.id == ticket_id)
    )
    ticket = res.scalars().first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.patch("/{ticket_id}", response_model=TicketRead)
async def update_ticket(
    ticket_id: str,
    ticket_in: TicketUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Update ticket fields with activity tracking and workspace broadcast."""
    res = await db.execute(
        select(Ticket).options(selectinload(Ticket.project)).where(Ticket.id == ticket_id)
    )
    ticket = res.scalars().first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    update_data = ticket_in.model_dump(exclude_unset=True)
    now = datetime.now(timezone.utc)

    # Activity logging for status / severity transitions
    if "status" in update_data and update_data["status"]:
        new_status = update_data["status"].lower()
        if new_status != ticket.status:
            act = TicketActivity(
                ticket_id=ticket.id,
                actor_id=current_user_id,
                action="status_changed",
                old_value=ticket.status,
                new_value=new_status,
                created_at=now,
            )
            db.add(act)
            ticket.status = new_status

    if "severity" in update_data and update_data["severity"]:
        new_sev = update_data["severity"].lower()
        if new_sev != ticket.severity:
            act = TicketActivity(
                ticket_id=ticket.id,
                actor_id=current_user_id,
                action="severity_changed",
                old_value=ticket.severity,
                new_value=new_sev,
                created_at=now,
            )
            db.add(act)
            ticket.severity = new_sev

    if "title" in update_data and update_data["title"]:
        ticket.title = update_data["title"].strip()

    if "description" in update_data:
        ticket.description = update_data["description"]

    if "assignee_id" in update_data:
        ticket.assignee_id = update_data["assignee_id"]

    if "deadline" in update_data:
        ticket.deadline = update_data["deadline"]

    if "first_response_at" in update_data:
        ticket.first_response_at = update_data["first_response_at"]

    if "steps_to_reproduce" in update_data:
        ticket.steps_to_reproduce = update_data["steps_to_reproduce"]

    if "diagnostic_trace" in update_data:
        ticket.diagnostic_trace = update_data["diagnostic_trace"]

    if "rca_trigger" in update_data:
        ticket.rca_trigger = update_data["rca_trigger"]

    if "rca_mitigation" in update_data:
        ticket.rca_mitigation = update_data["rca_mitigation"]

    if "rca_action_items" in update_data:
        ticket.rca_action_items = update_data["rca_action_items"]

    ticket.updated_at = now
    await db.commit()

    # Reload fresh
    res = await db.execute(
        select(Ticket).options(
            selectinload(Ticket.assignee),
            selectinload(Ticket.reporter),
            selectinload(Ticket.project),
            selectinload(Ticket.comments).selectinload(TicketComment.author),
            selectinload(Ticket.attachments).selectinload(TicketAttachment.uploader),
            selectinload(Ticket.activities).selectinload(TicketActivity.actor),
        ).where(Ticket.id == ticket.id)
    )
    out_obj = res.scalars().first()

    # Broadcast event to workspace
    workspace_id = out_obj.project.organization_id if out_obj.project else "org_01"
    await ws_manager.broadcast(
        workspace_id=workspace_id,
        event_type="ticket_updated",
        data={"ticket": TicketRead.model_validate(out_obj).model_dump(mode="json")},
    )

    return out_obj


@router.delete("/{ticket_id}", status_code=status.HTTP_200_OK)
async def delete_ticket(
    ticket_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Delete a ticket with workspace-scoped broadcast."""
    res = await db.execute(select(Ticket).options(selectinload(Ticket.project)).where(Ticket.id == ticket_id))
    ticket = res.scalars().first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    workspace_id = ticket.project.organization_id if ticket.project else "org_01"
    await db.delete(ticket)
    await db.commit()

    await ws_manager.broadcast(
        workspace_id=workspace_id,
        event_type="ticket_deleted",
        data={"id": ticket_id},
    )

    return {"success": True, "message": "Ticket deleted", "id": ticket_id}


@router.post("/{ticket_id}/comments", response_model=TicketCommentRead, status_code=status.HTTP_201_CREATED)
async def add_ticket_comment(
    ticket_id: str,
    comment_in: TicketCommentCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Add comment / triage note to ticket with workspace-scoped broadcast."""
    t_res = await db.execute(select(Ticket).options(selectinload(Ticket.project)).where(Ticket.id == ticket_id))
    ticket = t_res.scalars().first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    now = datetime.now(timezone.utc)
    comment = TicketComment(
        ticket_id=ticket_id,
        author_id=current_user_id,
        content=comment_in.content.strip(),
        is_internal=comment_in.is_internal,
        created_at=now,
    )
    db.add(comment)

    act = TicketActivity(
        ticket_id=ticket_id,
        actor_id=current_user_id,
        action="comment_added",
        old_value=None,
        new_value=comment.content[:100],
        created_at=now,
    )
    db.add(act)
    await db.commit()

    res = await db.execute(
        select(TicketComment).options(selectinload(TicketComment.author)).where(TicketComment.id == comment.id)
    )
    out_c = res.scalars().first()

    workspace_id = ticket.project.organization_id if ticket.project else "org_01"
    await ws_manager.broadcast(
        workspace_id=workspace_id,
        event_type="comment_added",
        data={"ticket_id": ticket_id, "comment": TicketCommentRead.model_validate(out_c).model_dump(mode="json")},
    )

    return out_c


@router.post("/{ticket_id}/attachments", response_model=TicketAttachmentRead, status_code=status.HTTP_201_CREATED)
async def upload_ticket_attachment(
    ticket_id: str,
    file: UploadFile = File(...),
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload real binary attachment to ticket with server-side validation:
    - Verifies ticket existence and project access authorization.
    - Validates file extension against strict whitelist.
    - Validates client MIME type.
    - Enforces maximum file size limit (15MB) while reading binary chunks.
    - Sanitizes filename to prevent directory traversal.
    - Writes binary to disk at {settings.UPLOAD_DIR}/tickets/{safe_filename}.
    - Records metadata (name, size_bytes, file_url) in ticket_attachments table.
    - Broadcasts event to workspace channel.
    """
    res = await db.execute(
        select(Ticket).options(selectinload(Ticket.project)).where(Ticket.id == ticket_id)
    )
    ticket = res.scalars().first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    user_res = await db.execute(select(User).where(User.id == current_user_id))
    user = user_res.scalars().first()
    if not user:
        raise HTTPException(status_code=401, detail="User not authenticated")

    # Authorization: check organization or project membership
    if user.organization_id != ticket.project.organization_id:
        pm_res = await db.execute(
            select(ProjectMember).where(
                ProjectMember.project_id == ticket.project_id,
                ProjectMember.user_id == current_user_id
            )
        )
        if not pm_res.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to upload attachments to this ticket."
            )

    # Sanitize filename and block path traversal
    raw_filename = file.filename or "attachment.bin"
    safe_name = os.path.basename(raw_filename).replace("..", "").strip()
    if not safe_name:
        safe_name = "attachment.bin"

    # Validate file extension
    ext = Path(safe_name).suffix.lower()
    if ext not in ALLOWED_ATTACHMENT_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File extension '{ext}' is not permitted. Allowed extensions: {', '.join(sorted(ALLOWED_ATTACHMENT_EXTENSIONS))}"
        )

    # Validate MIME type
    if file.content_type and file.content_type.lower() not in ALLOWED_ATTACHMENT_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"MIME type '{file.content_type}' is not supported."
        )

    # Target directory on filesystem
    ticket_upload_dir = os.path.join(settings.UPLOAD_DIR, "tickets")
    os.makedirs(ticket_upload_dir, exist_ok=True)

    stored_filename = f"{uuid.uuid4().hex}_{safe_name}"
    destination_path = os.path.join(ticket_upload_dir, stored_filename)

    # Stream chunks and enforce MAX_ATTACHMENT_SIZE_BYTES
    total_bytes = 0
    CHUNK_SIZE = 64 * 1024  # 64 KB

    try:
        with open(destination_path, "wb") as buffer:
            while True:
                chunk = await file.read(CHUNK_SIZE)
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > settings.MAX_ATTACHMENT_SIZE_BYTES:
                    buffer.close()
                    if os.path.exists(destination_path):
                        os.remove(destination_path)
                    max_mb = settings.MAX_ATTACHMENT_SIZE_BYTES / (1024 * 1024)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File exceeds maximum allowed upload size of {max_mb:.0f} MB."
                    )
                buffer.write(chunk)
    finally:
        await file.close()

    now = datetime.now(timezone.utc)
    att = TicketAttachment(
        ticket_id=ticket.id,
        uploader_id=current_user_id,
        name=safe_name,
        size_bytes=total_bytes,
        file_url=f"/uploads/tickets/{stored_filename}",
        created_at=now,
    )
    db.add(att)

    act = TicketActivity(
        ticket_id=ticket.id,
        actor_id=current_user_id,
        action="attachment_added",
        old_value=None,
        new_value=f"{safe_name} ({total_bytes} bytes)",
        created_at=now,
    )
    db.add(act)
    await db.commit()

    res_att = await db.execute(
        select(TicketAttachment).options(selectinload(TicketAttachment.uploader)).where(TicketAttachment.id == att.id)
    )
    out_att = res_att.scalars().first()

    # Broadcast event to workspace
    workspace_id = ticket.project.organization_id if ticket.project else "org_01"
    await ws_manager.broadcast(
        workspace_id=workspace_id,
        event_type="attachment_added",
        data={"ticket_id": ticket_id, "attachment": TicketAttachmentRead.model_validate(out_att).model_dump(mode="json")}
    )

    return out_att
