from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database import get_db
from backend.app.dependencies import get_current_user_id
from backend.app.models import ProjectActivity
from backend.app.schemas import ProjectActivityRead

router = APIRouter()


@router.get("/", response_model=List[ProjectActivityRead])
async def list_audit_logs(
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    category: Optional[str] = Query(None, description="Filter by category (tasks, tickets, members, files, discussions)"),
    actor_id: Optional[str] = Query(None, description="Filter by actor user ID"),
    search: Optional[str] = Query(None, description="Search in target_title or details"),
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve system activity and compliance audit logs."""
    query = select(ProjectActivity).options(selectinload(ProjectActivity.actor))

    if project_id:
        query = query.where(ProjectActivity.project_id == project_id)
    if category and category.lower() != "all":
        query = query.where(ProjectActivity.category == category.lower())
    if actor_id and actor_id.lower() != "all":
        query = query.where(ProjectActivity.actor_id == actor_id)
    if search:
        query = query.where(
            ProjectActivity.target_title.ilike(f"%{search.strip()}%") |
            ProjectActivity.details.ilike(f"%{search.strip()}%")
        )

    query = query.order_by(desc(ProjectActivity.created_at))
    res = await db.execute(query)
    return res.scalars().all()
