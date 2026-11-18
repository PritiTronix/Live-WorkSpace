"""
Workspace Settings router — Enterprise Database Driven Implementation.
Persists workspace governance, SLA policies, notification channels, and appearance configs
in the WorkspaceSetting model, strictly isolated by tenant organization and protected by RBAC.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.database import get_db
from backend.app.dependencies import get_current_active_user, require_roles
from backend.app.models import Organization, WorkspaceSetting, User

router = APIRouter()


class WorkspaceSettingsUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    working_schedule: Optional[str] = None
    timezone: Optional[str] = None
    holidays_observed: Optional[int] = None
    pause_on_hold: Optional[bool] = None


async def _get_or_create_setting(org_id: str, db: AsyncSession) -> WorkspaceSetting:
    res = await db.execute(select(WorkspaceSetting).where(WorkspaceSetting.organization_id == org_id))
    setting = res.scalars().first()
    if not setting:
        setting = WorkspaceSetting(
            organization_id=org_id,
            working_schedule="24x7 Continuous Tier-1 Operations",
            timezone="UTC",
            holidays_observed=0,
            pause_on_hold=True,
            sla_config="{}",
            notification_config=json.dumps({
                "p0_created": {"email": True, "in_app": True, "slack": True},
                "sla_breached": {"email": True, "in_app": True, "slack": True},
            }),
            appearance_config=json.dumps({
                "theme": "dark",
                "accent_color": "#6040F0",
                "density": "comfortable",
                "high_contrast": False,
                "compact_tables": False,
            }),
        )
        db.add(setting)
        await db.commit()
    return setting


@router.get("/workspace")
async def get_workspace_settings(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Retrieve workspace general configuration and branding for tenant."""
    res = await db.execute(select(Organization).where(Organization.id == current_user.organization_id))
    org = res.scalars().first()
    setting = await _get_or_create_setting(current_user.organization_id, db)

    return {
        "organization_id": org.id if org else current_user.organization_id,
        "name": org.name if org else "Workspace",
        "slug": org.slug if org else "workspace",
        "working_schedule": setting.working_schedule,
        "timezone": setting.timezone,
        "holidays_observed": setting.holidays_observed,
        "pause_on_hold": setting.pause_on_hold,
        "theme": "dark",
        "date_format": "YYYY-MM-DD",
        "retention_days": 90,
    }


@router.patch("/workspace")
async def update_workspace_settings(
    payload: WorkspaceSettingsUpdate,
    current_user: User = Depends(require_roles(["owner", "admin"])),
    db: AsyncSession = Depends(get_db)
):
    """Update workspace parameters (Requires Admin or Owner role)."""
    res = await db.execute(select(Organization).where(Organization.id == current_user.organization_id))
    org = res.scalars().first()
    if org:
        if payload.name:
            org.name = payload.name.strip()
        if payload.slug:
            org.slug = payload.slug.strip().lower()

    setting = await _get_or_create_setting(current_user.organization_id, db)
    if payload.working_schedule is not None:
        setting.working_schedule = payload.working_schedule.strip()
    if payload.timezone is not None:
        setting.timezone = payload.timezone.strip()
    if payload.holidays_observed is not None:
        setting.holidays_observed = payload.holidays_observed
    if payload.pause_on_hold is not None:
        setting.pause_on_hold = payload.pause_on_hold

    setting.updated_at = datetime.now(timezone.utc)
    await db.commit()

    return {
        "status": "updated",
        "name": org.name if org else "Workspace",
        "slug": org.slug if org else "workspace",
        "working_schedule": setting.working_schedule,
        "timezone": setting.timezone,
    }


@router.get("/sla")
async def get_sla_configuration(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Retrieve current SLA policy engine and threshold settings scoped to user's organization."""
    res = await db.execute(
        select(WorkspaceSetting).where(WorkspaceSetting.organization_id == current_user.organization_id)
    )
    setting = res.scalars().first()
    if not setting or not setting.sla_config:
        return {"configured": False}

    try:
        cfg = json.loads(setting.sla_config)
    except Exception:
        cfg = {}

    if not cfg or not cfg.get("configured", False):
        return {"configured": False}

    cfg["working_schedule"] = cfg.get("working_schedule") or setting.working_schedule
    cfg["timezone"] = cfg.get("timezone") or setting.timezone
    cfg["holidays_observed"] = cfg.get("holidays_observed") if "holidays_observed" in cfg else setting.holidays_observed
    cfg["pause_on_hold"] = cfg.get("pause_on_hold") if "pause_on_hold" in cfg else setting.pause_on_hold
    return cfg


@router.patch("/sla")
async def update_sla_configuration(
    payload: Dict[str, Any],
    current_user: User = Depends(require_roles(["owner", "admin"])),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Update SLA policy engine configuration (Requires Admin or Owner role)."""
    res = await db.execute(
        select(WorkspaceSetting).where(WorkspaceSetting.organization_id == current_user.organization_id)
    )
    setting = res.scalars().first()
    if not setting:
        setting = WorkspaceSetting(organization_id=current_user.organization_id)
        db.add(setting)

    try:
        cfg = json.loads(setting.sla_config or "{}")
    except Exception:
        cfg = {}

    # Extract and update top-level scheduler fields if present
    if "working_schedule" in payload and payload["working_schedule"] is not None:
        setting.working_schedule = str(payload.pop("working_schedule")).strip()
    if "timezone" in payload and payload["timezone"] is not None:
        setting.timezone = str(payload.pop("timezone")).strip()
    if "holidays_observed" in payload and payload["holidays_observed"] is not None:
        setting.holidays_observed = int(payload.pop("holidays_observed"))
    if "pause_on_hold" in payload and payload["pause_on_hold"] is not None:
        setting.pause_on_hold = bool(payload.pop("pause_on_hold"))

    payload["configured"] = True
    cfg.update(payload)
    setting.sla_config = json.dumps(cfg)
    setting.updated_at = datetime.now(timezone.utc)
    await db.commit()

    cfg["working_schedule"] = setting.working_schedule
    cfg["timezone"] = setting.timezone
    cfg["holidays_observed"] = setting.holidays_observed
    cfg["pause_on_hold"] = setting.pause_on_hold
    return {"status": "success", "config": cfg}


@router.post("/sla")
async def create_sla_configuration(
    payload: Dict[str, Any],
    current_user: User = Depends(require_roles(["owner", "admin"])),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Create or initialize SLA policy (Requires Admin or Owner role)."""
    return await update_sla_configuration(payload, current_user, db)


@router.delete("/sla")
async def delete_sla_configuration(
    current_user: User = Depends(require_roles(["owner", "admin"])),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Delete/reset SLA policy configuration (Requires Admin or Owner role)."""
    res = await db.execute(
        select(WorkspaceSetting).where(WorkspaceSetting.organization_id == current_user.organization_id)
    )
    setting = res.scalars().first()
    if setting:
        setting.sla_config = "{}"
        setting.updated_at = datetime.now(timezone.utc)
        await db.commit()
    return {"status": "success", "message": "SLA policy deleted."}


@router.get("/notifications")
async def get_notification_preferences(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Retrieve omnichannel notification and broadcast rules."""
    setting = await _get_or_create_setting(current_user.organization_id, db)
    try:
        return json.loads(setting.notification_config or "{}")
    except Exception:
        return {}


@router.patch("/notifications")
async def update_notification_preferences(
    payload: Dict[str, Any],
    current_user: User = Depends(require_roles(["owner", "admin"])),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Update notification preferences (Requires Admin or Owner role)."""
    setting = await _get_or_create_setting(current_user.organization_id, db)
    try:
        cfg = json.loads(setting.notification_config or "{}")
    except Exception:
        cfg = {}

    cfg.update(payload)
    setting.notification_config = json.dumps(cfg)
    setting.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return {"status": "success", "config": cfg}


@router.get("/appearance")
async def get_appearance_settings(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Retrieve theme and visual display preferences."""
    setting = await _get_or_create_setting(current_user.organization_id, db)
    try:
        return json.loads(setting.appearance_config or "{}")
    except Exception:
        return {}


@router.patch("/appearance")
async def update_appearance_settings(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Update appearance and theme settings."""
    setting = await _get_or_create_setting(current_user.organization_id, db)
    try:
        cfg = json.loads(setting.appearance_config or "{}")
    except Exception:
        cfg = {}

    cfg.update(payload)
    setting.appearance_config = json.dumps(cfg)
    setting.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return {"status": "success", "config": cfg}
