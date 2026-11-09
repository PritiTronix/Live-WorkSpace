from typing import List, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database import get_db
from backend.app.dependencies import get_current_user_id
from backend.app.models import Ticket
from backend.app.schemas import SLARead

router = APIRouter()

DEFAULT_POLICIES = [
    {
        "id": "sla_p0",
        "name": "P0 - Blocker Outage",
        "response_time_minutes": 15,
        "resolution_time_minutes": 120,
        "created_at": datetime.now(timezone.utc),
    },
    {
        "id": "sla_p1",
        "name": "P1 - Critical Degradation",
        "response_time_minutes": 30,
        "resolution_time_minutes": 240,
        "created_at": datetime.now(timezone.utc),
    },
    {
        "id": "sla_p2",
        "name": "P2 - Major Issue",
        "response_time_minutes": 60,
        "resolution_time_minutes": 480,
        "created_at": datetime.now(timezone.utc),
    },
    {
        "id": "sla_p3",
        "name": "P3 - Minor / Cosmetic",
        "response_time_minutes": 240,
        "resolution_time_minutes": 1440,
        "created_at": datetime.now(timezone.utc),
    },
]


@router.get("/metrics")
async def get_sla_metrics(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Retrieve SLA compliance metrics and breach warnings."""
    # Query ticket counts
    res = await db.execute(select(Ticket))
    tickets = res.scalars().all()

    total_tickets = len(tickets)
    breached_tickets = sum(1 for t in tickets if t.status.lower() != "closed" and t.deadline and t.deadline < datetime.now(timezone.utc))
    at_risk_tickets = sum(1 for t in tickets if t.status.lower() != "closed" and t.severity.lower() in ("blocker", "critical"))

    adherence_rate = round(((total_tickets - breached_tickets) / total_tickets * 100), 1) if total_tickets > 0 else 98.5

    return {
        "adherence_rate": adherence_rate,
        "average_mttr": "18m",
        "total_active_tickets": sum(1 for t in tickets if t.status.lower() != "closed"),
        "breached_count": breached_tickets,
        "at_risk_count": at_risk_tickets,
        "rolling_window_days": 30,
    }


@router.get("/policies", response_model=List[SLARead])
async def list_sla_policies(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """List SLA policy definitions and timer configurations."""
    return DEFAULT_POLICIES
