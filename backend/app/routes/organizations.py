import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database import get_db
from backend.app.dependencies import get_current_user_id
from backend.app.models import Organization, User
from backend.app.schemas import OrganizationBase, OrganizationRead

router = APIRouter()


@router.get("/", response_model=List[OrganizationRead])
async def list_organizations(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """List organizations."""
    res = await db.execute(select(Organization).order_by(Organization.name))
    return res.scalars().all()


@router.post("/", response_model=OrganizationRead, status_code=status.HTTP_201_CREATED)
async def create_organization(
    org_in: OrganizationBase,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Create a new organization workspace."""
    existing_org = await db.execute(select(Organization).where(Organization.slug == org_in.slug))
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

    # Link creator as owner if active
    u_res = await db.execute(select(User).where(User.id == current_user_id))
    user = u_res.scalars().first()
    if user:
        user.organization_id = new_org.id
        user.role = "owner"

    await db.commit()
    await db.refresh(new_org)
    return new_org


@router.post("/join")
async def join_organization(
    invite_code: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Join an organization via invite code or slug."""
    clean_code = invite_code.strip().lower()
    res = await db.execute(select(Organization).where(Organization.slug == clean_code))
    org = res.scalars().first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid workspace organization code."
        )

    u_res = await db.execute(select(User).where(User.id == current_user_id))
    user = u_res.scalars().first()
    if user:
        user.organization_id = org.id
        await db.commit()

    return {"message": f"Successfully joined {org.name}", "organization_id": org.id}
