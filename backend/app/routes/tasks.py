from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database import get_db
from backend.app.dependencies import get_current_user_id

router = APIRouter()


@router.get("/")
async def list_tasks(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """List all workspace tasks or filter by user."""
    pass


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_task(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Create a new task."""
    pass
