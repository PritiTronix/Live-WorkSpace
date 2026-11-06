from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database import get_db
from backend.app.dependencies import get_current_user_id

router = APIRouter()


@router.get("/summary")
async def get_analytics_summary(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get high-level workspace performance analytics."""
    pass


@router.post("/export")
async def export_analytics_report(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Export analytics report in PDF/CSV format."""
    pass
