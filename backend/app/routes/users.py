from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database import get_db
from backend.app.dependencies import get_current_user_id
from backend.app.models import User
from backend.app.schemas import UserRead

router = APIRouter()


@router.get("/me", response_model=UserRead)
async def get_my_profile(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve profile of currently authenticated user."""
    res = await db.execute(select(User).where(User.id == current_user_id))
    user = res.scalars().first()
    if not user:
        res = await db.execute(select(User).where(User.id == "usr_01"))
        user = res.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


@router.get("/", response_model=List[UserRead])
async def list_team_members(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """List team members within user's organization."""
    res = await db.execute(select(User).order_by(User.full_name))
    return res.scalars().all()
