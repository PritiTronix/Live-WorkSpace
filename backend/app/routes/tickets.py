from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database import get_db
from backend.app.dependencies import get_current_user_id
from backend.app.schemas import TicketBase, TicketRead

router = APIRouter()


@router.get("/", response_model=List[TicketRead])
async def list_tickets(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """List tickets for dashboard and board views."""
    pass


@router.post("/", response_model=TicketRead, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    ticket_in: TicketBase,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Create a new ticket with automatic SLA assignment."""
    pass


@router.patch("/{ticket_id}/status")
async def update_ticket_status(
    ticket_id: str,
    status: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Update ticket workflow state (open, wip, on-hold, resolved, closed)."""
    pass


@router.patch("/{ticket_id}/severity")
async def update_ticket_severity(
    ticket_id: str,
    severity: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Update ticket severity (blocker, critical, major) with SLA recalibration."""
    pass
