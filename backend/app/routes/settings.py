from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database import get_db
from backend.app.dependencies import get_current_user_id
from backend.app.models import Organization

router = APIRouter()

# Default SLA state for workspace governance
_SLA_CONFIG: Dict[str, Any] = {
    "working_schedule": "24x7 Continuous Tier-1 Operations",
    "timezone": "America/New_York (UTC-05:00)",
    "holidays_observed": 10,
    "pause_on_hold": True,
    "p0_response": "15 minutes",
    "p0_resolution": "2 hours",
    "p0_auto_page": True,
    "p1_response": "30 minutes",
    "p1_resolution": "4 hours",
    "p1_auto_escalate": True,
    "p2_response": "1 hour",
    "p2_resolution": "8 hours",
    "p2_round_robin": True,
}

_NOTIFICATION_CONFIG: Dict[str, Any] = {
    "sync_pagerduty": True,
    "p0_created": {"email": True, "in_app": True, "slack": True},
    "sla_approaching": {"email": False, "in_app": True, "slack": True},
    "sla_breached": {"email": True, "in_app": True, "slack": True},
    "ticket_assigned": {"email": True, "in_app": True, "slack": False},
    "mention_discussion": {"email": False, "in_app": True, "slack": True},
}

_APPEARANCE_CONFIG: Dict[str, Any] = {
    "theme": "dark",
    "accent_color": "#6040F0",
    "density": "comfortable",
    "high_contrast": False,
    "compact_tables": False,
}


class WorkspaceSettingsUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None


@router.get("/workspace")
async def get_workspace_settings(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Retrieve workspace general configuration and branding."""
    res = await db.execute(select(Organization))
    org = res.scalars().first()
    return {
        "organization_id": org.id if org else "org_01",
        "name": org.name if org else "Acme Tech",
        "slug": org.slug if org else "acme-tech",
        "theme": "dark",
        "timezone": "UTC",
        "date_format": "YYYY-MM-DD",
        "retention_days": 90,
    }


@router.patch("/workspace")
async def update_workspace_settings(
    payload: WorkspaceSettingsUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Update workspace parameters."""
    res = await db.execute(select(Organization))
    org = res.scalars().first()
    if org:
        if payload.name:
            org.name = payload.name.strip()
        if payload.slug:
            org.slug = payload.slug.strip().lower()
        await db.commit()
    return {
        "status": "updated",
        "name": org.name if org else "Acme Tech",
        "slug": org.slug if org else "acme-tech",
    }


@router.get("/sla")
async def get_sla_configuration(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Retrieve current SLA policy engine and threshold settings."""
    return _SLA_CONFIG


@router.patch("/sla")
async def update_sla_configuration(
    payload: Dict[str, Any],
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Update SLA policy engine configuration."""
    _SLA_CONFIG.update(payload)
    return {"status": "success", "config": _SLA_CONFIG}


@router.get("/notifications")
async def get_notification_preferences(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Retrieve omnichannel notification and broadcast rules."""
    return _NOTIFICATION_CONFIG


@router.patch("/notifications")
async def update_notification_preferences(
    payload: Dict[str, Any],
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Update notification preferences."""
    _NOTIFICATION_CONFIG.update(payload)
    return {"status": "success", "config": _NOTIFICATION_CONFIG}


@router.get("/appearance")
async def get_appearance_settings(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Retrieve theme and visual display preferences."""
    return _APPEARANCE_CONFIG


@router.patch("/appearance")
async def update_appearance_settings(
    payload: Dict[str, Any],
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Update appearance and theme settings."""
    _APPEARANCE_CONFIG.update(payload)
    return {"status": "success", "config": _APPEARANCE_CONFIG}
