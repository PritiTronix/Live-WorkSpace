"""
Root Cause Analysis (RCA) router — Enterprise Database Driven Implementation.
Manages comprehensive RCA incident records (RCARecord model) and ticket RCA metadata,
strictly isolated by tenant organization with RBAC approvals.
"""
from __future__ import annotations

import json
from typing import Optional, List, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.database import get_db
from backend.app.dependencies import get_current_active_user, require_roles
from backend.app.models import Ticket, Project, RCARecord, User

router = APIRouter()


class RCARequest(BaseModel):
    rca_trigger: str
    rca_mitigation: str
    rca_action_items: Optional[str] = None


class RCAResponse(BaseModel):
    ticket_id: str
    ticket_number: str
    title: str
    rca_trigger: Optional[str] = None
    rca_mitigation: Optional[str] = None
    rca_action_items: Optional[str] = None
    updated_at: Optional[datetime] = None


class RCARecordCreate(BaseModel):
    ticket_id: str
    title: str
    incident_date: Optional[datetime] = None
    severity: str = "critical"
    five_whys: Optional[List[str]] = None
    root_cause: str
    immediate_mitigation: str
    preventative_actions: Optional[List[str]] = None
    impact_summary: Optional[str] = None


class RCARecordRead(BaseModel):
    id: str
    ticket_id: str
    ticket_number: Optional[str] = None
    title: str
    incident_date: Optional[datetime] = None
    severity: str
    five_whys: List[str] = []
    root_cause: str
    immediate_mitigation: str
    preventative_actions: List[str] = []
    impact_summary: Optional[str] = None
    status: str
    author_id: str
    approved_by_id: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


def _format_rca_record(r: RCARecord, ticket_number: Optional[str] = None) -> RCARecordRead:
    five_whys = []
    try:
        five_whys = json.loads(r.five_whys or "[]")
    except Exception:
        pass

    preventative = []
    try:
        preventative = json.loads(r.preventative_actions or "[]")
    except Exception:
        pass

    return RCARecordRead(
        id=r.id,
        ticket_id=r.ticket_id,
        ticket_number=ticket_number or (r.ticket.ticket_number if r.ticket else None),
        title=r.title,
        incident_date=r.incident_date,
        severity=r.severity,
        five_whys=five_whys,
        root_cause=r.root_cause,
        immediate_mitigation=r.immediate_mitigation,
        preventative_actions=preventative,
        impact_summary=r.impact_summary,
        status=r.status,
        author_id=r.author_id,
        approved_by_id=r.approved_by_id,
        approved_at=r.approved_at,
        created_at=r.created_at,
        updated_at=r.updated_at,
    )


# ---------------------------------------------------------------------------
# Organization-wide RCA Incident Records
# ---------------------------------------------------------------------------

@router.get("", response_model=List[RCARecordRead], summary="List all RCA records")
@router.get("/", response_model=List[RCARecordRead], include_in_schema=False)
async def list_rca_records(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """List all Root Cause Analysis documents within user's organization."""
    query = (
        select(RCARecord)
        .options(selectinload(RCARecord.ticket))
        .where(RCARecord.organization_id == current_user.organization_id)
        .order_by(desc(RCARecord.created_at))
    )
    res = await db.execute(query)
    records = res.scalars().all()
    return [_format_rca_record(r) for r in records]


@router.post("", response_model=RCARecordRead, status_code=status.HTTP_201_CREATED, summary="Create formal RCA record")
@router.post("/", response_model=RCARecordRead, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_rca_record(
    payload: RCARecordCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a formal RCA record linked to an existing ticket."""
    t_res = await db.execute(
        select(Ticket)
        .options(selectinload(Ticket.project))
        .where(Ticket.id == payload.ticket_id)
    )
    ticket = t_res.scalars().first()
    if not ticket or not ticket.project or ticket.project.organization_id != current_user.organization_id:
        raise HTTPException(status_code=404, detail="Referenced ticket not found in your organization")

    # Check if RCA record already exists for ticket
    existing_rca = await db.execute(select(RCARecord).where(RCARecord.ticket_id == payload.ticket_id))
    if existing_rca.scalars().first():
        raise HTTPException(status_code=400, detail="An RCA record already exists for this ticket")

    now = datetime.now(timezone.utc)
    rca = RCARecord(
        ticket_id=payload.ticket_id,
        organization_id=current_user.organization_id,
        author_id=current_user.id,
        title=payload.title.strip(),
        incident_date=payload.incident_date or now,
        severity=payload.severity.lower(),
        five_whys=json.dumps(payload.five_whys or []),
        root_cause=payload.root_cause.strip(),
        immediate_mitigation=payload.immediate_mitigation.strip(),
        preventative_actions=json.dumps(payload.preventative_actions or []),
        impact_summary=payload.impact_summary,
        status="draft",
        created_at=now,
        updated_at=now,
    )
    db.add(rca)

    # Sync quick summary to ticket RCA columns
    ticket.rca_trigger = payload.root_cause[:200]
    ticket.rca_mitigation = payload.immediate_mitigation[:200]
    ticket.updated_at = now

    await db.commit()
    await db.refresh(rca)
    return _format_rca_record(rca, ticket_number=ticket.ticket_number)


@router.post("/{rca_id}/approve", response_model=RCARecordRead, summary="Approve RCA record")
async def approve_rca_record(
    rca_id: str,
    current_user: User = Depends(require_roles(["owner", "admin", "lead"])),
    db: AsyncSession = Depends(get_db),
):
    """Sign off and approve formal RCA (Requires Lead, Admin, or Owner)."""
    res = await db.execute(
        select(RCARecord)
        .options(selectinload(RCARecord.ticket))
        .where(RCARecord.id == rca_id, RCARecord.organization_id == current_user.organization_id)
    )
    rca = res.scalars().first()
    if not rca:
        raise HTTPException(status_code=404, detail="RCA record not found")

    rca.status = "approved"
    rca.approved_by_id = current_user.id
    rca.approved_at = datetime.now(timezone.utc)
    rca.updated_at = rca.approved_at
    await db.commit()
    return _format_rca_record(rca)


# ---------------------------------------------------------------------------
# Ticket-specific RCA Endpoints (Screen Compatibility)
# ---------------------------------------------------------------------------

@router.get("/ticket/{ticket_id}", response_model=RCAResponse)
async def get_ticket_rca(
    ticket_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve Root Cause Analysis for a specific ticket."""
    res = await db.execute(
        select(Ticket)
        .options(selectinload(Ticket.project))
        .where(Ticket.id == ticket_id)
    )
    ticket = res.scalars().first()
    if not ticket or not ticket.project or ticket.project.organization_id != current_user.organization_id:
        raise HTTPException(status_code=404, detail="Ticket not found")

    return RCAResponse(
        ticket_id=ticket.id,
        ticket_number=ticket.ticket_number,
        title=ticket.title,
        rca_trigger=ticket.rca_trigger,
        rca_mitigation=ticket.rca_mitigation,
        rca_action_items=ticket.rca_action_items,
        updated_at=ticket.updated_at,
    )


@router.post("/ticket/{ticket_id}", response_model=RCAResponse, status_code=status.HTTP_200_OK)
async def submit_ticket_rca(
    ticket_id: str,
    payload: RCARequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Submit Root Cause Analysis incident document."""
    res = await db.execute(
        select(Ticket)
        .options(selectinload(Ticket.project))
        .where(Ticket.id == ticket_id)
    )
    ticket = res.scalars().first()
    if not ticket or not ticket.project or ticket.project.organization_id != current_user.organization_id:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket.rca_trigger = payload.rca_trigger.strip()
    ticket.rca_mitigation = payload.rca_mitigation.strip()
    if payload.rca_action_items:
        ticket.rca_action_items = payload.rca_action_items.strip()
    ticket.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(ticket)

    return RCAResponse(
        ticket_id=ticket.id,
        ticket_number=ticket.ticket_number,
        title=ticket.title,
        rca_trigger=ticket.rca_trigger,
        rca_mitigation=ticket.rca_mitigation,
        rca_action_items=ticket.rca_action_items,
        updated_at=ticket.updated_at,
    )
