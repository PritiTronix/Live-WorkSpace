"""
Organizations router — Enterprise Multi-Tenant Workspace Management.
Handles organization onboarding, owner creation, join codes, join requests, and approval workflows.
"""
from __future__ import annotations

import re
import html
import uuid
import time
import secrets
import hashlib
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select, func, update, and_, desc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.database import get_db
from backend.app.dependencies import get_current_active_user
from backend.app.models import (
    Organization, User, Membership, OrganizationJoinCode,
    JoinRequest, AuditLog, Notification, WorkspaceSetting
)
from backend.app.schemas import (
    OrganizationCreateRequest, OrganizationRead,
    JoinCodeLookupRequest, JoinCodeLookupResponse,
    JoinRequestCreate, JoinRequestRead, JoinRequestUser,
    JoinRequestDecision, JoinRequestPaginatedResponse,
    JoinCodeCreate, JoinCodeRead
)
from backend.app.core.websockets import ws_manager

router = APIRouter()

# Unambiguous alphabet: no 0, O, 1, I, l
JOIN_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"

# In-memory sliding window rate limiter for join attempts per (user, IP)
_join_rate_limit_history: dict[str, list[float]] = defaultdict(list)
_RATE_LIMIT_MAX_ATTEMPTS = 5
_RATE_LIMIT_WINDOW_SECONDS = 60


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _generate_join_code(length: int = 10) -> str:
    """Generate ~10-character code from unambiguous alphabet using secrets module."""
    return "".join(secrets.choice(JOIN_CODE_ALPHABET) for _ in range(length))


def _hash_join_code(code: str) -> str:
    """Deterministic cryptographic hash for join code storage and lookup."""
    return hashlib.sha256(code.strip().upper().encode("utf-8")).hexdigest()


def _get_client_ip(request: Request) -> str:
    cf_ip = request.headers.get("cf-connecting-ip")
    if cf_ip:
        return cf_ip.strip()
    x_real_ip = request.headers.get("x-real-ip")
    if x_real_ip:
        return x_real_ip.strip()
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def _check_join_rate_limit(user_id: str, client_ip: str) -> None:
    """Enforces rate limiting on /organizations/join per user and per IP."""
    now = time.time()
    cutoff = now - _RATE_LIMIT_WINDOW_SECONDS

    for key in (f"user:{user_id}", f"ip:{client_ip}"):
        timestamps = [t for t in _join_rate_limit_history[key] if t > cutoff]
        _join_rate_limit_history[key] = timestamps
        if len(timestamps) >= _RATE_LIMIT_MAX_ATTEMPTS:
            oldest = timestamps[0]
            retry_after = max(1, int(_RATE_LIMIT_WINDOW_SECONDS - (now - oldest)))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "code": "rate_limited",
                    "message": "Too many join attempts. Please slow down and try again later.",
                },
                headers={"Retry-After": str(retry_after)},
            )
        _join_rate_limit_history[key].append(now)


async def _verify_org_admin_or_owner(organization_id: str, user: User, db: AsyncSession) -> Membership:
    """Server-side authorization: user must have active owner or admin membership in organization."""
    res = await db.execute(
        select(Membership).where(
            Membership.organization_id == organization_id,
            Membership.user_id == user.id,
            Membership.status == "active",
            Membership.role.in_(["owner", "admin"]),
        )
    )
    membership = res.scalars().first()
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "forbidden",
                "message": "Operation requires owner or admin permissions in this organization.",
            },
        )
    return membership


# ---------------------------------------------------------------------------
# 1. POST /organizations: Create Organization (Owner Path)
# ---------------------------------------------------------------------------
@router.post("", response_model=OrganizationRead, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=OrganizationRead, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_organization(
    payload: OrganizationCreateRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticated, email-verified user creates an organization and becomes its owner.
    Creates the organization plus owner membership in one transaction.
    """
    # 1. Require email verification
    if not current_user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "email_verification_required",
                "message": "Email verification is required before creating an organization.",
            },
        )

    # 2. Validate and sanitize name
    name_clean = payload.name.strip()
    if len(name_clean) < 2 or len(name_clean) > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_name",
                "message": "Organization name must be between 2 and 100 characters.",
            },
        )

    # 3. Generate unique slug
    base_slug = re.sub(r"[^a-z0-9]+", "-", name_clean.lower()).strip("-")
    if not base_slug:
        base_slug = "org"

    slug = base_slug
    suffix = 1
    while True:
        existing = await db.execute(select(Organization.id).where(Organization.slug == slug))
        if not existing.scalars().first():
            break
        suffix += 1
        slug = f"{base_slug}-{suffix}"

    now = _utc_now()
    org_id = f"org_{uuid.uuid4().hex[:8]}"

    # 4. Create Organization
    new_org = Organization(
        id=org_id,
        name=name_clean,
        slug=slug,
        industry=payload.industry.strip() if payload.industry else None,
        size_range=payload.size_range.strip() if payload.size_range else None,
        logo_path=payload.logo_path.strip() if payload.logo_path else None,
        plan=payload.plan.strip().lower() if payload.plan else None,
        created_by=current_user.id,
        created_at=now,
        updated_at=now,
    )
    db.add(new_org)
    await db.flush()

    # 5. Create Owner Membership
    owner_membership = Membership(
        id=f"mem_{uuid.uuid4().hex[:8]}",
        user_id=current_user.id,
        organization_id=new_org.id,
        role="owner",
        status="active",
        joined_at=now,
    )
    db.add(owner_membership)

    # 6. Update User primary organization context
    current_user.organization_id = new_org.id
    current_user.role = "owner"

    # 7. Default workspace settings
    setting = WorkspaceSetting(
        organization_id=new_org.id,
        working_schedule="24x7 Continuous Tier-1 Operations",
        timezone="UTC",
        holidays_observed=10,
        pause_on_hold=True,
    )
    db.add(setting)

    # 8. Audit Log
    audit = AuditLog(
        id=f"aud_{uuid.uuid4().hex[:8]}",
        organization_id=new_org.id,
        actor_id=current_user.id,
        action="organization_created",
        details=f"Organization created with slug '{slug}'",
        created_at=now,
    )
    db.add(audit)

    await db.commit()
    await db.refresh(new_org)
    return new_org


# ---------------------------------------------------------------------------
# 2. POST /organizations/join/lookup: Public lookup by join code
# ---------------------------------------------------------------------------
@router.post("/join/lookup", response_model=JoinCodeLookupResponse)
async def lookup_join_code(
    payload: JoinCodeLookupRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Looks up public organization details by join code.
    Invalid, expired, and revoked codes return the exact same 404 response.
    """
    clean_code = payload.code.strip()
    code_hash = _hash_join_code(clean_code)
    now = _utc_now()

    res = await db.execute(
        select(OrganizationJoinCode)
        .options(selectinload(OrganizationJoinCode.organization))
        .where(OrganizationJoinCode.code_hash == code_hash)
    )
    join_code = res.scalars().first()

    not_found_exc = HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={
            "code": "not_found",
            "message": "Invalid, expired, or revoked join code.",
        },
    )

    if not join_code:
        raise not_found_exc

    # Constant-time hash verification
    if not secrets.compare_digest(join_code.code_hash, code_hash):
        raise not_found_exc

    # Check revoked
    if join_code.revoked_at is not None:
        raise not_found_exc

    # Check expired
    if join_code.expires_at is not None:
        exp = join_code.expires_at if join_code.expires_at.tzinfo else join_code.expires_at.replace(tzinfo=timezone.utc)
        if exp < now:
            raise not_found_exc

    # Check max uses
    if join_code.max_uses is not None and join_code.use_count >= join_code.max_uses:
        raise not_found_exc

    if not join_code.organization:
        raise not_found_exc

    return JoinCodeLookupResponse(
        name=join_code.organization.name,
        logo_path=join_code.organization.logo_path,
    )


# ---------------------------------------------------------------------------
# 3. POST /organizations/join: Request to join via join code (Employee Path)
# ---------------------------------------------------------------------------
@router.post("/join", response_model=JoinRequestRead, status_code=status.HTTP_201_CREATED)
async def join_organization(
    payload: JoinRequestCreate,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submits a pending join request using an organization join code.
    Enforces rate limits (429), max 3 pending requests, and duplicate checks.
    Notifies owner and admins in-app and via WebSocket.
    """
    client_ip = _get_client_ip(request)
    _check_join_rate_limit(current_user.id, client_ip)

    clean_code = payload.code.strip()
    code_hash = _hash_join_code(clean_code)
    now = _utc_now()

    # Look up join code
    res = await db.execute(
        select(OrganizationJoinCode)
        .options(selectinload(OrganizationJoinCode.organization))
        .where(OrganizationJoinCode.code_hash == code_hash)
    )
    join_code = res.scalars().first()

    not_found_exc = HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={
            "code": "not_found",
            "message": "Invalid, expired, or revoked join code.",
        },
    )

    if not join_code or not secrets.compare_digest(join_code.code_hash, code_hash):
        raise not_found_exc
    if join_code.revoked_at is not None:
        raise not_found_exc
    if join_code.expires_at is not None:
        exp = join_code.expires_at if join_code.expires_at.tzinfo else join_code.expires_at.replace(tzinfo=timezone.utc)
        if exp < now:
            raise not_found_exc
    if join_code.max_uses is not None and join_code.use_count >= join_code.max_uses:
        raise not_found_exc

    org_id = join_code.organization_id

    # Check if user already belongs to this organization
    existing_mem = await db.execute(
        select(Membership).where(
            Membership.user_id == current_user.id,
            Membership.organization_id == org_id,
            Membership.status.in_(["active", "suspended"]),
        )
    )
    if existing_mem.scalars().first() or current_user.organization_id == org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "already_member",
                "message": "You are already a member of this organization.",
            },
        )

    # Check if a pending join request already exists for this (user, organization)
    dup_res = await db.execute(
        select(JoinRequest).where(
            JoinRequest.user_id == current_user.id,
            JoinRequest.organization_id == org_id,
            JoinRequest.status == "pending",
        )
    )
    if dup_res.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "duplicate_pending_request",
                "message": "A pending join request for this organization already exists.",
            },
        )

    # Check max 3 pending requests across all organizations
    pending_count_res = await db.execute(
        select(func.count(JoinRequest.id)).where(
            JoinRequest.user_id == current_user.id,
            JoinRequest.status == "pending",
        )
    )
    pending_count = pending_count_res.scalar() or 0
    if pending_count >= 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "pending_limit_exceeded",
                "message": "You cannot have more than 3 pending join requests at a time.",
            },
        )

    # Sanitize message if provided
    clean_msg = None
    if payload.message:
        clean_msg = html.escape(payload.message.strip()[:500])

    join_req = JoinRequest(
        id=f"jr_{uuid.uuid4().hex[:8]}",
        user_id=current_user.id,
        organization_id=org_id,
        status="pending",
        message=clean_msg,
        created_at=now,
    )
    db.add(join_req)
    join_code.use_count += 1

    # In-app notifications for owner and admins
    admins_res = await db.execute(
        select(Membership).where(
            Membership.organization_id == org_id,
            Membership.role.in_(["owner", "admin"]),
            Membership.status == "active",
        )
    )
    admin_memberships = admins_res.scalars().all()
    org_name = join_code.organization.name if join_code.organization else "the workspace"

    for admin in admin_memberships:
        notif = Notification(
            id=f"notif_{uuid.uuid4().hex[:8]}",
            user_id=admin.user_id,
            organization_id=org_id,
            type="join_request",
            title="New Join Request",
            body=f"{current_user.full_name} has requested to join {org_name}.",
            actor_id=current_user.id,
            target_id=join_req.id,
            target_type="join_request",
            target_route="/workspace/members?tab=join-requests",
            created_at=now,
        )
        db.add(notif)

    await db.commit()
    await db.refresh(join_req)

    # Broadcast via WebSocket
    await ws_manager.broadcast_to_workspace(
        org_id,
        {
            "event": "join_request_created",
            "request_id": join_req.id,
            "user_name": current_user.full_name,
        },
    )

    return JoinRequestRead(
        id=join_req.id,
        user_id=join_req.user_id,
        organization_id=join_req.organization_id,
        status=join_req.status,
        message=join_req.message,
        created_at=join_req.created_at,
        organization_name=org_name,
        organization_logo=join_code.organization.logo_path if join_code.organization else None,
        user=JoinRequestUser(
            id=current_user.id,
            full_name=current_user.full_name,
            email=current_user.email,
            avatar_url=current_user.avatar_url,
        ),
    )


# ---------------------------------------------------------------------------
# 4. GET /organizations/join-requests/mine: Current user's join requests
# ---------------------------------------------------------------------------
@router.get("/join-requests/mine", response_model=List[JoinRequestRead])
async def list_my_join_requests(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """List all join requests created by the authenticated user."""
    res = await db.execute(
        select(JoinRequest)
        .options(selectinload(JoinRequest.organization))
        .where(JoinRequest.user_id == current_user.id)
        .order_by(desc(JoinRequest.created_at))
    )
    requests = res.scalars().all()

    return [
        JoinRequestRead(
            id=r.id,
            user_id=r.user_id,
            organization_id=r.organization_id,
            status=r.status,
            message=r.message,
            created_at=r.created_at,
            decided_by=r.decided_by,
            decided_at=r.decided_at,
            decision_reason=r.decision_reason,
            organization_name=r.organization.name if r.organization else None,
            organization_logo=r.organization.logo_path if r.organization else None,
        )
        for r in requests
    ]


# ---------------------------------------------------------------------------
# 5. POST /organizations/join-requests/{id}/cancel: Cancel own pending request
# ---------------------------------------------------------------------------
@router.post("/join-requests/{request_id}/cancel", response_model=JoinRequestRead)
async def cancel_my_join_request(
    request_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a pending join request owned by the authenticated user."""
    res = await db.execute(
        select(JoinRequest)
        .options(selectinload(JoinRequest.organization))
        .where(JoinRequest.id == request_id, JoinRequest.user_id == current_user.id)
    )
    join_req = res.scalars().first()
    if not join_req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "not_found", "message": "Join request not found."},
        )

    if join_req.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "invalid_status",
                "message": f"Cannot cancel request with status '{join_req.status}'.",
            },
        )

    join_req.status = "cancelled"
    await db.commit()
    await db.refresh(join_req)

    return JoinRequestRead(
        id=join_req.id,
        user_id=join_req.user_id,
        organization_id=join_req.organization_id,
        status=join_req.status,
        message=join_req.message,
        created_at=join_req.created_at,
        organization_name=join_req.organization.name if join_req.organization else None,
    )


# ---------------------------------------------------------------------------
# 6. GET /organizations/{id}/join-requests: Owner/Admin view join requests
# ---------------------------------------------------------------------------
@router.get("/{org_id}/join-requests", response_model=JoinRequestPaginatedResponse)
async def list_org_join_requests(
    org_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """List join requests for an organization (owner or admin only)."""
    await _verify_org_admin_or_owner(org_id, current_user, db)

    base_filter = [JoinRequest.organization_id == org_id]
    if status_filter:
        base_filter.append(JoinRequest.status == status_filter.lower().strip())

    count_res = await db.execute(select(func.count(JoinRequest.id)).where(*base_filter))
    total = count_res.scalar() or 0

    query = (
        select(JoinRequest)
        .options(selectinload(JoinRequest.user), selectinload(JoinRequest.organization))
        .where(*base_filter)
        .order_by(desc(JoinRequest.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    res = await db.execute(query)
    requests = res.scalars().all()

    items = [
        JoinRequestRead(
            id=r.id,
            user_id=r.user_id,
            organization_id=r.organization_id,
            status=r.status,
            message=r.message,
            created_at=r.created_at,
            decided_by=r.decided_by,
            decided_at=r.decided_at,
            decision_reason=r.decision_reason,
            organization_name=r.organization.name if r.organization else None,
            organization_logo=r.organization.logo_path if r.organization else None,
            requester_name=r.user.full_name if r.user else None,
            requester_email=r.user.email if r.user else None,
            user=JoinRequestUser(
                id=r.user.id,
                full_name=r.user.full_name,
                email=r.user.email,
                avatar_url=r.user.avatar_url,
            ) if r.user else None,
        )
        for r in requests
    ]

    return JoinRequestPaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


# ---------------------------------------------------------------------------
# 7. POST /organizations/{id}/join-requests/{rid}/approve: Approve request
# ---------------------------------------------------------------------------
@router.post("/{org_id}/join-requests/{request_id}/approve", response_model=JoinRequestRead)
async def approve_join_request(
    org_id: str,
    request_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Approve a join request (owner or admin only).
    Creates member membership in the same transaction, sets primary organization if unassigned,
    writes audit log, and notifies requester.
    """
    await _verify_org_admin_or_owner(org_id, current_user, db)

    res = await db.execute(
        select(JoinRequest)
        .options(selectinload(JoinRequest.organization), selectinload(JoinRequest.user))
        .where(JoinRequest.id == request_id, JoinRequest.organization_id == org_id)
    )
    join_req = res.scalars().first()
    if not join_req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "not_found", "message": "Join request not found for this organization."},
        )

    if join_req.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "invalid_status", "message": f"Join request is already {join_req.status}."},
        )

    now = _utc_now()
    join_req.status = "approved"
    join_req.decided_by = current_user.id
    join_req.decided_at = now

    # Create or activate membership in memberships table
    mem_res = await db.execute(
        select(Membership).where(
            Membership.user_id == join_req.user_id,
            Membership.organization_id == org_id,
        )
    )
    membership = mem_res.scalars().first()
    if membership:
        membership.status = "active"
        membership.role = "member"
    else:
        membership = Membership(
            id=f"mem_{uuid.uuid4().hex[:8]}",
            user_id=join_req.user_id,
            organization_id=org_id,
            role="member",
            status="active",
            joined_at=now,
        )
        db.add(membership)

    # Sync User table: if applicant has no primary org, set it
    applicant_res = await db.execute(select(User).where(User.id == join_req.user_id))
    applicant = applicant_res.scalars().first()
    if applicant and not applicant.organization_id:
        applicant.organization_id = org_id
        applicant.role = "member"

    # Write audit log
    audit = AuditLog(
        id=f"aud_{uuid.uuid4().hex[:8]}",
        organization_id=org_id,
        actor_id=current_user.id,
        action="join_request_approved",
        details=f"Approved join request for applicant {join_req.user_id}",
        created_at=now,
    )
    db.add(audit)

    # In-app notification to requester
    org_name = join_req.organization.name if join_req.organization else "the workspace"
    notif = Notification(
        id=f"notif_{uuid.uuid4().hex[:8]}",
        user_id=join_req.user_id,
        organization_id=org_id,
        type="join_request_decided",
        title="Join Request Approved",
        body=f"Your request to join {org_name} has been approved.",
        actor_id=current_user.id,
        target_id=join_req.id,
        target_type="join_request",
        target_route="/dashboard",
        created_at=now,
    )
    db.add(notif)

    await db.commit()
    await db.refresh(join_req)

    # Broadcast notification to workspace
    await ws_manager.broadcast_to_workspace(
        org_id,
        {"event": "join_request_approved", "request_id": join_req.id, "user_id": join_req.user_id},
    )

    return JoinRequestRead(
        id=join_req.id,
        user_id=join_req.user_id,
        organization_id=join_req.organization_id,
        status=join_req.status,
        message=join_req.message,
        created_at=join_req.created_at,
        decided_by=join_req.decided_by,
        decided_at=join_req.decided_at,
        organization_name=org_name,
        requester_name=join_req.user.full_name if join_req.user else None,
        requester_email=join_req.user.email if join_req.user else None,
        user=JoinRequestUser(
            id=join_req.user.id,
            full_name=join_req.user.full_name,
            email=join_req.user.email,
            avatar_url=join_req.user.avatar_url,
        ) if join_req.user else None,
    )


# ---------------------------------------------------------------------------
# 8. POST /organizations/{id}/join-requests/{rid}/reject: Reject request
# ---------------------------------------------------------------------------
@router.post("/{org_id}/join-requests/{request_id}/reject", response_model=JoinRequestRead)
async def reject_join_request(
    org_id: str,
    request_id: str,
    payload: Optional[JoinRequestDecision] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Reject a join request (owner or admin only).
    Records decider, timestamp, optional reason, writes audit log, and notifies requester.
    """
    await _verify_org_admin_or_owner(org_id, current_user, db)

    res = await db.execute(
        select(JoinRequest)
        .options(selectinload(JoinRequest.organization), selectinload(JoinRequest.user))
        .where(JoinRequest.id == request_id, JoinRequest.organization_id == org_id)
    )
    join_req = res.scalars().first()
    if not join_req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "not_found", "message": "Join request not found for this organization."},
        )

    if join_req.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "invalid_status", "message": f"Join request is already {join_req.status}."},
        )

    now = _utc_now()
    clean_reason = None
    if payload and payload.decision_reason:
        clean_reason = html.escape(payload.decision_reason.strip()[:500])

    join_req.status = "rejected"
    join_req.decided_by = current_user.id
    join_req.decided_at = now
    join_req.decision_reason = clean_reason

    # Write audit log
    audit = AuditLog(
        id=f"aud_{uuid.uuid4().hex[:8]}",
        organization_id=org_id,
        actor_id=current_user.id,
        action="join_request_rejected",
        details=f"Rejected join request for applicant {join_req.user_id}",
        created_at=now,
    )
    db.add(audit)

    # In-app notification to requester
    org_name = join_req.organization.name if join_req.organization else "the workspace"
    notif = Notification(
        id=f"notif_{uuid.uuid4().hex[:8]}",
        user_id=join_req.user_id,
        organization_id=org_id,
        type="join_request_decided",
        title="Join Request Rejected",
        body=f"Your request to join {org_name} has been rejected.",
        actor_id=current_user.id,
        target_id=join_req.id,
        target_type="join_request",
        created_at=now,
    )
    db.add(notif)

    await db.commit()
    await db.refresh(join_req)

    return JoinRequestRead(
        id=join_req.id,
        user_id=join_req.user_id,
        organization_id=join_req.organization_id,
        status=join_req.status,
        message=join_req.message,
        created_at=join_req.created_at,
        decided_by=join_req.decided_by,
        decided_at=join_req.decided_at,
        decision_reason=join_req.decision_reason,
        organization_name=org_name,
        requester_name=join_req.user.full_name if join_req.user else None,
        requester_email=join_req.user.email if join_req.user else None,
        user=JoinRequestUser(
            id=join_req.user.id,
            full_name=join_req.user.full_name,
            email=join_req.user.email,
            avatar_url=join_req.user.avatar_url,
        ) if join_req.user else None,
    )


# ---------------------------------------------------------------------------
# 9. POST /organizations/{id}/join-code: Generate / Regenerate Join Code
# ---------------------------------------------------------------------------
@router.post("/{org_id}/join-code", response_model=JoinCodeRead)
async def generate_or_regenerate_join_code(
    org_id: str,
    payload: Optional[JoinCodeCreate] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate or regenerate join code (owner or admin only).
    Revokes any active existing code, generates unambiguous code, stores only hash,
    and returns plain text code once.
    """
    await _verify_org_admin_or_owner(org_id, current_user, db)

    now = _utc_now()

    # Revoke existing active codes for this organization
    await db.execute(
        update(OrganizationJoinCode)
        .where(
            OrganizationJoinCode.organization_id == org_id,
            OrganizationJoinCode.revoked_at.is_(None),
        )
        .values(revoked_at=now)
    )

    # Generate 10-char code from unambiguous alphabet
    plain_code = _generate_join_code(10)
    code_hash = _hash_join_code(plain_code)

    expires_at = None
    if payload and payload.expires_in_days:
        expires_at = now + timedelta(days=payload.expires_in_days)

    max_uses = payload.max_uses if payload else None

    join_code = OrganizationJoinCode(
        id=f"jc_{uuid.uuid4().hex[:8]}",
        organization_id=org_id,
        code_hash=code_hash,
        created_by=current_user.id,
        created_at=now,
        expires_at=expires_at,
        max_uses=max_uses,
        use_count=0,
    )
    db.add(join_code)

    # Audit log
    audit = AuditLog(
        id=f"aud_{uuid.uuid4().hex[:8]}",
        organization_id=org_id,
        actor_id=current_user.id,
        action="join_code_generated",
        details="Generated new organization join code",
        created_at=now,
    )
    db.add(audit)

    await db.commit()

    return JoinCodeRead(
        code=plain_code,
        expires_at=expires_at,
        max_uses=max_uses,
        created_at=now,
    )


# ---------------------------------------------------------------------------
# 10. DELETE /organizations/{id}/join-code: Revoke active join code
# ---------------------------------------------------------------------------
@router.delete("/{org_id}/join-code")
async def revoke_join_code(
    org_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Revoke all active join codes for an organization (owner or admin only)."""
    await _verify_org_admin_or_owner(org_id, current_user, db)

    now = _utc_now()
    await db.execute(
        update(OrganizationJoinCode)
        .where(
            OrganizationJoinCode.organization_id == org_id,
            OrganizationJoinCode.revoked_at.is_(None),
        )
        .values(revoked_at=now)
    )

    audit = AuditLog(
        id=f"aud_{uuid.uuid4().hex[:8]}",
        organization_id=org_id,
        actor_id=current_user.id,
        action="join_code_revoked",
        details="Revoked active organization join code",
        created_at=now,
    )
    db.add(audit)
    await db.commit()

    return {"message": "Organization join code successfully revoked."}
