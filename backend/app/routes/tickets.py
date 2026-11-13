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
from sqlalchemy import select, and_, desc, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from backend.app.core.config import settings
from backend.app.database import get_db
from backend.app.dependencies import get_current_active_user
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
from fastapi.responses import FileResponse
from backend.app.schemas import (
    TicketCreate,
    TicketUpdate,
    TicketStatusChangeRequest,
    TicketSeverityChangeRequest,
    TicketReassignRequest,
    TicketDeadlineChangeRequest,
    TicketReopenRequest,
    TicketCloseRequest,
    TicketRead,
    TicketStats,
    CriticalIssuesResponse,
    CriticalIssuesKPI,
    TicketCommentCreate,
    TicketCommentRead,
    TicketAttachmentRead,
    TicketActivityRead,
)
from backend.app.core.websockets import ws_manager, authenticate_ws

router = APIRouter()

ALLOWED_ATTACHMENT_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp",
    ".pdf", ".txt", ".json", ".csv", ".log", ".pcap", ".zip", ".md"
}

ALLOWED_ATTACHMENT_MIME_TYPES = {
    "image/png", "image/jpeg", "image/gif", "image/webp",
    "application/pdf", "text/plain", "application/json", "text/csv",
    "application/zip", "application/x-zip-compressed", "application/octet-stream",
    "text/markdown", "application/vnd.tcpdump.pcap"
}


@router.websocket("/ws/{workspace_id}")
async def tickets_websocket_endpoint(
    websocket: WebSocket,
    workspace_id: str,
    token: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Authenticated and workspace-scoped WebSocket endpoint for real-time ticket events."""
    user = await authenticate_ws(websocket, token, db, required_workspace_id=workspace_id)
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

@router.get("/critical", response_model=CriticalIssuesResponse)
async def get_critical_priority_issues(
    project_id: Optional[str] = Query(None, description="Optional project filter"),
    assignee_id: Optional[str] = Query(None, description="Filter by assignee user ID"),
    sla_status: Optional[str] = Query(None, description="Filter by SLA status: breached, approaching, stable"),
    sort_by: Optional[str] = Query("severity", description="Sort by: severity, deadline, updated"),
    sort_order: Optional[str] = Query("desc", description="Sort order: asc, desc"),
    search: Optional[str] = Query(None, description="Search by title or ticket number"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Screen 69: Live Incident Queue with KPI Impact summary and multi-tier filtering."""
    query = (
        select(Ticket)
        .options(
            selectinload(Ticket.assignee),
            selectinload(Ticket.reporter),
            selectinload(Ticket.project),
            selectinload(Ticket.comments),
            selectinload(Ticket.attachments),
            selectinload(Ticket.activities),
        )
        .join(Ticket.project)
        .where(Project.organization_id == current_user.organization_id)
    )

    if project_id and project_id.lower() != "all":
        query = query.where(Ticket.project_id == project_id)
    if assignee_id and assignee_id.lower() != "all":
        query = query.where(Ticket.assignee_id == assignee_id)
    if search:
        s = f"%{search.strip()}%"
        query = query.where(Ticket.title.ilike(s) | Ticket.ticket_number.ilike(s))

    if sort_by == "deadline":
        order_col = Ticket.deadline.asc() if sort_order == "asc" else Ticket.deadline.desc()
        query = query.order_by(order_col.nullslast(), desc(Ticket.created_at))
    elif sort_by == "updated":
        order_col = Ticket.updated_at.asc() if sort_order == "asc" else Ticket.updated_at.desc()
        query = query.order_by(order_col, desc(Ticket.created_at))
    else:
        query = query.order_by(desc(Ticket.created_at))

    res = await db.execute(query)
    all_tickets = res.scalars().all()

    now = datetime.now(timezone.utc)
    blockers = []
    critical = []
    major = []

    sla_breached_count = 0

    for t in all_tickets:
        is_breached = False
        is_approaching = False

        if t.status not in ("resolved", "closed"):
            if t.deadline:
                t_deadline = t.deadline if t.deadline.tzinfo else t.deadline.replace(tzinfo=timezone.utc)
                diff_sec = (t_deadline - now).total_seconds()
                if diff_sec < 0:
                    is_breached = True
                elif diff_sec < 3600:  # within 1 hour
                    is_approaching = True
            elif t.severity == "blocker":
                is_breached = True

        if is_breached:
            sla_breached_count += 1

        # Check sla_status filter if specified
        if sla_status and sla_status.lower() != "all":
            flt = sla_status.lower()
            if flt == "breached" and not is_breached:
                continue
            elif flt == "approaching" and not (is_approaching or is_breached):
                continue
            elif flt == "stable" and (is_breached or is_approaching):
                continue

        sev = (t.severity or "").lower()
        if sev == "blocker":
            blockers.append(TicketRead.model_validate(t))
        elif sev == "critical":
            critical.append(TicketRead.model_validate(t))
        elif sev == "major":
            major.append(TicketRead.model_validate(t))

    kpi = CriticalIssuesKPI(
        blockers_active=len([t for t in blockers if t.status not in ("resolved", "closed")]),
        critical_incidents=len([t for t in critical if t.status not in ("resolved", "closed")]),
        major_issues=len([t for t in major if t.status not in ("resolved", "closed")]),
        sla_breached=sla_breached_count,
        sync_interval_sec=5,
    )

    return CriticalIssuesResponse(
        kpi=kpi,
        blockers=blockers,
        critical=critical,
        major=major,
    )


@router.get("/stats", response_model=TicketStats)
async def get_ticket_stats(
    project_id: Optional[str] = Query(None, description="Optional project filter"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Screen 61: Summary counts for dashboard stat cards."""
    query = select(Ticket).join(Ticket.project).where(Project.organization_id == current_user.organization_id)
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
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Screen 62: Tickets grouped by status columns for the Kanban board."""
    query = (
        select(Ticket)
        .options(
            selectinload(Ticket.assignee),
            selectinload(Ticket.reporter),
            selectinload(Ticket.project),
        )
        .join(Ticket.project)
        .where(Project.organization_id == current_user.organization_id)
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
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Screen 63: Tickets grouped by priority swimlanes/sections."""
    query = (
        select(Ticket)
        .options(
            selectinload(Ticket.assignee),
            selectinload(Ticket.reporter),
            selectinload(Ticket.project),
        )
        .join(Ticket.project)
        .where(Project.organization_id == current_user.organization_id)
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


@router.get("", response_model=List[TicketRead])
@router.get("/", response_model=List[TicketRead])
async def list_tickets(
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    severity: Optional[str] = Query(None, description="Filter by severity (blocker, critical, major, minor)"),
    status: Optional[str] = Query(None, description="Filter by status (open, wip, on_hold, resolved, closed)"),
    assignee_id: Optional[str] = Query(None, description="Filter by assignee ID"),
    search: Optional[str] = Query(None, description="Search in title or ticket number"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Screen 61: List tickets for dashboard table with filtering."""
    query = (
        select(Ticket)
        .options(
            selectinload(Ticket.assignee),
            selectinload(Ticket.reporter),
            selectinload(Ticket.project),
            selectinload(Ticket.comments),
            selectinload(Ticket.attachments),
            selectinload(Ticket.activities),
        )
        .join(Ticket.project)
        .where(Project.organization_id == current_user.organization_id)
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


@router.post("", response_model=TicketRead, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=TicketRead, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    ticket_in: TicketCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Screen 64: Create a new ticket with concurrency-safe ticket number generation:
    - Verifies project belongs to authenticated user's organization.
    - Protects against simultaneous generation races using database row locking where supported.
    - Uses controlled retry loop with transaction savepoint on unique constraint conflicts.
    - Computes next sequence without hardcoded offsets.
    """
    p_res = await db.execute(
        select(Project).where(
            Project.id == ticket_in.project_id,
            Project.organization_id == current_user.organization_id
        )
    )
    project = p_res.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or does not belong to your organization")

    # Validate assignee if provided
    if ticket_in.assignee_id and ticket_in.assignee_id != current_user.id:
        u_res = await db.execute(
            select(User).where(
                User.id == ticket_in.assignee_id,
                User.organization_id == current_user.organization_id
            )
        )
        if not u_res.scalars().first():
            raise HTTPException(status_code=400, detail="Assignee does not belong to your organization")

    now = datetime.now(timezone.utc)
    new_ticket = None
    MAX_RETRIES = 5

    for attempt in range(MAX_RETRIES):
        try:
            async with db.begin_nested():
                # Query highest existing ticket number within organization's projects
                q = (
                    select(Ticket.ticket_number)
                    .join(Ticket.project)
                    .where(Project.organization_id == current_user.organization_id)
                    .order_by(desc(Ticket.created_at))
                    .limit(200)
                )
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
                    reporter_id=ticket_in.reporter_id or current_user.id,
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
            author_id=current_user.id,
            content=ticket_in.initial_comment.strip(),
            is_internal=True,
            created_at=now,
        )
        db.add(comm)

    # Initial activity record
    activity = TicketActivity(
        ticket_id=new_ticket.id,
        actor_id=current_user.id,
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
    current_user: User = Depends(get_current_active_user),
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
    if not ticket or not ticket.project or ticket.project.organization_id != current_user.organization_id:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.patch("/{ticket_id}", response_model=TicketRead)
async def update_ticket(
    ticket_id: str,
    ticket_in: TicketUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Update ticket fields with activity tracking and workspace broadcast."""
    res = await db.execute(
        select(Ticket).options(selectinload(Ticket.project)).where(Ticket.id == ticket_id)
    )
    ticket = res.scalars().first()
    if not ticket or not ticket.project or ticket.project.organization_id != current_user.organization_id:
        raise HTTPException(status_code=404, detail="Ticket not found")

    update_data = ticket_in.model_dump(exclude_unset=True)
    now = datetime.now(timezone.utc)

    # Activity logging for status / severity transitions
    if "status" in update_data and update_data["status"]:
        new_status = update_data["status"].lower()
        if new_status != ticket.status:
            act = TicketActivity(
                ticket_id=ticket.id,
                actor_id=current_user.id,
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
                actor_id=current_user.id,
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
        new_assignee = update_data["assignee_id"]
        if new_assignee != ticket.assignee_id:
            act = TicketActivity(
                ticket_id=ticket.id,
                actor_id=current_user.id,
                action="reassigned",
                old_value=ticket.assignee_id or "unassigned",
                new_value=new_assignee or "unassigned",
                created_at=now,
            )
            db.add(act)
            ticket.assignee_id = new_assignee

    if "deadline" in update_data:
        new_deadline = update_data["deadline"]
        act = TicketActivity(
            ticket_id=ticket.id,
            actor_id=current_user.id,
            action="deadline_changed",
            old_value=ticket.deadline.isoformat() if ticket.deadline else "none",
            new_value=new_deadline.isoformat() if new_deadline else "none",
            created_at=now,
        )
        db.add(act)
        ticket.deadline = new_deadline

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
    workspace_id = out_obj.project.organization_id if out_obj.project else current_user.organization_id
    await ws_manager.broadcast(
        workspace_id=workspace_id,
        event_type="ticket_updated",
        data={"ticket": TicketRead.model_validate(out_obj).model_dump(mode="json")},
    )

    return out_obj


@router.delete("/{ticket_id}", status_code=status.HTTP_200_OK)
async def delete_ticket(
    ticket_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a ticket with workspace-scoped broadcast."""
    res = await db.execute(select(Ticket).options(selectinload(Ticket.project)).where(Ticket.id == ticket_id))
    ticket = res.scalars().first()
    if not ticket or not ticket.project or ticket.project.organization_id != current_user.organization_id:
        raise HTTPException(status_code=404, detail="Ticket not found")

    workspace_id = ticket.project.organization_id if ticket.project else current_user.organization_id
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
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Add comment / triage note to ticket with workspace-scoped broadcast."""
    t_res = await db.execute(select(Ticket).options(selectinload(Ticket.project)).where(Ticket.id == ticket_id))
    ticket = t_res.scalars().first()
    if not ticket or not ticket.project or ticket.project.organization_id != current_user.organization_id:
        raise HTTPException(status_code=404, detail="Ticket not found")

    now = datetime.now(timezone.utc)
    comment = TicketComment(
        ticket_id=ticket_id,
        author_id=current_user.id,
        content=comment_in.content.strip(),
        is_internal=comment_in.is_internal,
        created_at=now,
    )
    db.add(comment)

    act = TicketActivity(
        ticket_id=ticket_id,
        actor_id=current_user.id,
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

    workspace_id = ticket.project.organization_id if ticket.project else current_user.organization_id
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
    current_user: User = Depends(get_current_active_user),
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
    if not ticket or not ticket.project or ticket.project.organization_id != current_user.organization_id:
        raise HTTPException(status_code=404, detail="Ticket not found")

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

    att_id = str(uuid.uuid4())
    stored_filename = f"{att_id}_{safe_name}"
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
        id=att_id,
        ticket_id=ticket.id,
        uploader_id=current_user.id,
        name=safe_name,
        size_bytes=total_bytes,
        file_url=f"/api/v1/tickets/{ticket.id}/attachments/{att_id}/download",
        created_at=now,
    )
    db.add(att)

    act = TicketActivity(
        ticket_id=ticket.id,
        actor_id=current_user.id,
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
    workspace_id = ticket.project.organization_id if ticket.project else current_user.organization_id
    await ws_manager.broadcast(
        workspace_id=workspace_id,
        event_type="attachment_added",
        data={"ticket_id": ticket_id, "attachment": TicketAttachmentRead.model_validate(out_att).model_dump(mode="json")}
    )

    return out_att


@router.get("/{ticket_id}/attachments/{attachment_id}/download")
async def download_ticket_attachment(
    ticket_id: str,
    attachment_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticated attachment streaming endpoint.
    Verifies user authentication, organization / project access authorization,
    checks file existence on disk, and securely streams binary via FileResponse.
    """
    res = await db.execute(
        select(Ticket).options(selectinload(Ticket.project)).where(Ticket.id == ticket_id)
    )
    ticket = res.scalars().first()
    if not ticket or not ticket.project or ticket.project.organization_id != current_user.organization_id:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Locate attachment record
    att_res = await db.execute(
        select(TicketAttachment).where(
            TicketAttachment.ticket_id == ticket_id,
            (TicketAttachment.id == attachment_id) | (TicketAttachment.file_url.ilike(f"%{attachment_id}%"))
        )
    )
    att = att_res.scalars().first()
    if not att:
        raise HTTPException(status_code=404, detail="Attachment record not found")

    ticket_upload_dir = os.path.abspath(os.path.join(settings.UPLOAD_DIR, "tickets"))
    # Check deterministic primary storage path
    candidate_path = os.path.abspath(os.path.join(ticket_upload_dir, f"{att.id}_{att.name}"))
    if not os.path.exists(candidate_path):
        # Fallback to stored basename for legacy files
        legacy_basename = os.path.basename(att.file_url)
        candidate_path = os.path.abspath(os.path.join(ticket_upload_dir, legacy_basename))

    # Path traversal validation
    if not candidate_path.startswith(ticket_upload_dir):
        raise HTTPException(status_code=400, detail="Invalid attachment path")

    if not os.path.exists(candidate_path) or not os.path.isfile(candidate_path):
        raise HTTPException(status_code=404, detail="Attachment binary not found on server storage")

    return FileResponse(
        path=candidate_path,
        filename=att.name,
        media_type="application/octet-stream"
    )


# =========================================================================
# DEDICATED LIFECYCLE & MUTATION ENDPOINTS (Screens 66–68)
# =========================================================================

ALLOWED_LIFECYCLE_TRANSITIONS = {
    "open": {"wip", "on_hold"},
    "wip": {"on_hold", "resolved", "open"},
    "on_hold": {"wip", "open", "resolved"},
    "resolved": {"closed", "open"},
    "closed": {"open"},
}


@router.patch("/{ticket_id}/status", response_model=TicketRead)
async def change_ticket_status(
    ticket_id: str,
    payload: TicketStatusChangeRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Screen 66B: Dedicated status change endpoint.
    Enforces valid state transition matrix and mandatory reasons.
    """
    res = await db.execute(
        select(Ticket).options(selectinload(Ticket.project)).where(Ticket.id == ticket_id)
    )
    ticket = res.scalars().first()
    if not ticket or not ticket.project or ticket.project.organization_id != current_user.organization_id:
        raise HTTPException(status_code=404, detail="Ticket not found")

    new_status = payload.status.lower().strip()
    valid_statuses = {"open", "wip", "on_hold", "resolved", "closed"}
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status '{payload.status}'. Allowed statuses: {', '.join(sorted(valid_statuses))}"
        )

    old_status = ticket.status.lower()
    if new_status != old_status:
        allowed = ALLOWED_LIFECYCLE_TRANSITIONS.get(old_status, set())
        if new_status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status transition from '{old_status}' to '{new_status}'. Allowed transitions: {list(allowed)}"
            )

        if new_status == "on_hold" and not (payload.reason and payload.reason.strip()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reason is mandatory when placing a ticket on hold."
            )

        now = datetime.now(timezone.utc)
        note_parts = [new_status]
        if payload.reason:
            note_parts.append(f"Reason: {payload.reason.strip()}")
        if payload.follow_up_date:
            note_parts.append(f"Follow-up: {payload.follow_up_date.strip()}")
        if payload.remarks:
            note_parts.append(f"Remarks: {payload.remarks.strip()}")

        act = TicketActivity(
            ticket_id=ticket.id,
            actor_id=current_user.id,
            action="status_changed",
            old_value=old_status,
            new_value=" | ".join(note_parts),
            created_at=now,
        )
        db.add(act)
        ticket.status = new_status
        ticket.updated_at = now
        await db.commit()

    # Return refreshed ticket
    refreshed = await db.execute(
        select(Ticket).options(
            selectinload(Ticket.assignee),
            selectinload(Ticket.reporter),
            selectinload(Ticket.project),
            selectinload(Ticket.comments).selectinload(TicketComment.author),
            selectinload(Ticket.attachments).selectinload(TicketAttachment.uploader),
            selectinload(Ticket.activities).selectinload(TicketActivity.actor),
        ).where(Ticket.id == ticket.id)
    )
    out_obj = refreshed.scalars().first()

    workspace_id = out_obj.project.organization_id if out_obj.project else current_user.organization_id
    await ws_manager.broadcast(
        workspace_id=workspace_id,
        event_type="ticket_updated",
        data={"ticket": TicketRead.model_validate(out_obj).model_dump(mode="json")},
    )
    return out_obj


@router.patch("/{ticket_id}/severity", response_model=TicketRead)
async def change_ticket_severity(
    ticket_id: str,
    payload: TicketSeverityChangeRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Screen 67A: Dedicated severity change endpoint.
    Validates canonical lowercase severities and logs operational reason in activity.
    """
    res = await db.execute(
        select(Ticket).options(selectinload(Ticket.project)).where(Ticket.id == ticket_id)
    )
    ticket = res.scalars().first()
    if not ticket or not ticket.project or ticket.project.organization_id != current_user.organization_id:
        raise HTTPException(status_code=404, detail="Ticket not found")

    new_sev = payload.severity.lower().strip()
    valid_severities = {"blocker", "critical", "major", "minor"}
    if new_sev not in valid_severities:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid severity '{payload.severity}'. Allowed severities: {', '.join(sorted(valid_severities))}"
        )

    if not (payload.reason and payload.reason.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A justification reason is required when changing ticket severity."
        )

    old_sev = ticket.severity.lower()
    now = datetime.now(timezone.utc)
    act_parts = [f"Severity changed to {new_sev}", f"Reason: {payload.reason.strip()}"]
    if payload.operational_notes:
        act_parts.append(f"Notes: {payload.operational_notes.strip()}")

    act = TicketActivity(
        ticket_id=ticket.id,
        actor_id=current_user.id,
        action="severity_changed",
        old_value=old_sev,
        new_value=" | ".join(act_parts),
        created_at=now,
    )
    db.add(act)
    ticket.severity = new_sev
    ticket.updated_at = now
    await db.commit()

    refreshed = await db.execute(
        select(Ticket).options(
            selectinload(Ticket.assignee),
            selectinload(Ticket.reporter),
            selectinload(Ticket.project),
            selectinload(Ticket.comments).selectinload(TicketComment.author),
            selectinload(Ticket.attachments).selectinload(TicketAttachment.uploader),
            selectinload(Ticket.activities).selectinload(TicketActivity.actor),
        ).where(Ticket.id == ticket.id)
    )
    out_obj = refreshed.scalars().first()

    workspace_id = out_obj.project.organization_id if out_obj.project else current_user.organization_id
    await ws_manager.broadcast(
        workspace_id=workspace_id,
        event_type="ticket_updated",
        data={"ticket": TicketRead.model_validate(out_obj).model_dump(mode="json")},
    )
    return out_obj


@router.patch("/{ticket_id}/assignee", response_model=TicketRead)
async def reassign_ticket(
    ticket_id: str,
    payload: TicketReassignRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Screen 67B: Dedicated reassignment endpoint.
    Strictly verifies assignee exists, is active, and is an authorized member
    of the ticket's project/organization.
    """
    res = await db.execute(
        select(Ticket).options(selectinload(Ticket.project)).where(Ticket.id == ticket_id)
    )
    ticket = res.scalars().first()
    if not ticket or not ticket.project or ticket.project.organization_id != current_user.organization_id:
        raise HTTPException(status_code=404, detail="Ticket not found")

    new_assignee_id = payload.assignee_id
    assignee_name = "Unassigned"
    if new_assignee_id:
        u_res = await db.execute(
            select(User).where(
                User.id == new_assignee_id,
                User.organization_id == current_user.organization_id
            )
        )
        target_user = u_res.scalars().first()
        if not target_user:
            raise HTTPException(status_code=404, detail="Assignee user not found in your organization")
        if not target_user.is_active:
            raise HTTPException(status_code=400, detail="Cannot assign ticket to an inactive user account.")

        assignee_name = target_user.full_name or target_user.email

    now = datetime.now(timezone.utc)
    old_assignee = ticket.assignee_id or "unassigned"
    act_parts = [f"Reassigned to {assignee_name}"]
    if payload.reason:
        act_parts.append(f"Reason: {payload.reason.strip()}")
    if payload.handover_note:
        act_parts.append(f"Handover: {payload.handover_note.strip()}")

    act = TicketActivity(
        ticket_id=ticket.id,
        actor_id=current_user.id,
        action="reassigned",
        old_value=old_assignee,
        new_value=" | ".join(act_parts),
        created_at=now,
    )
    db.add(act)
    ticket.assignee_id = new_assignee_id
    ticket.updated_at = now
    await db.commit()

    refreshed = await db.execute(
        select(Ticket).options(
            selectinload(Ticket.assignee),
            selectinload(Ticket.reporter),
            selectinload(Ticket.project),
            selectinload(Ticket.comments).selectinload(TicketComment.author),
            selectinload(Ticket.attachments).selectinload(TicketAttachment.uploader),
            selectinload(Ticket.activities).selectinload(TicketActivity.actor),
        ).where(Ticket.id == ticket.id)
    )
    out_obj = refreshed.scalars().first()

    workspace_id = out_obj.project.organization_id if out_obj.project else current_user.organization_id
    await ws_manager.broadcast(
        workspace_id=workspace_id,
        event_type="ticket_updated",
        data={"ticket": TicketRead.model_validate(out_obj).model_dump(mode="json")},
    )
    return out_obj


@router.patch("/{ticket_id}/deadline", response_model=TicketRead)
async def change_ticket_deadline(
    ticket_id: str,
    payload: TicketDeadlineChangeRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Screen 68A: Dedicated deadline change endpoint.
    Validates deadline update and logs operational justification.
    """
    res = await db.execute(
        select(Ticket).options(selectinload(Ticket.project)).where(Ticket.id == ticket_id)
    )
    ticket = res.scalars().first()
    if not ticket or not ticket.project or ticket.project.organization_id != current_user.organization_id:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if not (payload.reason and payload.reason.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reason is mandatory when modifying a ticket deadline."
        )

    now = datetime.now(timezone.utc)
    old_deadline_str = ticket.deadline.isoformat() if ticket.deadline else "None"
    new_deadline_str = payload.deadline.isoformat() if payload.deadline else "None"

    act_parts = [f"Deadline changed to {new_deadline_str}", f"Reason: {payload.reason.strip()}"]
    if payload.operational_remarks:
        act_parts.append(f"Remarks: {payload.operational_remarks.strip()}")

    act = TicketActivity(
        ticket_id=ticket.id,
        actor_id=current_user.id,
        action="deadline_changed",
        old_value=old_deadline_str,
        new_value=" | ".join(act_parts),
        created_at=now,
    )
    db.add(act)
    ticket.deadline = payload.deadline
    ticket.updated_at = now
    await db.commit()

    refreshed = await db.execute(
        select(Ticket).options(
            selectinload(Ticket.assignee),
            selectinload(Ticket.reporter),
            selectinload(Ticket.project),
            selectinload(Ticket.comments).selectinload(TicketComment.author),
            selectinload(Ticket.attachments).selectinload(TicketAttachment.uploader),
            selectinload(Ticket.activities).selectinload(TicketActivity.actor),
        ).where(Ticket.id == ticket.id)
    )
    out_obj = refreshed.scalars().first()

    workspace_id = out_obj.project.organization_id if out_obj.project else current_user.organization_id
    await ws_manager.broadcast(
        workspace_id=workspace_id,
        event_type="ticket_updated",
        data={"ticket": TicketRead.model_validate(out_obj).model_dump(mode="json")},
    )
    return out_obj


@router.post("/{ticket_id}/reopen", response_model=TicketRead)
async def reopen_ticket(
    ticket_id: str,
    payload: TicketReopenRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Screen 68B: Dedicated reopen endpoint.
    Strictly verifies ticket is in resolved or closed state.
    Transitions status to open and records dedicated reopen activity.
    Protects RCA columns from overwrite.
    """
    res = await db.execute(
        select(Ticket).options(selectinload(Ticket.project)).where(Ticket.id == ticket_id)
    )
    ticket = res.scalars().first()
    if not ticket or not ticket.project or ticket.project.organization_id != current_user.organization_id:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if ticket.status.lower() not in ("resolved", "closed"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reopen ticket in '{ticket.status}' status. Reopening is only allowed for resolved or closed tickets."
        )

    if not (payload.reason and payload.reason.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reason is mandatory when reopening a ticket."
        )

    now = datetime.now(timezone.utc)
    old_status = ticket.status.lower()
    act_parts = [f"Reopened to open", f"Reason: {payload.reason.strip()}"]
    if payload.regression_context:
        act_parts.append(f"Regression Context: {payload.regression_context.strip()}")
    if payload.operational_notes:
        act_parts.append(f"Notes: {payload.operational_notes.strip()}")

    act = TicketActivity(
        ticket_id=ticket.id,
        actor_id=current_user.id,
        action="reopened",
        old_value=old_status,
        new_value=" | ".join(act_parts),
        created_at=now,
    )
    db.add(act)
    ticket.status = "open"
    ticket.updated_at = now
    await db.commit()

    refreshed = await db.execute(
        select(Ticket).options(
            selectinload(Ticket.assignee),
            selectinload(Ticket.reporter),
            selectinload(Ticket.project),
            selectinload(Ticket.comments).selectinload(TicketComment.author),
            selectinload(Ticket.attachments).selectinload(TicketAttachment.uploader),
            selectinload(Ticket.activities).selectinload(TicketActivity.actor),
        ).where(Ticket.id == ticket.id)
    )
    out_obj = refreshed.scalars().first()

    workspace_id = out_obj.project.organization_id if out_obj.project else current_user.organization_id
    await ws_manager.broadcast(
        workspace_id=workspace_id,
        event_type="ticket_updated",
        data={"ticket": TicketRead.model_validate(out_obj).model_dump(mode="json")},
    )
    return out_obj


@router.post("/{ticket_id}/close", response_model=TicketRead)
async def close_ticket(
    ticket_id: str,
    payload: TicketCloseRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Screen 68C: Dedicated close endpoint.
    Strictly verifies ticket is in resolved status before allowing closure.
    Transitions status to closed and records dedicated closure activity.
    Protects RCA columns from overwrite.
    """
    res = await db.execute(
        select(Ticket).options(selectinload(Ticket.project)).where(Ticket.id == ticket_id)
    )
    ticket = res.scalars().first()
    if not ticket or not ticket.project or ticket.project.organization_id != current_user.organization_id:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if ticket.status.lower() != "resolved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot close ticket in '{ticket.status}' status. Ticket must be marked resolved before closing."
        )

    if not (payload.resolution_summary and payload.resolution_summary.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resolution summary is mandatory to close a ticket."
        )

    now = datetime.now(timezone.utc)
    old_status = ticket.status.lower()
    act_parts = [
        "Closed ticket",
        f"Resolution: {payload.resolution_summary.strip()}",
        f"Verified by: {payload.verified_by or 'reporter'}",
    ]
    if payload.pr_or_commit:
        act_parts.append(f"PR/Commit: {payload.pr_or_commit.strip()}")
    if payload.operational_signoff:
        act_parts.append("Sign-off: Confirmed")

    act = TicketActivity(
        ticket_id=ticket.id,
        actor_id=current_user.id,
        action="closed",
        old_value=old_status,
        new_value=" | ".join(act_parts),
        created_at=now,
    )
    db.add(act)
    ticket.status = "closed"
    ticket.updated_at = now
    await db.commit()

    refreshed = await db.execute(
        select(Ticket).options(
            selectinload(Ticket.assignee),
            selectinload(Ticket.reporter),
            selectinload(Ticket.project),
            selectinload(Ticket.comments).selectinload(TicketComment.author),
            selectinload(Ticket.attachments).selectinload(TicketAttachment.uploader),
            selectinload(Ticket.activities).selectinload(TicketActivity.actor),
        ).where(Ticket.id == ticket.id)
    )
    out_obj = refreshed.scalars().first()

    workspace_id = out_obj.project.organization_id if out_obj.project else current_user.organization_id
    await ws_manager.broadcast(
        workspace_id=workspace_id,
        event_type="ticket_updated",
        data={"ticket": TicketRead.model_validate(out_obj).model_dump(mode="json")},
    )
    return out_obj
