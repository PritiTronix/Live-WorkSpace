from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database import get_db
from backend.app.dependencies import get_current_user_id

router = APIRouter()


@router.get("/workspace")
async def get_workspace_settings(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve workspace general configuration and branding."""
    pass


@router.patch("/workspace")
async def update_workspace_settings(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Update workspace parameters."""
    pass
