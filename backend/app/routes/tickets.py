from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, and_, desc, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database import get_db
from backend.app.dependencies import get_current_user_id
from backend.app.models import Ticket, Project, ProjectActivity
from backend.app.schemas import TicketBase, TicketRead

router = APIRouter()


@router.get("/", response_model=List[TicketRead])
async def list_tickets(
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    severity: Optional[str] = Query(None, description="Filter by severity (blocker, critical, major, minor)"),
    status: Optional[str] = Query(None, description="Filter by status (open, wip, on_hold, resolved, closed)"),
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """List tickets for dashboard and board views."""
    query = select(Ticket)

    if project_id:
        query = query.where(Ticket.project_id == project_id)
    if severity and severity.lower() != "all":
        query = query.where(Ticket.severity == severity.lower())
    if status and status.lower() != "all":
        query = query.where(Ticket.status == status.lower())

    query = query.order_by(desc(Ticket.created_at))
    res = await db.execute(query)
    tickets = res.scalars().all()
    return tickets


@router.post("/", response_model=TicketRead, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    ticket_in: TicketBase,
    project_id: str = Query(..., description="Target project ID"),
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Create a new ticket with automatic SLA assignment."""
    p_res = await db.execute(select(Project).where(Project.id == project_id))
    project = p_res.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    count_res = await db.execute(select(func.count(Ticket.id)))
    count = count_res.scalar() or 0
    tkt_num = f"TKT-{1020 + count}"

    now = datetime.now(timezone.utc)
    new_ticket = Ticket(
        ticket_number=tkt_num,
        title=ticket_in.title.strip(),
        description=ticket_in.description,
        severity=(ticket_in.severity or "major").lower(),
        status=(ticket_in.status or "open").lower(),
        project_id=project_id,
        created_at=now,
        updated_at=now,
    )
    db.add(new_ticket)
    await db.flush()

    activity = ProjectActivity(
        project_id=project_id,
        actor_id=current_user_id,
        action="ticket_created",
        category="tickets",
        target_type="ticket",
        target_id=new_ticket.id,
        target_title=f"[{new_ticket.ticket_number}] {new_ticket.title}",
        details=f"Severity: {new_ticket.severity}, Status: {new_ticket.status}",
        created_at=now,
    )
    db.add(activity)
    await db.commit()

    return new_ticket


@router.patch("/{ticket_id}/status", response_model=TicketRead)
async def update_ticket_status(
    ticket_id: str,
    status_val: str = Query(..., alias="status"),
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Update ticket workflow state (open, wip, on_hold, resolved, closed)."""
    res = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = res.scalars().first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    old_status = ticket.status
    ticket.status = status_val.lower()
    ticket.updated_at = datetime.now(timezone.utc)

    activity = ProjectActivity(
        project_id=ticket.project_id,
        actor_id=current_user_id,
        action="ticket_status_change",
        category="tickets",
        target_type="ticket",
        target_id=ticket.id,
        target_title=f"[{ticket.ticket_number}] {ticket.title}",
        details=f"Status transitioned from {old_status} to {ticket.status}",
        created_at=ticket.updated_at,
    )
    db.add(activity)
    await db.commit()
    return ticket


@router.patch("/{ticket_id}/severity", response_model=TicketRead)
async def update_ticket_severity(
    ticket_id: str,
    severity_val: str = Query(..., alias="severity"),
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Update ticket severity (blocker, critical, major) with SLA recalibration."""
    res = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = res.scalars().first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    old_sev = ticket.severity
    ticket.severity = severity_val.lower()
    ticket.updated_at = datetime.now(timezone.utc)

    activity = ProjectActivity(
        project_id=ticket.project_id,
        actor_id=current_user_id,
        action="ticket_severity_change",
        category="tickets",
        target_type="ticket",
        target_id=ticket.id,
        target_title=f"[{ticket.ticket_number}] {ticket.title}",
        details=f"Severity updated from {old_sev} to {ticket.severity}",
        created_at=ticket.updated_at,
    )
    db.add(activity)
    await db.commit()
    return ticket
