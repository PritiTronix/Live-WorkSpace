"""
Organizations router — Enterprise Multi-Tenant Workspace Management.
Handles workspace registration, dual decorators, and secure tokenized invitation acceptance.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.database import get_db
from backend.app.dependencies import get_current_active_user
from backend.app.models import Organization, User, UserInvitation, WorkspaceSetting
from backend.app.schemas import OrganizationBase, OrganizationRead

router = APIRouter()


class JoinOrgRequest(BaseModel):
    invite_code: str  # Can be an invitation token or workspace slug


@router.get("", response_model=List[OrganizationRead])
@router.get("/", response_model=List[OrganizationRead], include_in_schema=False)
async def list_organizations(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """List organizations available to user or user's current organization."""
    res = await db.execute(
        select(Organization).where(Organization.id == current_user.organization_id)
    )
    return res.scalars().all()


@router.post("", response_model=OrganizationRead, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=OrganizationRead, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_organization(
    org_in: OrganizationBase,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new organization workspace and set current user as owner."""
    existing_org = await db.execute(select(Organization).where(Organization.slug == org_in.slug.lower().strip()))
    if existing_org.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An organization with this slug already exists."
        )

    now = datetime.now(timezone.utc)
    new_org = Organization(
        id=f"org_{uuid.uuid4().hex[:8]}",
        name=org_in.name.strip(),
        slug=org_in.slug.lower().strip(),
        created_at=now,
    )
    db.add(new_org)
    await db.flush()

    # Set user as owner of new organization
    current_user.organization_id = new_org.id
    current_user.role = "owner"

    # Create default workspace setting
    setting = WorkspaceSetting(
        organization_id=new_org.id,
        working_schedule="24x7 Continuous Tier-1 Operations",
        timezone="UTC",
        holidays_observed=10,
        pause_on_hold=True,
    )
    db.add(setting)

    await db.commit()
    await db.refresh(new_org)
    return new_org


@router.post("/join")
async def join_organization(
    payload: JoinOrgRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Join an organization via invitation token or workspace slug."""
    clean_code = payload.invite_code.strip()

    # 1. Check if code matches an invitation token
    inv_res = await db.execute(
        select(UserInvitation).where(
            UserInvitation.token == clean_code,
            UserInvitation.status == "pending"
        )
    )
    invitation = inv_res.scalars().first()

    now = datetime.now(timezone.utc)
    if invitation:
        inv_expires = invitation.expires_at if invitation.expires_at.tzinfo else invitation.expires_at.replace(tzinfo=timezone.utc)
        if inv_expires < now:
            invitation.status = "expired"
            await db.commit()
            raise HTTPException(status_code=400, detail="Invitation token has expired.")

        current_user.organization_id = invitation.organization_id
        current_user.role = invitation.role or "member"
        invitation.status = "accepted"
        await db.commit()

        org_res = await db.execute(select(Organization).where(Organization.id == invitation.organization_id))
        org = org_res.scalars().first()
        org_name = org.name if org else "the workspace"
        return {"message": f"Successfully joined {org_name}", "organization_id": invitation.organization_id}

    # 2. Check if code matches an organization slug
    res = await db.execute(select(Organization).where(Organization.slug == clean_code.lower()))
    org = res.scalars().first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid workspace invitation code or organization slug."
        )

    current_user.organization_id = org.id
    current_user.role = "member"
    await db.commit()

    return {"message": f"Successfully joined {org.name}", "organization_id": org.id}
