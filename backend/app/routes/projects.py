from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database import get_db
from backend.app.dependencies import get_current_user_id
from backend.app.schemas import ProjectBase, ProjectRead

router = APIRouter()


@router.get("/", response_model=List[ProjectRead])
async def list_projects(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """List all projects in the current workspace."""
    pass


@router.post("/", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_in: ProjectBase,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Create a new project workspace."""
    pass


@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(
    project_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get project details and tabs."""
    pass
