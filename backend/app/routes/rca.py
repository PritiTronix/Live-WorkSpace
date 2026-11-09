from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database import get_db
from backend.app.dependencies import get_current_user_id
from backend.app.models import Ticket

router = APIRouter()


class RCARequest(BaseModel):
    rca_trigger: str
    rca_mitigation: str
    rca_action_items: Optional[str] = None


class RCAResponse(BaseModel):
    ticket_id: str
    ticket_number: str
    title: str
    rca_trigger: Optional[str] = None
    rca_mitigation: Optional[str] = None
    rca_action_items: Optional[str] = None
    updated_at: Optional[datetime] = None


@router.get("/ticket/{ticket_id}", response_model=RCAResponse)
async def get_ticket_rca(
    ticket_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve Root Cause Analysis for a specific ticket."""
    res = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = res.scalars().first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    return RCAResponse(
        ticket_id=ticket.id,
        ticket_number=ticket.ticket_number,
        title=ticket.title,
        rca_trigger=ticket.rca_trigger,
        rca_mitigation=ticket.rca_mitigation,
        rca_action_items=ticket.rca_action_items,
        updated_at=ticket.updated_at,
    )


@router.post("/ticket/{ticket_id}", response_model=RCAResponse, status_code=status.HTTP_200_OK)
async def submit_ticket_rca(
    ticket_id: str,
    payload: RCARequest,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Submit Root Cause Analysis incident document."""
    res = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = res.scalars().first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket.rca_trigger = payload.rca_trigger.strip()
    ticket.rca_mitigation = payload.rca_mitigation.strip()
    if payload.rca_action_items:
        ticket.rca_action_items = payload.rca_action_items.strip()
    ticket.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(ticket)

    return RCAResponse(
        ticket_id=ticket.id,
        ticket_number=ticket.ticket_number,
        title=ticket.title,
        rca_trigger=ticket.rca_trigger,
        rca_mitigation=ticket.rca_mitigation,
        rca_action_items=ticket.rca_action_items,
        updated_at=ticket.updated_at,
    )
