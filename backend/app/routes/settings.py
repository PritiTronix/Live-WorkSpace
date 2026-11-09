from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database import get_db
from backend.app.dependencies import get_current_user_id
from backend.app.models import Organization

router = APIRouter()


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
