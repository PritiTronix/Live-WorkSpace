from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database import get_db
from backend.app.dependencies import get_current_user_id
from backend.app.schemas import UserRead

router = APIRouter()


@router.get("/me", response_model=UserRead)
async def get_my_profile(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve profile of currently authenticated user."""
    pass


@router.get("/", response_model=List[UserRead])
async def list_team_members(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """List team members within user's organization."""
    pass
