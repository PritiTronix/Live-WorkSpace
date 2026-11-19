import io
import csv
import json
import hashlib
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select, desc, func, and_, or_, false
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.database import get_db
from backend.app.dependencies import get_current_user_id
from backend.app.models import TicketActivity, Ticket, Project, User, ProjectActivity, AuditLog
from backend.app.schemas import (
    AuditLogsListResponse,
    AuditLogItemRead,
    AuditLogDetailRead,
    AuditLogKPIMetrics,
    AuditLogExportRequest,
    UserRead,
    ProjectActivityRead
)

router = APIRouter()


def _compute_record_fingerprint(activity_id: str, ticket_id: Optional[str], actor_id: Optional[str], action: str, timestamp: Optional[datetime]) -> str:
    """Compute deterministic SHA-256 fingerprint for record identification (not a blockchain or immutable ledger)."""
    ts_str = timestamp.isoformat() if timestamp else ""
    raw = f"{activity_id}:{ticket_id or 'none'}:{actor_id or 'system'}:{action}:{ts_str}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _map_audit_log_to_item(al: AuditLog) -> AuditLogItemRead:
    fingerprint = _compute_record_fingerprint(al.id, None, al.actor_id, al.action, al.created_at)
    log_ref = f"#LOG-{abs(hash(al.id)) % 90000 + 10000}"
    u = al.actor

    actor_read = None
    if u:
        actor_read = UserRead(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role=u.role,
            title=u.title,
            avatar_url=u.avatar_url,
            department=u.department,
            is_active=u.is_active,
            created_at=u.created_at
        )

    return AuditLogItemRead(
        id=al.id,
        log_ref=log_ref,
        created_at=al.created_at,
        ticket_id=None,
        ticket_number=None,
        ticket_title="Organization Event",
        ticket_severity=None,
        ticket_status=None,
        actor=actor_read,
        event_type=al.action,
        event_label=_format_event_label(al.action),
        description=al.details or _format_event_label(al.action),
        previous_value=None,
        new_value=None,
        immutable_hash=fingerprint
    )


def _format_event_label(action: str) -> str:
    action_clean = (action or "").lower().replace("_", " ")
    mapping = {
        "status change": "Status Transition",
        "status changed": "Status Transition",
        "severity change": "Severity Escalation",
        "severity changed": "Severity Escalation",
        "severity escalated": "Severity Escalation",
        "reassigned": "Ownership Reassignment",
        "reassign": "Ownership Reassignment",
        "deadline change": "Deadline Modification",
        "deadline changed": "Deadline Modification",
        "ticket reopened": "Ticket Reopened",
        "ticket closed": "Ticket Closed",
        "ticket created": "Ticket Ingested",
        "ticket edited": "Ticket Updated",
        "organization_created": "Organization Created",
        "join_code_generated": "Join Code Generated",
        "join_code_revoked": "Join Code Revoked",
        "join_request_approved": "Join Request Approved",
        "join_request_rejected": "Join Request Rejected",
    }
    return mapping.get(action_clean, action.replace("_", " ").title())


def _format_description(action: str, old_val: Optional[str], new_val: Optional[str], ticket_num: str) -> str:
    act = (action or "").lower()
    if "status" in act:
        return f"Status updated from '{old_val or 'none'}' to '{new_val or 'none'}' on {ticket_num}"
    if "severity" in act:
        return f"Severity escalated from '{old_val or 'major'}' to '{new_val or 'critical'}' on {ticket_num}"
    if "reassign" in act:
        return f"Ticket reassigned from '{old_val or 'Unassigned'}' to '{new_val or 'Unassigned'}' on {ticket_num}"
    if "deadline" in act:
        return f"Target SLA deadline adjusted from '{old_val or 'None'}' to '{new_val or 'None'}' on {ticket_num}"
    if "reopen" in act:
        return f"Ticket reopened: {new_val or 'State restored to WIP'} on {ticket_num}"
    if "close" in act:
        return f"Ticket closed: {new_val or 'Resolution completed'} on {ticket_num}"
    return f"Action '{action}' executed on {ticket_num}: {old_val or ''} -> {new_val or ''}"


@router.get("/summary-legacy", response_model=List[ProjectActivityRead])
async def list_legacy_project_audit_logs(
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    category: Optional[str] = Query(None, description="Filter by category"),
    actor_id: Optional[str] = Query(None, description="Filter by actor user ID"),
    search: Optional[str] = Query(None, description="Search in target_title or details"),
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Legacy ProjectActivity endpoint for backward compatibility (organization scoped)."""
    user_res = await db.execute(select(User).where(User.id == current_user_id))
    current_user = user_res.scalar_one_or_none()
    org_id = current_user.organization_id if current_user else None

    if not org_id:
        return []

    p_res = await db.execute(select(Project.id).where(Project.organization_id == org_id))
    org_project_ids = [pid for pid in p_res.scalars().all()]

    if not org_project_ids:
        return []

    query = (
        select(ProjectActivity)
        .options(selectinload(ProjectActivity.actor))
        .where(ProjectActivity.project_id.in_(org_project_ids))
    )

    if project_id and project_id in org_project_ids:
        query = query.where(ProjectActivity.project_id == project_id)
    if category and category.lower() != "all":
        query = query.where(ProjectActivity.category == category.lower())
    if actor_id and actor_id.lower() != "all":
        query = query.where(ProjectActivity.actor_id == actor_id)
    if search:
        query = query.where(
            ProjectActivity.target_title.ilike(f"%{search.strip()}%") |
            ProjectActivity.details.ilike(f"%{search.strip()}%")
        )
    query = query.order_by(desc(ProjectActivity.created_at))
    res = await db.execute(query)
    return res.scalars().all()


@router.get("/actors")
async def list_audit_actors(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """List genuine organization actors/users for the audit filter dropdown (F-12)."""
    user_res = await db.execute(select(User).where(User.id == current_user_id))
    current_user = user_res.scalar_one_or_none()
    org_id = current_user.organization_id if current_user else None

    if not org_id:
        return []

    res = await db.execute(
        select(User.id, User.full_name, User.email, User.role)
        .where(User.organization_id == org_id)
        .order_by(User.full_name.asc())
    )
    rows = res.all()
    return [
        {"id": r[0], "full_name": r[1], "email": r[2], "role": r[3]}
        for r in rows
    ]


@router.get("/", response_model=AuditLogsListResponse)
async def list_audit_logs(
    search: Optional[str] = Query(None, description="Search ticket ID, description, or actor"),
    time_horizon: str = Query("7d", description="today, 7d, 30d, all"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    severity: Optional[str] = Query(None, description="Filter by ticket severity"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by ticket status"),
    actor_id: Optional[str] = Query(None, description="Filter by actor ID"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(25, ge=1, le=100, description="Page size"),
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> AuditLogsListResponse:
    """Retrieve paginated organization-scoped activity logs for Screen 2 (zero fabricated metrics)."""
    user_res = await db.execute(select(User).where(User.id == current_user_id))
    current_user = user_res.scalar_one_or_none()
    org_id = current_user.organization_id if current_user else None

    # Strict Tenant Isolation: if user has no org, return empty structure (F-07)
    if not org_id:
        return AuditLogsListResponse(
            items=[],
            total=0,
            page=1,
            page_size=page_size,
            total_pages=1,
            kpis=AuditLogKPIMetrics(
                event_volume_24h=0,
                event_volume_delta_pct=None,
                escalations_count=0,
                signoffs_count=0,
                automated_ingests_count=None,
                automated_ingests_pct=None,
                ledger_hash=None
            )
        )

    now = datetime.now(timezone.utc)
    cutoff = None
    if time_horizon == "today":
        cutoff = now - timedelta(days=1)
    elif time_horizon == "7d":
        cutoff = now - timedelta(days=7)
    elif time_horizon == "30d":
        cutoff = now - timedelta(days=30)

    # Base query for AuditLog (organization lifecycle events)
    audit_query = (
        select(AuditLog)
        .options(selectinload(AuditLog.actor))
        .where(AuditLog.organization_id == org_id)
    )
    if cutoff:
        audit_query = audit_query.where(AuditLog.created_at >= cutoff)
    if actor_id and actor_id.lower() != "all":
        audit_query = audit_query.where(AuditLog.actor_id == actor_id)
    if severity and severity.lower() != "all":
        audit_query = audit_query.where(false())
    if status_filter and status_filter.lower() != "all":
        audit_query = audit_query.where(false())
    if event_type and event_type.lower() != "all":
        et = event_type.lower()
        if any(k in et for k in ["status", "severity", "escalat", "reassign", "deadline", "reopen", "close", "signoff", "rca"]):
            audit_query = audit_query.where(false())
        else:
            audit_query = audit_query.where(AuditLog.action.ilike(f"%{event_type}%"))
    if search and search.strip():
        term = f"%{search.strip()}%"
        audit_query = audit_query.outerjoin(User, AuditLog.actor_id == User.id).where(
            or_(
                AuditLog.action.ilike(term),
                AuditLog.details.ilike(term),
                User.full_name.ilike(term),
                User.email.ilike(term)
            )
        )

    # Fetch organization project IDs
    p_res = await db.execute(select(Project.id).where(Project.organization_id == org_id))
    org_project_ids = [pid for pid in p_res.scalars().all()]

    base_query = None
    if org_project_ids:
        base_query = (
            select(TicketActivity)
            .join(Ticket, TicketActivity.ticket_id == Ticket.id)
            .options(
                selectinload(TicketActivity.ticket).selectinload(Ticket.project),
                selectinload(TicketActivity.actor)
            )
            .where(Ticket.project_id.in_(org_project_ids))
        )
        if cutoff:
            base_query = base_query.where(TicketActivity.created_at >= cutoff)
        if event_type and event_type.lower() != "all":
            et = event_type.lower()
            if "status" in et:
                base_query = base_query.where(TicketActivity.action.ilike("%status%"))
            elif "severity" in et or "escalat" in et:
                base_query = base_query.where(TicketActivity.action.ilike("%severity%"))
            elif "reassign" in et:
                base_query = base_query.where(TicketActivity.action.ilike("%reassign%"))
            elif "deadline" in et:
                base_query = base_query.where(TicketActivity.action.ilike("%deadline%"))
            elif "reopen" in et:
                base_query = base_query.where(TicketActivity.action.ilike("%reopen%"))
            elif "close" in et or "signoff" in et or "rca" in et:
                base_query = base_query.where(TicketActivity.action.ilike("%close%"))
            else:
                base_query = base_query.where(TicketActivity.action == event_type)
        if severity and severity.lower() != "all":
            base_query = base_query.where(Ticket.severity == severity.lower())
        if status_filter and status_filter.lower() != "all":
            base_query = base_query.where(Ticket.status == status_filter.lower())
        if actor_id and actor_id.lower() != "all":
            base_query = base_query.where(TicketActivity.actor_id == actor_id)
        if search and search.strip():
            term = f"%{search.strip()}%"
            base_query = base_query.join(User, TicketActivity.actor_id == User.id).where(
                or_(
                    Ticket.ticket_number.ilike(term),
                    Ticket.title.ilike(term),
                    TicketActivity.action.ilike(term),
                    TicketActivity.old_value.ilike(term),
                    TicketActivity.new_value.ilike(term),
                    User.full_name.ilike(term),
                    User.email.ilike(term),
                )
            )

    # Compute Total count
    audit_count_res = await db.execute(select(func.count()).select_from(audit_query.subquery()))
    audit_count = audit_count_res.scalar() or 0

    ticket_count = 0
    if base_query is not None:
        count_res = await db.execute(select(func.count()).select_from(base_query.subquery()))
        ticket_count = count_res.scalar() or 0

    total_count = audit_count + ticket_count

    # Calculate real KPIs across recent 24h
    cutoff_24h = now - timedelta(days=1)
    cutoff_48h = now - timedelta(days=2)

    recent_24h_activities = []
    v_prev_24h_ticket = 0
    if org_project_ids:
        kpi_24h_query = (
            select(TicketActivity)
            .join(Ticket, TicketActivity.ticket_id == Ticket.id)
            .where(Ticket.project_id.in_(org_project_ids))
            .where(TicketActivity.created_at >= cutoff_24h)
        )
        kpi_res = await db.execute(kpi_24h_query)
        recent_24h_activities = kpi_res.scalars().all()

        kpi_prev_query = (
            select(func.count(TicketActivity.id))
            .join(Ticket, TicketActivity.ticket_id == Ticket.id)
            .where(Ticket.project_id.in_(org_project_ids))
            .where(TicketActivity.created_at >= cutoff_48h)
            .where(TicketActivity.created_at < cutoff_24h)
        )
        prev_res = await db.execute(kpi_prev_query)
        v_prev_24h_ticket = prev_res.scalar() or 0

    # 24h audit logs count
    audit_24h_query = (
        select(func.count(AuditLog.id))
        .where(AuditLog.organization_id == org_id)
        .where(AuditLog.created_at >= cutoff_24h)
    )
    v24_audit = (await db.execute(audit_24h_query)).scalar() or 0

    audit_prev_query = (
        select(func.count(AuditLog.id))
        .where(AuditLog.organization_id == org_id)
        .where(AuditLog.created_at >= cutoff_48h)
        .where(AuditLog.created_at < cutoff_24h)
    )
    v_prev_audit = (await db.execute(audit_prev_query)).scalar() or 0

    v24 = len(recent_24h_activities) + v24_audit
    v_prev_24h = v_prev_24h_ticket + v_prev_audit

    if v_prev_24h > 0:
        event_volume_delta_pct = round(((v24 - v_prev_24h) / v_prev_24h * 100), 1)
    else:
        event_volume_delta_pct = None

    escalations = sum(1 for a in recent_24h_activities if "severity" in (a.action or "").lower())
    signoffs = sum(1 for a in recent_24h_activities if "close" in (a.action or "").lower())

    kpis = AuditLogKPIMetrics(
        event_volume_24h=v24,
        event_volume_delta_pct=event_volume_delta_pct,
        escalations_count=escalations,
        signoffs_count=signoffs,
        automated_ingests_count=None,
        automated_ingests_pct=None,
        ledger_hash=None
    )

    offset = (page - 1) * page_size
    fetch_limit = offset + page_size
    combined_items: List[AuditLogItemRead] = []

    if audit_count > 0:
        audit_res = await db.execute(audit_query.order_by(desc(AuditLog.created_at)).limit(fetch_limit))
        for al in audit_res.scalars().all():
            combined_items.append(_map_audit_log_to_item(al))

    if base_query is not None and ticket_count > 0:
        paged_res = await db.execute(base_query.order_by(desc(TicketActivity.created_at)).limit(fetch_limit))
        for a in paged_res.scalars().all():
            fingerprint = _compute_record_fingerprint(a.id, a.ticket_id, a.actor_id, a.action, a.created_at)
            log_ref = f"#LOG-{abs(hash(a.id)) % 90000 + 10000}"
            t = a.ticket
            u = a.actor

            actor_read = None
            if u:
                actor_read = UserRead(
                    id=u.id,
                    email=u.email,
                    full_name=u.full_name,
                    role=u.role,
                    title=u.title,
                    avatar_url=u.avatar_url,
                    department=u.department,
                    is_active=u.is_active,
                    created_at=u.created_at
                )

            combined_items.append(AuditLogItemRead(
                id=a.id,
                log_ref=log_ref,
                created_at=a.created_at,
                ticket_id=t.id if t else None,
                ticket_number=t.ticket_number if t else "TICK-UNKNOWN",
                ticket_title=t.title if t else "Untitled Ticket",
                ticket_severity=t.severity if t else "major",
                ticket_status=t.status if t else "open",
                actor=actor_read,
                event_type=a.action,
                event_label=_format_event_label(a.action),
                description=_format_description(a.action, a.old_value, a.new_value, t.ticket_number if t else "ticket"),
                previous_value=a.old_value,
                new_value=a.new_value,
                immutable_hash=fingerprint
            ))

    combined_items.sort(key=lambda x: x.created_at, reverse=True)
    items = combined_items[offset : offset + page_size]
    total_pages = max(1, (total_count + page_size - 1) // page_size)

    return AuditLogsListResponse(
        items=items,
        total=total_count,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        kpis=kpis
    )


@router.get("/{log_id}", response_model=AuditLogDetailRead)
async def get_audit_log_detail(
    log_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> AuditLogDetailRead:
    """Retrieve full detail for a single audit log event with strict tenant authorization (F-06)."""
    user_res = await db.execute(select(User).where(User.id == current_user_id))
    current_user = user_res.scalar_one_or_none()
    org_id = current_user.organization_id if current_user else None

    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Audit log entry {log_id} not found."
        )

    # Scoped query ensuring the ticket belongs to the user's organization
    query = (
        select(TicketActivity)
        .join(Ticket, TicketActivity.ticket_id == Ticket.id)
        .join(Project, Ticket.project_id == Project.id)
        .options(
            selectinload(TicketActivity.ticket).selectinload(Ticket.project),
            selectinload(TicketActivity.actor)
        )
        .where(TicketActivity.id == log_id)
        .where(Project.organization_id == org_id)
    )
    res = await db.execute(query)
    a = res.scalar_one_or_none()

    if not a:
        audit_query = (
            select(AuditLog)
            .options(selectinload(AuditLog.actor))
            .where(AuditLog.id == log_id)
            .where(AuditLog.organization_id == org_id)
        )
        audit_res = await db.execute(audit_query)
        al = audit_res.scalar_one_or_none()
        if not al:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Audit log entry {log_id} not found."
            )

        u = al.actor
        fingerprint = _compute_record_fingerprint(al.id, None, al.actor_id, al.action, al.created_at)
        log_ref = f"#LOG-{abs(hash(al.id)) % 90000 + 10000}"

        actor_read = None
        if u:
            actor_read = UserRead(
                id=u.id,
                email=u.email,
                full_name=u.full_name,
                role=u.role,
                title=u.title,
                avatar_url=u.avatar_url,
                department=u.department,
                is_active=u.is_active,
                created_at=u.created_at
            )

        return AuditLogDetailRead(
            id=al.id,
            log_ref=log_ref,
            created_at=al.created_at,
            ticket_id=None,
            ticket_number=None,
            ticket_title="Organization Event",
            ticket_severity=None,
            ticket_status=None,
            actor=actor_read,
            event_type=al.action,
            event_label=_format_event_label(al.action),
            description=al.details or _format_event_label(al.action),
            previous_value=None,
            new_value=None,
            immutable_hash=fingerprint,
            originating_interface="Not recorded",
            auth_host="Not recorded",
            context_justification=None,
            target_entity_details={"organization_id": al.organization_id, "action": al.action, "details": al.details}
        )

    t = a.ticket
    u = a.actor
    fingerprint = _compute_record_fingerprint(a.id, a.ticket_id, a.actor_id, a.action, a.created_at)
    log_ref = f"#LOG-{abs(hash(a.id)) % 90000 + 10000}"

    actor_read = None
    if u:
        actor_read = UserRead(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role=u.role,
            title=u.title,
            avatar_url=u.avatar_url,
            department=u.department,
            is_active=u.is_active,
            created_at=u.created_at
        )

    # Derive context justification only from actual persisted fields (F-05)
    justification = None
    if t and t.rca_mitigation:
        justification = f"Mitigation Action: {t.rca_mitigation}"
    elif t and t.rca_trigger:
        justification = f"Root Cause Analysis Trigger: {t.rca_trigger}"

    target_details = {}
    if t:
        target_details = {
            "ticket_id": t.id,
            "ticket_number": t.ticket_number,
            "title": t.title,
            "severity": t.severity,
            "status": t.status,
            "project_name": t.project.name if t.project else "Workspace Project",
            "deadline": t.deadline.isoformat() if t.deadline else None,
        }

    return AuditLogDetailRead(
        id=a.id,
        log_ref=log_ref,
        created_at=a.created_at,
        ticket_id=t.id if t else None,
        ticket_number=t.ticket_number if t else "TICK-UNKNOWN",
        ticket_title=t.title if t else "Untitled Ticket",
        ticket_severity=t.severity if t else "major",
        ticket_status=t.status if t else "open",
        actor=actor_read,
        event_type=a.action,
        event_label=_format_event_label(a.action),
        description=_format_description(a.action, a.old_value, a.new_value, t.ticket_number if t else "ticket"),
        previous_value=a.old_value,
        new_value=a.new_value,
        immutable_hash=fingerprint,
        originating_interface="Not recorded",  # Unpersisted metadata set to 'Not recorded' (F-05)
        auth_host="Not recorded",              # Removed fake SEC-AUTH IP address (F-05)
        context_justification=justification,
        target_entity_details=target_details
    )


@router.post("/export")
async def export_audit_logs(
    req: AuditLogExportRequest,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Export organization-scoped activity logs with real domain filtering (F-07, F-08)."""
    user_res = await db.execute(select(User).where(User.id == current_user_id))
    current_user = user_res.scalar_one_or_none()
    org_id = current_user.organization_id if current_user else None

    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authenticated user does not belong to any organization."
        )

    # Get org projects
    p_res = await db.execute(select(Project.id).where(Project.organization_id == org_id))
    org_project_ids = [pid for pid in p_res.scalars().all()]

    if not org_project_ids:
        activities = []
    else:
        base_query = (
            select(TicketActivity)
            .join(Ticket, TicketActivity.ticket_id == Ticket.id)
            .options(
                selectinload(TicketActivity.ticket).selectinload(Ticket.project),
                selectinload(TicketActivity.actor)
            )
            .where(Ticket.project_id.in_(org_project_ids))
        )

        now = datetime.now(timezone.utc)
        if req.time_horizon == "today":
            cutoff = now - timedelta(days=1)
            base_query = base_query.where(TicketActivity.created_at >= cutoff)
        elif req.time_horizon == "7d":
            cutoff = now - timedelta(days=7)
            base_query = base_query.where(TicketActivity.created_at >= cutoff)
        elif req.time_horizon == "30d":
            cutoff = now - timedelta(days=30)
            base_query = base_query.where(TicketActivity.created_at >= cutoff)

        if req.severity and req.severity.lower() != "all":
            base_query = base_query.where(Ticket.severity == req.severity.lower())

        # Apply real event_domains filter if specified (F-08)
        if req.event_domains:
            domain_clauses = []
            for d in req.event_domains:
                d_lower = d.lower()
                if "lifecycle" in d_lower:
                    domain_clauses.append(TicketActivity.action.ilike("%create%"))
                    domain_clauses.append(TicketActivity.action.ilike("%delete%"))
                elif "transition" in d_lower:
                    domain_clauses.append(TicketActivity.action.ilike("%status%"))
                    domain_clauses.append(TicketActivity.action.ilike("%severity%"))
                    domain_clauses.append(TicketActivity.action.ilike("%deadline%"))
                elif "assign" in d_lower:
                    domain_clauses.append(TicketActivity.action.ilike("%reassign%"))
                    domain_clauses.append(TicketActivity.action.ilike("%assign%"))
                elif "signoff" in d_lower or "close" in d_lower:
                    domain_clauses.append(TicketActivity.action.ilike("%close%"))
                    domain_clauses.append(TicketActivity.action.ilike("%sign%"))

            if domain_clauses:
                base_query = base_query.where(or_(*domain_clauses))

        res = await db.execute(base_query.order_by(desc(TicketActivity.created_at)).limit(500))
        activities = res.scalars().all()

    # Query organization AuditLog entries for export
    now = datetime.now(timezone.utc)
    audit_export_query = (
        select(AuditLog)
        .options(selectinload(AuditLog.actor))
        .where(AuditLog.organization_id == org_id)
    )
    if req.time_horizon == "today":
        audit_export_query = audit_export_query.where(AuditLog.created_at >= (now - timedelta(days=1)))
    elif req.time_horizon == "7d":
        audit_export_query = audit_export_query.where(AuditLog.created_at >= (now - timedelta(days=7)))
    elif req.time_horizon == "30d":
        audit_export_query = audit_export_query.where(AuditLog.created_at >= (now - timedelta(days=30)))

    include_org_events = True
    if req.severity and req.severity.lower() != "all":
        include_org_events = False
    if req.event_domains:
        include_org_events = any(d.lower() in ["lifecycle", "organization", "auth", "admin", "all"] for d in req.event_domains)

    audit_records = []
    if include_org_events:
        a_res = await db.execute(audit_export_query.order_by(desc(AuditLog.created_at)).limit(500))
        audit_records = a_res.scalars().all()

    timestamp_str = now.strftime('%Y%m%d-%H%M%S')

    if req.format.lower() == "json":
        data = []
        for al in audit_records:
            u = al.actor
            fingerprint = _compute_record_fingerprint(al.id, None, al.actor_id, al.action, al.created_at)
            data.append({
                "log_id": al.id,
                "log_ref": f"#LOG-{abs(hash(al.id)) % 90000 + 10000}",
                "timestamp": al.created_at.isoformat() if al.created_at else None,
                "ticket_number": None,
                "ticket_title": "Organization Event",
                "actor": u.full_name if u else "System",
                "actor_email": u.email if u else None,
                "event_type": al.action,
                "previous_value": None,
                "new_value": al.details,
                "sha256_fingerprint": fingerprint
            })
        for a in activities:
            t = a.ticket
            u = a.actor
            fingerprint = _compute_record_fingerprint(a.id, a.ticket_id, a.actor_id, a.action, a.created_at)
            data.append({
                "log_id": a.id,
                "log_ref": f"#LOG-{abs(hash(a.id)) % 90000 + 10000}",
                "timestamp": a.created_at.isoformat() if a.created_at else None,
                "ticket_number": t.ticket_number if t else None,
                "ticket_title": t.title if t else None,
                "actor": u.full_name if u else "System",
                "actor_email": u.email if u else None,
                "event_type": a.action,
                "previous_value": a.old_value,
                "new_value": a.new_value,
                "sha256_fingerprint": fingerprint
            })
        json_str = json.dumps(data, indent=2)
        filename = f"audit-log-{timestamp_str}.json"
        return StreamingResponse(
            iter([json_str]),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )

    # Standard CSV
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["# Link-WorkSpace Activity Log Export"])
    writer.writerow(["# Exported At (UTC)", now.isoformat()])
    writer.writerow(["# Time Horizon", req.time_horizon])
    writer.writerow([])
    writer.writerow([
        "Log Ref",
        "Timestamp (UTC)",
        "Ticket Number",
        "Ticket Title",
        "Actor Name",
        "Actor Email",
        "Event Type",
        "Previous Value",
        "New Value",
        "SHA-256 Fingerprint"
    ])

    for al in audit_records:
        u = al.actor
        fingerprint = _compute_record_fingerprint(al.id, None, al.actor_id, al.action, al.created_at)
        log_ref = f"#LOG-{abs(hash(al.id)) % 90000 + 10000}"
        writer.writerow([
            log_ref,
            al.created_at.isoformat() if al.created_at else "",
            "N/A",
            "Organization Event",
            u.full_name if u else "System",
            u.email if u else "",
            al.action,
            "",
            al.details or "",
            fingerprint
        ])

    for a in activities:
        t = a.ticket
        u = a.actor
        fingerprint = _compute_record_fingerprint(a.id, a.ticket_id, a.actor_id, a.action, a.created_at)
        log_ref = f"#LOG-{abs(hash(a.id)) % 90000 + 10000}"
        writer.writerow([
            log_ref,
            a.created_at.isoformat() if a.created_at else "",
            t.ticket_number if t else "N/A",
            t.title if t else "",
            u.full_name if u else "System",
            u.email if u else "",
            a.action,
            a.old_value or "",
            a.new_value or "",
            fingerprint
        ])

    output.seek(0)
    filename = f"audit-log-{timestamp_str}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
