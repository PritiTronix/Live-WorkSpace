from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database import get_db
from backend.app.dependencies import get_current_user_id
from backend.app.schemas import SLARead

router = APIRouter()


@router.get("/metrics")
async def get_sla_metrics(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve SLA compliance metrics and breach warnings."""
    pass


@router.get("/policies", response_model=List[SLARead])
async def list_sla_policies(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """List SLA policy definitions and timer configurations."""
    pass
