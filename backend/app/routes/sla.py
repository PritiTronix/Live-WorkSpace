import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError, jwt

from backend.app.core.config import settings
from backend.app.core.websockets import ws_manager
from backend.app.database import get_db
from backend.app.dependencies import get_current_user
from backend.app.models import User, SLAPolicy, SLARule, SLATimer, SLAEscalation, Ticket
from backend.app.schemas import (
    SLAPolicyCreate,
    SLAPolicyUpdate,
    SLAPolicyRead,
    SLARuleCreate,
    SLARuleUpdate,
    SLARuleRead,
    SLATimerRead,
    SLAEscalationRead,
    SLAOverviewMetrics,
    AcknowledgeBreachRequest,
    MessageResponse,
)

logger = logging.getLogger("sla.routes")
router = APIRouter()


def _require_admin(user: User):
    """Enforce admin or owner role for SLA policy governance."""
    if user.role.lower() not in ("owner", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "insufficient_permissions", "message": "Only workspace administrators can modify SLA policies and rules."}},
        )


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


# ==============================================================================
# SLA Overview & Metrics
# ==============================================================================

@router.get("/overview", response_model=SLAOverviewMetrics)
async def get_sla_overview(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve SLA compliance metrics, real-time active timers, and escalation history."""
    org_id = user.organization_id

    # Query timers for this organization
    timers_res = await db.execute(
        select(SLATimer)
        .where(SLATimer.organization_id == org_id)
        .order_by(desc(SLATimer.created_at))
        .limit(100)
    )
    timers = timers_res.scalars().all()

    # Query escalations for this organization
    esc_res = await db.execute(
        select(SLAEscalation)
        .options(selectinload(SLAEscalation.acknowledged_by))
        .where(SLAEscalation.organization_id == org_id)
        .order_by(desc(SLAEscalation.created_at))
        .limit(50)
    )
    escalations = esc_res.scalars().all()

    # Compute metrics
    total_timers = len(timers)
    breached_count = sum(1 for t in timers if t.status == "breached")
    at_risk_count = sum(1 for t in timers if t.status == "at_risk")
    active_timers = sum(1 for t in timers if t.status in ("on_track", "at_risk"))

    if total_timers > 0:
        compliance_rate = round(((total_timers - breached_count) / total_timers) * 100, 1)
    else:
        compliance_rate = 100.0

    timer_reads: List[SLATimerRead] = []
    for t in timers:
        timer_reads.append(
            SLATimerRead(
                id=t.id,
                ticket_id=t.ticket_id,
                policy_id=t.policy_id,
                rule_id=t.rule_id,
                timer_type=t.timer_type,
                status=t.status,
                started_at=t.started_at,
                target_at=t.target_at,
                breached_at=t.breached_at,
                fulfilled_at=t.fulfilled_at,
                paused_at=t.paused_at,
                elapsed_seconds=t.elapsed_seconds,
                organization_id=t.organization_id,
                created_at=t.created_at,
            )
        )

    escalation_reads: List[SLAEscalationRead] = []
    for e in escalations:
        escalation_reads.append(
            SLAEscalationRead(
                id=e.id,
                timer_id=e.timer_id,
                ticket_id=e.ticket_id,
                escalation_tier=e.escalation_tier,
                reason=e.reason,
                acknowledged=e.acknowledged,
                acknowledged_by_id=e.acknowledged_by_id,
                acknowledged_by_name=e.acknowledged_by.full_name if e.acknowledged_by else None,
                acknowledged_at=e.acknowledged_at,
                created_at=e.created_at,
            )
        )

    return SLAOverviewMetrics(
        compliance_rate=compliance_rate,
        active_timers=active_timers,
        at_risk_count=at_risk_count,
        breached_count=breached_count,
        timers=timer_reads,
        escalations=escalation_reads,
    )


# ==============================================================================
# SLA Policies Management
# ==============================================================================

@router.get("/policies", response_model=List[SLAPolicyRead])
async def list_sla_policies(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all SLA Policies configured for the user's organization."""
    res = await db.execute(
        select(SLAPolicy)
        .options(selectinload(SLAPolicy.rules))
        .where(SLAPolicy.organization_id == user.organization_id)
        .order_by(SLAPolicy.name.asc())
    )
    return res.scalars().all()


@router.post("/policies", response_model=SLAPolicyRead, status_code=status.HTTP_201_CREATED)
async def create_sla_policy(
    payload: SLAPolicyCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new SLA Policy with optional nested rules (Admin only)."""
    _require_admin(user)

    policy_id = f"sla_{uuid.uuid4().hex[:8]}"
    new_policy = SLAPolicy(
        id=policy_id,
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
        tier=payload.tier.lower().strip(),
        business_hours_only=payload.business_hours_only,
        is_active=payload.is_active,
        organization_id=user.organization_id,
        created_at=_now_utc(),
    )
    db.add(new_policy)
    await db.flush()

    if payload.rules:
        for r in payload.rules:
            rule_id = f"rule_{uuid.uuid4().hex[:8]}"
            rule_obj = SLARule(
                id=rule_id,
                policy_id=policy_id,
                priority=r.priority.lower().strip(),
                response_time_minutes=r.response_time_minutes,
                resolution_time_minutes=r.resolution_time_minutes,
                escalation_tier=r.escalation_tier.lower().strip(),
                organization_id=user.organization_id,
                created_at=_now_utc(),
            )
            db.add(rule_obj)

    await db.commit()

    # Re-query with rules loaded
    res = await db.execute(
        select(SLAPolicy)
        .options(selectinload(SLAPolicy.rules))
        .where(SLAPolicy.id == policy_id)
    )
    policy_loaded = res.scalars().first()

    # Real-time notification
    await ws_manager.broadcast(
        user.organization_id,
        "sla.policy_created",
        {"policy_id": policy_id, "name": new_policy.name},
    )

    return policy_loaded


@router.get("/policies/{policy_id}", response_model=SLAPolicyRead)
async def get_sla_policy(
    policy_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve single SLA policy by ID."""
    res = await db.execute(
        select(SLAPolicy)
        .options(selectinload(SLAPolicy.rules))
        .where(SLAPolicy.id == policy_id, SLAPolicy.organization_id == user.organization_id)
    )
    policy = res.scalars().first()
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "policy_not_found", "message": "SLA Policy not found"}},
        )
    return policy


@router.put("/policies/{policy_id}", response_model=SLAPolicyRead)
async def update_sla_policy(
    policy_id: str,
    payload: SLAPolicyUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an SLA Policy (Admin only)."""
    _require_admin(user)

    res = await db.execute(
        select(SLAPolicy)
        .options(selectinload(SLAPolicy.rules))
        .where(SLAPolicy.id == policy_id, SLAPolicy.organization_id == user.organization_id)
    )
    policy = res.scalars().first()
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "policy_not_found", "message": "SLA Policy not found"}},
        )

    if payload.name is not None:
        policy.name = payload.name.strip()
    if payload.description is not None:
        policy.description = payload.description.strip()
    if payload.tier is not None:
        policy.tier = payload.tier.lower().strip()
    if payload.business_hours_only is not None:
        policy.business_hours_only = payload.business_hours_only
    if payload.is_active is not None:
        policy.is_active = payload.is_active

    policy.updated_at = _now_utc()
    await db.commit()
    await db.refresh(policy)

    await ws_manager.broadcast(
        user.organization_id,
        "sla.policy_updated",
        {"policy_id": policy.id, "name": policy.name},
    )

    return policy


@router.delete("/policies/{policy_id}", response_model=MessageResponse)
async def delete_sla_policy(
    policy_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an SLA Policy and its nested rules (Admin only)."""
    _require_admin(user)

    res = await db.execute(
        select(SLAPolicy).where(SLAPolicy.id == policy_id, SLAPolicy.organization_id == user.organization_id)
    )
    policy = res.scalars().first()
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "policy_not_found", "message": "SLA Policy not found"}},
        )

    await db.delete(policy)
    await db.commit()

    await ws_manager.broadcast(
        user.organization_id,
        "sla.policy_deleted",
        {"policy_id": policy_id},
    )

    return MessageResponse(message="SLA Policy deleted successfully")


# ==============================================================================
# SLA Rules Management
# ==============================================================================

@router.post("/policies/{policy_id}/rules", response_model=SLARuleRead, status_code=status.HTTP_201_CREATED)
async def add_sla_rule(
    policy_id: str,
    payload: SLARuleCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a priority rule to an existing SLA Policy (Admin only)."""
    _require_admin(user)

    res = await db.execute(
        select(SLAPolicy).where(SLAPolicy.id == policy_id, SLAPolicy.organization_id == user.organization_id)
    )
    policy = res.scalars().first()
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "policy_not_found", "message": "SLA Policy not found"}},
        )

    rule_id = f"rule_{uuid.uuid4().hex[:8]}"
    new_rule = SLARule(
        id=rule_id,
        policy_id=policy_id,
        priority=payload.priority.lower().strip(),
        response_time_minutes=payload.response_time_minutes,
        resolution_time_minutes=payload.resolution_time_minutes,
        escalation_tier=payload.escalation_tier.lower().strip(),
        organization_id=user.organization_id,
        created_at=_now_utc(),
    )
    db.add(new_rule)
    await db.commit()
    await db.refresh(new_rule)

    return new_rule


@router.put("/rules/{rule_id}", response_model=SLARuleRead)
async def update_sla_rule(
    rule_id: str,
    payload: SLARuleUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an SLA Rule's thresholds or escalation tier (Admin only)."""
    _require_admin(user)

    res = await db.execute(
        select(SLARule).where(SLARule.id == rule_id, SLARule.organization_id == user.organization_id)
    )
    rule = res.scalars().first()
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "rule_not_found", "message": "SLA Rule not found"}},
        )

    if payload.priority is not None:
        rule.priority = payload.priority.lower().strip()
    if payload.response_time_minutes is not None:
        rule.response_time_minutes = payload.response_time_minutes
    if payload.resolution_time_minutes is not None:
        rule.resolution_time_minutes = payload.resolution_time_minutes
    if payload.escalation_tier is not None:
        rule.escalation_tier = payload.escalation_tier.lower().strip()

    await db.commit()
    await db.refresh(rule)
    return rule


@router.delete("/rules/{rule_id}", response_model=MessageResponse)
async def delete_sla_rule(
    rule_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an SLA Rule (Admin only)."""
    _require_admin(user)

    res = await db.execute(
        select(SLARule).where(SLARule.id == rule_id, SLARule.organization_id == user.organization_id)
    )
    rule = res.scalars().first()
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "rule_not_found", "message": "SLA Rule not found"}},
        )

    await db.delete(rule)
    await db.commit()
    return MessageResponse(message="SLA Rule deleted successfully")


# ==============================================================================
# SLA Breaches & Escalations
# ==============================================================================

@router.get("/breaches", response_model=List[SLATimerRead])
async def list_active_breaches(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all active breached SLA timers requiring triage."""
    res = await db.execute(
        select(SLATimer)
        .where(SLATimer.organization_id == user.organization_id, SLATimer.status == "breached")
        .order_by(desc(SLATimer.breached_at))
    )
    timers = res.scalars().all()
    reads: List[SLATimerRead] = []
    for t in timers:
        reads.append(
            SLATimerRead(
                id=t.id,
                ticket_id=t.ticket_id,
                policy_id=t.policy_id,
                rule_id=t.rule_id,
                timer_type=t.timer_type,
                status=t.status,
                started_at=t.started_at,
                target_at=t.target_at,
                breached_at=t.breached_at,
                fulfilled_at=t.fulfilled_at,
                paused_at=t.paused_at,
                elapsed_seconds=t.elapsed_seconds,
                organization_id=t.organization_id,
                created_at=t.created_at,
            )
        )
    return reads


@router.get("/escalations", response_model=List[SLAEscalationRead])
async def list_sla_escalations(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List historical and active SLA escalations for the organization."""
    res = await db.execute(
        select(SLAEscalation)
        .options(selectinload(SLAEscalation.acknowledged_by))
        .where(SLAEscalation.organization_id == user.organization_id)
        .order_by(desc(SLAEscalation.created_at))
    )
    escalations = res.scalars().all()
    reads: List[SLAEscalationRead] = []
    for e in escalations:
        reads.append(
            SLAEscalationRead(
                id=e.id,
                timer_id=e.timer_id,
                ticket_id=e.ticket_id,
                escalation_tier=e.escalation_tier,
                reason=e.reason,
                acknowledged=e.acknowledged,
                acknowledged_by_id=e.acknowledged_by_id,
                acknowledged_by_name=e.acknowledged_by.full_name if e.acknowledged_by else None,
                acknowledged_at=e.acknowledged_at,
                created_at=e.created_at,
            )
        )
    return reads


@router.post("/breaches/{timer_id}/acknowledge", response_model=MessageResponse)
async def acknowledge_sla_breach(
    timer_id: str,
    payload: Optional[AcknowledgeBreachRequest] = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Acknowledge an SLA breach alarm and mark associated escalations as handled."""
    now = _now_utc()

    # Find timer
    t_res = await db.execute(
        select(SLATimer).where(SLATimer.id == timer_id, SLATimer.organization_id == user.organization_id)
    )
    timer = t_res.scalars().first()

    # Find any unacknowledged escalations
    esc_res = await db.execute(
        select(SLAEscalation).where(
            SLAEscalation.timer_id == timer_id,
            SLAEscalation.organization_id == user.organization_id,
            SLAEscalation.acknowledged == False,
        )
    )
    escalations = esc_res.scalars().all()
    for e in escalations:
        e.acknowledged = True
        e.acknowledged_by_id = user.id
        e.acknowledged_at = now

    await db.commit()

    # Real-time event
    await ws_manager.broadcast(
        user.organization_id,
        "sla.breach_acknowledged",
        {"timer_id": timer_id, "acknowledged_by": user.full_name},
    )

    return MessageResponse(message="SLA breach acknowledged successfully")


# ==============================================================================
# Authenticated SLA WebSocket Channel
# ==============================================================================

@router.websocket("/ws")
async def sla_websocket_endpoint(websocket: WebSocket, token: str = Query(None)):
    """Authenticated WebSocket stream for real-time SLA breach alerts and timer updates."""
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing token")
        return

    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token payload")
            return
    except JWTError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
        return

    # Check database connectivity lazily for user organization
    from backend.app.database import get_session_factory
    factory = get_session_factory()
    if not factory:
        await websocket.close(code=status.WS_1013_TRY_AGAIN_LATER, reason="database_unavailable")
        return

    org_id = "org_01"
    try:
        async with factory() as session:
            res = await session.execute(select(User).where(User.id == user_id))
            user = res.scalars().first()
            if not user or not user.is_active:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Unauthorized")
                return
            if user.organization_id:
                org_id = user.organization_id
    except Exception:
        await websocket.close(code=status.WS_1013_TRY_AGAIN_LATER, reason="database_unavailable")
        return

    await ws_manager.connect(websocket, org_id)
    try:
        while True:
            # Keepalive listener
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, org_id)
    except Exception:
        ws_manager.disconnect(websocket, org_id)
