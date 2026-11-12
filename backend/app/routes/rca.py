import json
import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, desc, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.websockets import ws_manager
from backend.app.database import get_db
from backend.app.dependencies import get_current_user
from backend.app.models import User, RCA, RCAVersion, RCAActionItem, Ticket
from backend.app.schemas import (
    RCACreate,
    RCAUpdate,
    RCARead,
    RCAPaginatedResponse,
    RCAVersionRead,
    RCAActionItemCreate,
    RCAActionItemUpdate,
    RCAActionItemRead,
    MessageResponse,
)

logger = logging.getLogger("rca.routes")
router = APIRouter()


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _serialize_rca_snapshot(rca: RCA) -> str:
    """Create a JSON snapshot of an RCA for immutable version history."""
    snapshot = {
        "id": rca.id,
        "rca_number": rca.rca_number,
        "title": rca.title,
        "incident_date": rca.incident_date.isoformat() if rca.incident_date else None,
        "severity": rca.severity,
        "service_affected": rca.service_affected,
        "outage_duration_minutes": rca.outage_duration_minutes,
        "customer_impact": rca.customer_impact,
        "summary": rca.summary,
        "five_whys": json.loads(rca.five_whys) if rca.five_whys else [],
        "timeline_events": json.loads(rca.timeline_events) if rca.timeline_events else [],
        "status": rca.status,
        "version": rca.version,
        "ticket_id": rca.ticket_id,
        "lead_investigator_id": rca.lead_investigator_id,
        "updated_at": rca.updated_at.isoformat() if rca.updated_at else None,
    }
    return json.dumps(snapshot, default=str)


def _rca_to_read(rca: RCA) -> RCARead:
    """Convert RCA ORM model to RCARead schema."""
    whys_list = json.loads(rca.five_whys) if rca.five_whys else []
    timeline_list = json.loads(rca.timeline_events) if rca.timeline_events else []

    action_items_read = [
        RCAActionItemRead(
            id=item.id,
            rca_id=item.rca_id,
            title=item.title,
            priority=item.priority,
            status=item.status,
            due_date=item.due_date,
            assignee_id=item.assignee_id,
            assignee_name=item.assignee.full_name if item.assignee else None,
            assignee_avatar=item.assignee.avatar_url if item.assignee else None,
            organization_id=item.organization_id,
            created_at=item.created_at,
            updated_at=item.updated_at,
        )
        for item in (rca.action_items or [])
    ]

    versions_read = [
        RCAVersionRead(
            id=v.id,
            rca_id=v.rca_id,
            version_number=v.version_number,
            snapshot_data=v.snapshot_data,
            changelog=v.changelog,
            author_id=v.author_id,
            author_name=v.author.full_name if v.author else None,
            created_at=v.created_at,
        )
        for v in (rca.versions or [])
    ]

    return RCARead(
        id=rca.id,
        rca_number=rca.rca_number,
        title=rca.title,
        incident_date=rca.incident_date,
        severity=rca.severity,
        service_affected=rca.service_affected,
        outage_duration_minutes=rca.outage_duration_minutes,
        customer_impact=rca.customer_impact,
        summary=rca.summary,
        five_whys=whys_list,
        timeline_events=timeline_list,
        status=rca.status,
        version=rca.version,
        ticket_id=rca.ticket_id,
        lead_investigator_id=rca.lead_investigator_id,
        lead_investigator_name=rca.lead_investigator.full_name if rca.lead_investigator else None,
        organization_id=rca.organization_id,
        created_at=rca.created_at,
        updated_at=rca.updated_at,
        action_items=action_items_read,
        versions=versions_read,
    )


# ==============================================================================
# RCA Endpoints
# ==============================================================================

@router.post("", response_model=RCARead, status_code=status.HTTP_201_CREATED)
async def create_rca_draft(
    payload: RCACreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new draft RCA incident report."""
    rca_id = f"rca_{uuid.uuid4().hex[:8]}"

    # Compute next RCA sequential number (e.g. RCA-101)
    count_res = await db.execute(
        select(func.count(RCA.id)).where(RCA.organization_id == user.organization_id)
    )
    rca_seq = (count_res.scalar() or 0) + 101
    rca_number = f"RCA-{rca_seq}"

    five_whys_json = json.dumps(payload.five_whys or []) if payload.five_whys else "[]"
    timeline_json = json.dumps(payload.timeline_events or []) if payload.timeline_events else "[]"

    new_rca = RCA(
        id=rca_id,
        rca_number=rca_number,
        title=payload.title.strip(),
        incident_date=payload.incident_date or _now_utc(),
        severity=payload.severity.lower().strip(),
        service_affected=payload.service_affected.strip(),
        outage_duration_minutes=payload.outage_duration_minutes,
        customer_impact=payload.customer_impact.strip() if payload.customer_impact else None,
        summary=payload.summary.strip() if payload.summary else None,
        five_whys=five_whys_json,
        timeline_events=timeline_json,
        status="draft",
        version=1,
        ticket_id=payload.ticket_id,
        lead_investigator_id=user.id,
        organization_id=user.organization_id,
        created_at=_now_utc(),
    )
    db.add(new_rca)
    await db.flush()

    # Optional initial action items
    if payload.action_items:
        for item in payload.action_items:
            action_id = f"act_{uuid.uuid4().hex[:8]}"
            act_obj = RCAActionItem(
                id=action_id,
                rca_id=rca_id,
                title=item.title.strip(),
                priority=item.priority.lower().strip(),
                status=item.status.lower().strip(),
                due_date=item.due_date,
                assignee_id=item.assignee_id,
                organization_id=user.organization_id,
                created_at=_now_utc(),
            )
            db.add(act_obj)

    # Initial version record (v1)
    initial_version = RCAVersion(
        id=f"ver_{uuid.uuid4().hex[:8]}",
        rca_id=rca_id,
        version_number=1,
        snapshot_data=_serialize_rca_snapshot(new_rca),
        changelog="Initial draft created",
        author_id=user.id,
        created_at=_now_utc(),
    )
    db.add(initial_version)

    await db.commit()

    # Query with relationships loaded
    res = await db.execute(
        select(RCA)
        .options(
            selectinload(RCA.lead_investigator),
            selectinload(RCA.action_items).selectinload(RCAActionItem.assignee),
            selectinload(RCA.versions).selectinload(RCAVersion.author),
        )
        .where(RCA.id == rca_id)
    )
    rca_loaded = res.scalars().first()

    await ws_manager.broadcast(
        user.organization_id,
        "rca.created",
        {"rca_id": rca_id, "rca_number": rca_number, "title": new_rca.title},
    )

    return _rca_to_read(rca_loaded)


@router.get("", response_model=RCAPaginatedResponse)
async def list_rcas(
    status_filter: Optional[str] = Query(None, alias="status"),
    severity: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List Root Cause Analyses with search, filters, and pagination."""
    query = (
        select(RCA)
        .options(
            selectinload(RCA.lead_investigator),
            selectinload(RCA.action_items).selectinload(RCAActionItem.assignee),
            selectinload(RCA.versions).selectinload(RCAVersion.author),
        )
        .where(RCA.organization_id == user.organization_id)
    )

    if status_filter and status_filter.lower() != "all":
        query = query.where(RCA.status == status_filter.lower().strip())
    if severity and severity.lower() != "all":
        query = query.where(RCA.severity == severity.lower().strip())
    if search and search.strip():
        q = f"%{search.strip().lower()}%"
        query = query.where(
            or_(
                func.lower(RCA.title).like(q),
                func.lower(RCA.rca_number).like(q),
                func.lower(RCA.service_affected).like(q),
            )
        )

    # Count total
    count_query = select(func.count(RCA.id)).where(RCA.organization_id == user.organization_id)
    if status_filter and status_filter.lower() != "all":
        count_query = count_query.where(RCA.status == status_filter.lower().strip())
    if severity and severity.lower() != "all":
        count_query = count_query.where(RCA.severity == severity.lower().strip())
    if search and search.strip():
        q = f"%{search.strip().lower()}%"
        count_query = count_query.where(
            or_(
                func.lower(RCA.title).like(q),
                func.lower(RCA.rca_number).like(q),
                func.lower(RCA.service_affected).like(q),
            )
        )

    count_res = await db.execute(count_query)
    total = count_res.scalar() or 0

    query = query.order_by(desc(RCA.created_at)).offset((page - 1) * page_size).limit(page_size)
    res = await db.execute(query)
    rcas = res.scalars().all()

    pages = max(1, (total + page_size - 1) // page_size)
    return RCAPaginatedResponse(
        items=[_rca_to_read(r) for r in rcas],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get("/{rca_id}", response_model=RCARead)
async def get_rca(
    rca_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve full Root Cause Analysis incident details."""
    res = await db.execute(
        select(RCA)
        .options(
            selectinload(RCA.lead_investigator),
            selectinload(RCA.action_items).selectinload(RCAActionItem.assignee),
            selectinload(RCA.versions).selectinload(RCAVersion.author),
        )
        .where(RCA.id == rca_id, RCA.organization_id == user.organization_id)
    )
    rca = res.scalars().first()
    if not rca:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "rca_not_found", "message": "Root Cause Analysis not found"}},
        )
    return _rca_to_read(rca)


@router.put("/{rca_id}", response_model=RCARead)
async def update_rca(
    rca_id: str,
    payload: RCAUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update RCA. If currently in 'draft', update in-place.
    If already 'submitted', 'approved' or 'published', the RCA is immutable
    and any changes generate a new version in version history.
    """
    res = await db.execute(
        select(RCA)
        .options(
            selectinload(RCA.lead_investigator),
            selectinload(RCA.action_items).selectinload(RCAActionItem.assignee),
            selectinload(RCA.versions).selectinload(RCAVersion.author),
        )
        .where(RCA.id == rca_id, RCA.organization_id == user.organization_id)
    )
    rca = res.scalars().first()
    if not rca:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "rca_not_found", "message": "Root Cause Analysis not found"}},
        )

    # Permission check: Members can edit their own drafts; only admin/manager can edit submitted RCAs
    if rca.status != "draft" and user.role.lower() not in ("owner", "admin", "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "insufficient_permissions", "message": "Only managers and admins can edit submitted RCAs."}},
        )
    if rca.status == "draft" and rca.lead_investigator_id != user.id and user.role.lower() not in ("owner", "admin", "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "insufficient_permissions", "message": "You can only edit your own draft RCAs."}},
        )

    # Apply changes
    if payload.title is not None:
        rca.title = payload.title.strip()
    if payload.incident_date is not None:
        rca.incident_date = payload.incident_date
    if payload.severity is not None:
        rca.severity = payload.severity.lower().strip()
    if payload.service_affected is not None:
        rca.service_affected = payload.service_affected.strip()
    if payload.outage_duration_minutes is not None:
        rca.outage_duration_minutes = payload.outage_duration_minutes
    if payload.customer_impact is not None:
        rca.customer_impact = payload.customer_impact.strip()
    if payload.summary is not None:
        rca.summary = payload.summary.strip()
    if payload.five_whys is not None:
        rca.five_whys = json.dumps(payload.five_whys)
    if payload.timeline_events is not None:
        rca.timeline_events = json.dumps(payload.timeline_events)
    if payload.ticket_id is not None:
        rca.ticket_id = payload.ticket_id

    rca.updated_at = _now_utc()

    # If already submitted or published, create a new version snapshot
    if rca.status != "draft":
        rca.version += 1
        new_version = RCAVersion(
            id=f"ver_{uuid.uuid4().hex[:8]}",
            rca_id=rca.id,
            version_number=rca.version,
            snapshot_data=_serialize_rca_snapshot(rca),
            changelog=payload.changelog or f"Updated RCA report to version {rca.version}",
            author_id=user.id,
            created_at=_now_utc(),
        )
        db.add(new_version)

    await db.commit()
    await db.refresh(rca)

    await ws_manager.broadcast(
        user.organization_id,
        "rca.updated",
        {"rca_id": rca.id, "rca_number": rca.rca_number, "version": rca.version},
    )

    return _rca_to_read(rca)


@router.post("/{rca_id}/submit", response_model=RCARead)
async def submit_rca(
    rca_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit a draft RCA for review."""
    res = await db.execute(
        select(RCA)
        .options(
            selectinload(RCA.lead_investigator),
            selectinload(RCA.action_items).selectinload(RCAActionItem.assignee),
            selectinload(RCA.versions).selectinload(RCAVersion.author),
        )
        .where(RCA.id == rca_id, RCA.organization_id == user.organization_id)
    )
    rca = res.scalars().first()
    if not rca:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "rca_not_found", "message": "Root Cause Analysis not found"}},
        )

    rca.status = "under_review"
    rca.updated_at = _now_utc()

    # Record version
    rca.version += 1
    new_version = RCAVersion(
        id=f"ver_{uuid.uuid4().hex[:8]}",
        rca_id=rca.id,
        version_number=rca.version,
        snapshot_data=_serialize_rca_snapshot(rca),
        changelog="Submitted for formal review",
        author_id=user.id,
        created_at=_now_utc(),
    )
    db.add(new_version)

    await db.commit()
    await db.refresh(rca)

    await ws_manager.broadcast(
        user.organization_id,
        "rca.status_changed",
        {"rca_id": rca.id, "rca_number": rca.rca_number, "status": "under_review"},
    )

    return _rca_to_read(rca)


@router.post("/{rca_id}/approve", response_model=RCARead)
async def approve_rca(
    rca_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Approve an RCA post-incident report (Admin or Manager only)."""
    if user.role.lower() not in ("owner", "admin", "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "insufficient_permissions", "message": "Only managers and admins can approve RCAs."}},
        )

    res = await db.execute(
        select(RCA)
        .options(
            selectinload(RCA.lead_investigator),
            selectinload(RCA.action_items).selectinload(RCAActionItem.assignee),
            selectinload(RCA.versions).selectinload(RCAVersion.author),
        )
        .where(RCA.id == rca_id, RCA.organization_id == user.organization_id)
    )
    rca = res.scalars().first()
    if not rca:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "rca_not_found", "message": "Root Cause Analysis not found"}},
        )

    rca.status = "approved"
    rca.updated_at = _now_utc()

    rca.version += 1
    new_version = RCAVersion(
        id=f"ver_{uuid.uuid4().hex[:8]}",
        rca_id=rca.id,
        version_number=rca.version,
        snapshot_data=_serialize_rca_snapshot(rca),
        changelog=f"Approved by {user.full_name}",
        author_id=user.id,
        created_at=_now_utc(),
    )
    db.add(new_version)

    await db.commit()
    await db.refresh(rca)

    await ws_manager.broadcast(
        user.organization_id,
        "rca.status_changed",
        {"rca_id": rca.id, "rca_number": rca.rca_number, "status": "approved"},
    )

    return _rca_to_read(rca)


@router.post("/{rca_id}/publish", response_model=RCARead)
async def publish_rca(
    rca_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Publish an approved RCA report organization-wide (Admin or Manager only)."""
    if user.role.lower() not in ("owner", "admin", "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "insufficient_permissions", "message": "Only managers and admins can publish RCAs."}},
        )

    res = await db.execute(
        select(RCA)
        .options(
            selectinload(RCA.lead_investigator),
            selectinload(RCA.action_items).selectinload(RCAActionItem.assignee),
            selectinload(RCA.versions).selectinload(RCAVersion.author),
        )
        .where(RCA.id == rca_id, RCA.organization_id == user.organization_id)
    )
    rca = res.scalars().first()
    if not rca:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "rca_not_found", "message": "Root Cause Analysis not found"}},
        )

    rca.status = "published"
    rca.updated_at = _now_utc()

    rca.version += 1
    new_version = RCAVersion(
        id=f"ver_{uuid.uuid4().hex[:8]}",
        rca_id=rca.id,
        version_number=rca.version,
        snapshot_data=_serialize_rca_snapshot(rca),
        changelog="Published incident RCA",
        author_id=user.id,
        created_at=_now_utc(),
    )
    db.add(new_version)

    await db.commit()
    await db.refresh(rca)

    await ws_manager.broadcast(
        user.organization_id,
        "rca.status_changed",
        {"rca_id": rca.id, "rca_number": rca.rca_number, "status": "published"},
    )

    return _rca_to_read(rca)


# ==============================================================================
# RCA Version History
# ==============================================================================

@router.get("/{rca_id}/versions", response_model=List[RCAVersionRead])
async def list_rca_versions(
    rca_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List historical audit snapshots of the RCA."""
    res = await db.execute(
        select(RCAVersion)
        .options(selectinload(RCAVersion.author))
        .join(RCA, RCA.id == RCAVersion.rca_id)
        .where(RCAVersion.rca_id == rca_id, RCA.organization_id == user.organization_id)
        .order_by(desc(RCAVersion.version_number))
    )
    versions = res.scalars().all()
    return [
        RCAVersionRead(
            id=v.id,
            rca_id=v.rca_id,
            version_number=v.version_number,
            snapshot_data=v.snapshot_data,
            changelog=v.changelog,
            author_id=v.author_id,
            author_name=v.author.full_name if v.author else None,
            created_at=v.created_at,
        )
        for v in versions
    ]


@router.get("/{rca_id}/versions/{version_number}", response_model=RCAVersionRead)
async def get_rca_version_snapshot(
    rca_id: str,
    version_number: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve exact historical snapshot of an RCA by version number."""
    res = await db.execute(
        select(RCAVersion)
        .options(selectinload(RCAVersion.author))
        .join(RCA, RCA.id == RCAVersion.rca_id)
        .where(
            RCAVersion.rca_id == rca_id,
            RCAVersion.version_number == version_number,
            RCA.organization_id == user.organization_id,
        )
    )
    ver = res.scalars().first()
    if not ver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "version_not_found", "message": f"Version {version_number} not found"}},
        )
    return RCAVersionRead(
        id=ver.id,
        rca_id=ver.rca_id,
        version_number=ver.version_number,
        snapshot_data=ver.snapshot_data,
        changelog=ver.changelog,
        author_id=ver.author_id,
        author_name=ver.author.full_name if ver.author else None,
        created_at=ver.created_at,
    )


# ==============================================================================
# Preventative Action Items Management
# ==============================================================================

@router.get("/{rca_id}/action-items", response_model=List[RCAActionItemRead])
async def list_action_items(
    rca_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List preventative action items for an RCA."""
    res = await db.execute(
        select(RCAActionItem)
        .options(selectinload(RCAActionItem.assignee))
        .where(RCAActionItem.rca_id == rca_id, RCAActionItem.organization_id == user.organization_id)
        .order_by(RCAActionItem.created_at.asc())
    )
    items = res.scalars().all()
    return [
        RCAActionItemRead(
            id=item.id,
            rca_id=item.rca_id,
            title=item.title,
            priority=item.priority,
            status=item.status,
            due_date=item.due_date,
            assignee_id=item.assignee_id,
            assignee_name=item.assignee.full_name if item.assignee else None,
            assignee_avatar=item.assignee.avatar_url if item.assignee else None,
            organization_id=item.organization_id,
            created_at=item.created_at,
            updated_at=item.updated_at,
        )
        for item in items
    ]


@router.post("/{rca_id}/action-items", response_model=RCAActionItemRead, status_code=status.HTTP_201_CREATED)
async def create_action_item(
    rca_id: str,
    payload: RCAActionItemCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new preventative action item linked to an RCA."""
    # Verify RCA exists
    r_res = await db.execute(
        select(RCA).where(RCA.id == rca_id, RCA.organization_id == user.organization_id)
    )
    if not r_res.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "rca_not_found", "message": "Root Cause Analysis not found"}},
        )

    action_id = f"act_{uuid.uuid4().hex[:8]}"
    new_item = RCAActionItem(
        id=action_id,
        rca_id=rca_id,
        title=payload.title.strip(),
        priority=payload.priority.lower().strip(),
        status=payload.status.lower().strip(),
        due_date=payload.due_date,
        assignee_id=payload.assignee_id,
        organization_id=user.organization_id,
        created_at=_now_utc(),
    )
    db.add(new_item)
    await db.commit()

    # Re-query with assignee loaded
    res = await db.execute(
        select(RCAActionItem)
        .options(selectinload(RCAActionItem.assignee))
        .where(RCAActionItem.id == action_id)
    )
    loaded_item = res.scalars().first()

    await ws_manager.broadcast(
        user.organization_id,
        "rca.action_item_updated",
        {"rca_id": rca_id, "action_id": action_id, "title": new_item.title},
    )

    return RCAActionItemRead(
        id=loaded_item.id,
        rca_id=loaded_item.rca_id,
        title=loaded_item.title,
        priority=loaded_item.priority,
        status=loaded_item.status,
        due_date=loaded_item.due_date,
        assignee_id=loaded_item.assignee_id,
        assignee_name=loaded_item.assignee.full_name if loaded_item.assignee else None,
        assignee_avatar=loaded_item.assignee.avatar_url if loaded_item.assignee else None,
        organization_id=loaded_item.organization_id,
        created_at=loaded_item.created_at,
        updated_at=loaded_item.updated_at,
    )


@router.patch("/{rca_id}/action-items/{item_id}", response_model=RCAActionItemRead)
async def update_action_item(
    rca_id: str,
    item_id: str,
    payload: RCAActionItemUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update preventative action item status, priority, or assignee."""
    res = await db.execute(
        select(RCAActionItem)
        .options(selectinload(RCAActionItem.assignee))
        .where(
            RCAActionItem.id == item_id,
            RCAActionItem.rca_id == rca_id,
            RCAActionItem.organization_id == user.organization_id,
        )
    )
    item = res.scalars().first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "action_item_not_found", "message": "Action item not found"}},
        )

    if payload.title is not None:
        item.title = payload.title.strip()
    if payload.priority is not None:
        item.priority = payload.priority.lower().strip()
    if payload.status is not None:
        item.status = payload.status.lower().strip()
    if payload.due_date is not None:
        item.due_date = payload.due_date
    if payload.assignee_id is not None:
        item.assignee_id = payload.assignee_id

    item.updated_at = _now_utc()
    await db.commit()
    await db.refresh(item)

    await ws_manager.broadcast(
        user.organization_id,
        "rca.action_item_updated",
        {"rca_id": rca_id, "action_id": item.id, "status": item.status},
    )

    return RCAActionItemRead(
        id=item.id,
        rca_id=item.rca_id,
        title=item.title,
        priority=item.priority,
        status=item.status,
        due_date=item.due_date,
        assignee_id=item.assignee_id,
        assignee_name=item.assignee.full_name if item.assignee else None,
        assignee_avatar=item.assignee.avatar_url if item.assignee else None,
        organization_id=item.organization_id,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.delete("/{rca_id}/action-items/{item_id}", response_model=MessageResponse)
async def delete_action_item(
    rca_id: str,
    item_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a preventative action item."""
    res = await db.execute(
        select(RCAActionItem).where(
            RCAActionItem.id == item_id,
            RCAActionItem.rca_id == rca_id,
            RCAActionItem.organization_id == user.organization_id,
        )
    )
    item = res.scalars().first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "action_item_not_found", "message": "Action item not found"}},
        )

    await db.delete(item)
    await db.commit()

    return MessageResponse(message="Action item removed successfully")
