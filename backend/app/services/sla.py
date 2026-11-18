"""
SLA Service — Centralized Service Level Agreement & Breach Calculations.
Enterprise multi-tenant implementation providing a single shared source of truth
for active SLA breach evaluation across the entire platform.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional, NamedTuple, Any


def format_overrun_duration(seconds: int) -> str:
    """
    Format overrun duration in seconds to a human-readable string.
    Examples: '45s', '12m', '2h 15m', '3d 4h'.
    """
    if seconds < 0:
        return "0m"
    days = seconds // 86400
    hours = (seconds % 86400) // 3600
    minutes = (seconds % 3600) // 60

    if days > 0:
        return f"{days}d {hours}h" if hours > 0 else f"{days}d"
    if hours > 0:
        return f"{hours}h {minutes}m" if minutes > 0 else f"{hours}h"
    if minutes > 0:
        return f"{minutes}m"
    return f"{seconds}s"


class TicketBreachInfo(NamedTuple):
    is_breached: bool
    breached_at: Optional[datetime]
    overrun_duration: Optional[str]
    overrun_seconds: Optional[int]


def check_ticket_sla_breach(ticket: Any, now: Optional[datetime] = None) -> TicketBreachInfo:
    """
    Unified definition of 'active SLA breach':
    The ticket's SLA deadline is in the past and its status is not resolved or closed.

    Returns breach fields per ticket:
    - is_breached: bool
    - breached_at: Optional[datetime] (the exact deadline timestamp when breach started)
    - overrun_duration: Optional[str] (e.g. '2h 15m')
    - overrun_seconds: Optional[int] (raw elapsed seconds since breach)
    """
    if now is None:
        now = datetime.now(timezone.utc)
    elif not now.tzinfo:
        now = now.replace(tzinfo=timezone.utc)

    status = (getattr(ticket, "status", None) or "").lower()
    if status in ("resolved", "closed"):
        return TicketBreachInfo(
            is_breached=False,
            breached_at=None,
            overrun_duration=None,
            overrun_seconds=None,
        )

    deadline = getattr(ticket, "deadline", None)
    if deadline is None:
        return TicketBreachInfo(
            is_breached=False,
            breached_at=None,
            overrun_duration=None,
            overrun_seconds=None,
        )

    dl = deadline if deadline.tzinfo else deadline.replace(tzinfo=timezone.utc)
    if dl < now:
        diff_seconds = max(0, int((now - dl).total_seconds()))
        return TicketBreachInfo(
            is_breached=True,
            breached_at=dl,
            overrun_duration=format_overrun_duration(diff_seconds),
            overrun_seconds=diff_seconds,
        )

    return TicketBreachInfo(
        is_breached=False,
        breached_at=None,
        overrun_duration=None,
        overrun_seconds=None,
    )


def is_active_sla_breach(ticket: Any, now: Optional[datetime] = None) -> bool:
    """
    Unified boolean helper: returns True if ticket is currently in active SLA breach.
    Deadline is in the past and status is not resolved or closed.
    """
    return check_ticket_sla_breach(ticket, now).is_breached
