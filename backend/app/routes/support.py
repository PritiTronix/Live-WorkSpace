import time
from collections import defaultdict
from typing import Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.database import get_db
from backend.app.dependencies import get_current_active_user
from backend.app.models import User, SupportRequest
from backend.app.schemas import SupportRequestCreate, SupportRequestResponse

router = APIRouter()

# In-memory per-user sliding window rate limiting
_SUPPORT_RATE_LIMITS: Dict[str, List[float]] = defaultdict(list)
_SUPPORT_RATE_LIMIT_MAX = 5  # Max 5 requests per 60 seconds per user
_SUPPORT_RATE_LIMIT_WINDOW = 60.0  # 60 seconds window


@router.post(
    "/requests",
    response_model=SupportRequestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a problem report or support request",
)
async def create_support_request(
    support_in: SupportRequestCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Store a support request for the authenticated user and their organization.
    Validated with Pydantic, rate limited, lengths capped, no email sending.
    """
    if not current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authenticated user is not associated with an organization.",
        )

    # Rate limiting check
    now = time.time()
    cutoff = now - _SUPPORT_RATE_LIMIT_WINDOW
    user_requests = [t for t in _SUPPORT_RATE_LIMITS[current_user.id] if t > cutoff]
    if len(user_requests) >= _SUPPORT_RATE_LIMIT_MAX:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Support request rate limit exceeded. Please wait a minute before submitting again.",
        )
    user_requests.append(now)
    _SUPPORT_RATE_LIMITS[current_user.id] = user_requests

    support_req = SupportRequest(
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        subject=support_in.subject,
        category=support_in.category,
        message=support_in.message,
        status="open",
    )

    db.add(support_req)
    await db.commit()
    await db.refresh(support_req)

    return support_req
