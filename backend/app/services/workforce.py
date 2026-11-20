"""
Workforce Domain Service — Authoritative Single Source of Truth.
================================================================
This service provides unified, canonical definitions for member account state,
live presence, availability, capacity, and department workload calculations.
Reused consistently across the Team Members page, dashboard, CSV export, and member drawer.

DEFINITIONS & RULES (Canonical Reference):
------------------------------------------
1. ACTIVE (Account State):
   - Active: The user has `is_active=True` AND has an active membership (`status='active'`)
     in the organization. Displayed as 'Active accounts' or 'Active' with tooltip 'Account enabled'.
   - Inactive: The user account is disabled (`is_active=False`) OR their organization
     membership is suspended (`status='suspended'`).
   - Pending: An invited user who has not joined yet (represented by `UserInvitation` with `status='pending'`).
   - Consistent Roster Equation: Total = Active + Inactive + Pending.

2. PRESENCE:
   - Evaluated as lowercase enum: 'online', 'away', 'busy', 'offline'.
   - online: User has a live authenticated WebSocket connection OR user activity recorded
     within the last 2 minutes (120s) AND has not explicitly set a different status.
   - away, busy: Explicit user-set status strictly overrides 'online'.
   - offline: No live WebSocket connection, no recent activity within 2 minutes, and no overriding away/busy status.
   - Note on Storage: User-set status is managed in-memory via the real-time WebSocket manager.
     No schema migration is executed for missing database columns per strict system constraints.

3. AVAILABILITY & WORKLOAD CAPACITY:
   - A member counts as available ONLY if:
     a) Account state is active (`is_active=True` and active membership).
     b) Presence is 'online' or 'offline-but-not-away'.
        * Explicit definition of 'offline-but-not-away': The user is not currently connected
          (or active in the last 2m), but has NOT explicitly marked themselves 'away', 'busy',
          or 'on_leave'. They represent standing organizational capacity available for assignment.
     c) The member is not on leave, not away, and not busy.
     * Away, busy, and on-leave members strictly reduce the available count.
   - Capacity Percentage: Assigned open work (open tickets + tasks) compared against
     the documented per-member capacity (baseline: 5 concurrent items per available member).
     * If assigned open work == 0: returns capacity=None (null in API response), status="No assigned work",
       and neutral styling. Never produces default "100% Available" and never colors green for no data.
     * If assigned open work > 0: capacity / availability percentage is calculated and returned with
       the configured threshold (default 80%).

4. DEPARTMENT NORMALIZATION:
   - Raw department strings are trimmed and lowercased so "Engineering", "engineering", and " Engineering "
     resolve to a single normalized department key.
   - Display labels originate from a single canonical constant dictionary.
   - Department cards without real members are hidden.
"""

from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional, Tuple, Set
from pydantic import BaseModel
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.enums import PresenceStatus, AccountState
from backend.app.models import User, Membership, Project, Task, Ticket, UserInvitation
from backend.app.core.websockets import ws_manager

# Baseline capacity assumption: 5 concurrent open items (tasks + tickets) per available member = 100% load
PER_MEMBER_CAPACITY: int = 5
DEFAULT_CAPACITY_THRESHOLD: int = 80

# Canonical Department Normalization Mapping (lowercase key -> canonical display label)
DEPARTMENT_DISPLAY_LABELS: Dict[str, str] = {
    "engineering": "Engineering",
    "product & design": "Product & Design",
    "product": "Product & Design",
    "design": "Product & Design",
    "operations": "Operations",
    "sre": "Operations",
    "infra": "Operations",
    "infrastructure": "Operations",
    "qa": "Quality Assurance",
    "security": "Security",
    "general": "General",
}


def normalize_department(raw_name: Optional[str]) -> Tuple[str, str]:
    """
    Normalizes raw department strings (trimming whitespace and lowercase matching).
    Returns (normalized_key, canonical_display_label).
    Example: ' Engineering ' -> ('engineering', 'Engineering')
    """
    if not raw_name or not str(raw_name).strip():
        return ("general", "General")
    cleaned = " ".join(str(raw_name).strip().lower().split())
    if cleaned in DEPARTMENT_DISPLAY_LABELS:
        return (cleaned, DEPARTMENT_DISPLAY_LABELS[cleaned])
    return (cleaned, str(raw_name).strip().title())


def compute_user_presence(
    user: User,
    has_live_ws: bool,
    now: datetime,
    user_set_status: Optional[str] = None,
) -> PresenceStatus:
    """
    Authoritative Presence Calculation:
    - User-set status ('away', 'busy', 'offline') overrides 'online'.
    - online = live authenticated WebSocket connection OR authenticated activity within the last 2 minutes
      AND user has not set an overriding status.
    - offline = no connection and no recent activity.
    """
    norm_status = (user_set_status or "").strip().lower() if user_set_status else None
    if norm_status in (PresenceStatus.away.value, PresenceStatus.busy.value):
        return PresenceStatus(norm_status)
    if norm_status == PresenceStatus.offline.value:
        return PresenceStatus.offline

    recent_activity = False
    if user.last_active_at:
        dt = user.last_active_at if user.last_active_at.tzinfo else user.last_active_at.replace(tzinfo=timezone.utc)
        if (now - dt).total_seconds() <= 120:  # 2 minutes
            recent_activity = True

    if has_live_ws or recent_activity:
        return PresenceStatus.online

    return PresenceStatus.offline


def is_member_available(
    is_active_account: bool,
    presence: PresenceStatus,
    user_set_status: Optional[str] = None,
    on_leave: bool = False,
) -> bool:
    """
    Authoritative Availability Calculation:
    A member counts as available ONLY if:
    1. Account is active (is_active and active membership).
    2. Presence is online or offline-but-not-away.
       'offline-but-not-away' explicitly means: offline (no current active connection),
       but user has NOT set status to 'away', 'busy', or taken leave.
    3. Not on leave, away, or busy.
    """
    if not is_active_account or on_leave:
        return False
    norm_set = (user_set_status or "").strip().lower() if user_set_status else None
    if norm_set in ("away", "busy", "on_leave"):
        return False
    if presence in (PresenceStatus.away, PresenceStatus.busy):
        return False
    return True


def compute_team_capacity(
    active_items: int,
    available_members_count: int,
    total_members_count: int,
    threshold: int = DEFAULT_CAPACITY_THRESHOLD,
) -> Dict[str, Any]:
    """
    Authoritative Team Workload & Capacity Calculation:
    - When active_items == 0: returns capacity=None, status="No assigned work", neutral color.
      NEVER defaults to "100% Available" and NEVER uses green for zero work.
    - When active_items > 0: computes utilization and availability percentages against
      per-member capacity (available_members * 5).
    """
    if active_items == 0:
        return {
            "capacity": None,
            "availability": None,
            "utilization": 0,
            "status": "No assigned work",
            "color": "bg-[#9C9CA9]",  # Neutral token, never green for no data
            "threshold": threshold,
            "is_overloaded": False,
        }

    effective_cap = max(1, available_members_count) * PER_MEMBER_CAPACITY
    utilization = min(100, int(round((active_items / float(effective_cap)) * 100)))
    availability = max(0, 100 - utilization)
    is_overloaded = utilization >= threshold

    if utilization >= threshold:
        status_text = f"{availability}% Available (High Load)"
        color = "bg-severity-critical"
    elif utilization >= 40:
        status_text = f"{availability}% Available (Optimal)"
        color = "bg-primary-container"
    else:
        status_text = f"{availability}% Available"
        color = "bg-status-resolved"

    return {
        "capacity": availability,
        "availability": availability,
        "utilization": utilization,
        "status": status_text,
        "color": color,
        "threshold": threshold,
        "is_overloaded": is_overloaded,
    }


def pluralize(count: int, singular: str, plural: Optional[str] = None) -> str:
    p = plural if plural else f"{singular}s"
    return f"{count} {singular if count == 1 else p}"


async def get_organization_workforce_data(
    db: AsyncSession,
    organization_id: str,
    department: Optional[str] = None,
    team: Optional[str] = None,
    project_id: Optional[str] = None,
    period_start: Optional[datetime] = None,
) -> Dict[str, Any]:
    """
    Unified backend query strictly scoped to caller's verified organization.
    Fetches all members, pending invitations, active tasks, and active tickets.
    Computes:
    - Total members, Active accounts, Inactive accounts, Online now, Pending invitations.
    - Strictly satisfies: Total = Active + Inactive + Pending.
    - Department workloads with real available counts and non-default capacity.
    """
    now = datetime.now(timezone.utc)
    eff_dept = (department or team or "").strip().lower()

    # 1. Fetch active memberships with associated User objects
    mem_stmt = (
        select(User, Membership.role.label("membership_role"), Membership.status.label("membership_status"))
        .join(Membership, Membership.user_id == User.id)
        .where(Membership.organization_id == organization_id)
    )
    mem_res = await db.execute(mem_stmt)
    users_by_id: Dict[str, User] = {}
    membership_roles: Dict[str, str] = {}
    membership_statuses: Dict[str, str] = {}

    for u, m_role, m_status in mem_res.all():
        users_by_id[u.id] = u
        if m_role:
            membership_roles[u.id] = m_role
        membership_statuses[u.id] = (m_status or "active").lower()

    # 2. Fetch users with users.organization_id == organization_id (legacy fallback)
    legacy_stmt = select(User).where(User.organization_id == organization_id)
    legacy_res = await db.execute(legacy_stmt)
    for u in legacy_res.scalars().all():
        if u.id not in users_by_id:
            users_by_id[u.id] = u
            membership_statuses[u.id] = "active"

    # 3. Fetch pending invitations for organization
    inv_res = await db.execute(
        select(UserInvitation).where(
            UserInvitation.organization_id == organization_id,
            UserInvitation.status == "pending"
        ).order_by(UserInvitation.created_at.desc())
    )
    pending_invitations = inv_res.scalars().all()
    pending_count = len(pending_invitations)

    # 4. Fetch assigned active tasks scoped to organization
    task_stmt = select(Task.assignee_id).where(
        Task.organization_id == organization_id,
        Task.status.notin_(["done", "cancelled"]),
        Task.assignee_id.isnot(None),
    )
    if project_id:
        task_stmt = task_stmt.where(Task.project_id == project_id)
    if period_start:
        task_stmt = task_stmt.where(Task.created_at >= period_start)
    task_res = await db.execute(task_stmt)
    active_tasks = task_res.scalars().all()

    # 5. Fetch assigned active tickets scoped to organization
    ticket_stmt = (
        select(Ticket.assignee_id)
        .join(Project, Ticket.project_id == Project.id)
        .where(
            Project.organization_id == organization_id,
            Ticket.status.notin_(["closed", "resolved"]),
            Ticket.assignee_id.isnot(None),
        )
    )
    if project_id:
        ticket_stmt = ticket_stmt.where(Ticket.project_id == project_id)
    if period_start:
        ticket_stmt = ticket_stmt.where(Ticket.created_at >= period_start)
    ticket_res = await db.execute(ticket_stmt)
    active_tickets = ticket_res.scalars().all()

    task_counts_per_user: Dict[str, int] = {}
    for uid in active_tasks:
        task_counts_per_user[uid] = task_counts_per_user.get(uid, 0) + 1

    ticket_counts_per_user: Dict[str, int] = {}
    for uid in active_tickets:
        ticket_counts_per_user[uid] = ticket_counts_per_user.get(uid, 0) + 1

    # 6. Evaluate each member
    all_members_enriched: List[Dict[str, Any]] = []
    active_accounts_count = 0
    inactive_accounts_count = 0
    online_now_count = 0

    dept_groups: Dict[str, List[Dict[str, Any]]] = {}
    dept_labels: Dict[str, str] = {}
    role_counts: Dict[str, int] = {}

    for uid, u in users_by_id.items():
        role = membership_roles.get(uid, u.role or "member")
        m_status = membership_statuses.get(uid, "active")

        # Account state: active if user.is_active is True and membership status is 'active'
        is_active_account = bool(u.is_active and m_status == "active")
        account_state = AccountState.active.value if is_active_account else AccountState.inactive.value

        if is_active_account:
            active_accounts_count += 1
        else:
            inactive_accounts_count += 1

        # Real presence
        has_ws = ws_manager.is_user_connected(uid)
        user_set = ws_manager.get_user_status(uid)
        presence = compute_user_presence(u, has_ws, now, user_set_status=user_set)

        if presence == PresenceStatus.online:
            online_now_count += 1

        # Availability
        is_avail = is_member_available(is_active_account, presence, user_set_status=user_set)

        # Department normalization
        dept_key, dept_label = normalize_department(u.department)
        dept_labels[dept_key] = dept_label

        u_tasks = task_counts_per_user.get(uid, 0)
        u_tickets = ticket_counts_per_user.get(uid, 0)

        r_norm = (role or "member").lower()
        role_counts[r_norm] = role_counts.get(r_norm, 0) + 1

        clean_avatar = None if (u.avatar_url and "dicebear.com" in u.avatar_url.lower()) else u.avatar_url

        member_item = {
            "id": u.id,
            "full_name": u.full_name,
            "display_name": u.display_name,
            "email": u.email,
            "role": role,
            "title": u.title,
            "avatar_url": clean_avatar,
            "department": dept_label,
            "department_key": dept_key,
            "is_active": is_active_account,
            "account_state": account_state,
            "presence": presence.value,
            "user_set_status": user_set,
            "is_available": is_avail,
            "last_active_at": u.last_active_at,
            "timezone": u.timezone,
            "phone": u.phone,
            "slack_handle": u.slack_handle,
            "on_call_role": u.on_call_role,
            "active_tasks_count": u_tasks,
            "active_tickets_count": u_tickets,
            "active_items_count": u_tasks + u_tickets,
            "organization_id": u.organization_id or organization_id,
            "email_verified": bool(u.email_verified),
            "onboarding_completed": bool(u.onboarding_completed),
            "created_at": u.created_at or now,
            "memberships": [],
        }
        all_members_enriched.append(member_item)
        dept_groups.setdefault(dept_key, []).append(member_item)

    # Total equation strictly enforced: Total = Active + Inactive + Pending
    total_members_count = active_accounts_count + inactive_accounts_count + pending_count

    # 7. Department workload items for Dashboard & Members Summary
    department_workload_items: List[Dict[str, Any]] = []
    department_counts: Dict[str, int] = {}

    for dept_key, members_in_dept in sorted(dept_groups.items(), key=lambda x: (-len(x[1]), x[0])):
        total_in_dept = len(members_in_dept)
        available_in_dept = sum(1 for m in members_in_dept if m["is_available"])
        active_items_in_dept = sum(m["active_items_count"] for m in members_in_dept)
        dept_label = dept_labels[dept_key]
        department_counts[dept_label] = total_in_dept

        cap_info = compute_team_capacity(
            active_items=active_items_in_dept,
            available_members_count=available_in_dept,
            total_members_count=total_in_dept,
            threshold=DEFAULT_CAPACITY_THRESHOLD,
        )

        if active_items_in_dept == 0:
            desc = f"{pluralize(total_in_dept, 'member')} ({available_in_dept} available) • No assigned work"
        else:
            desc = f"{pluralize(total_in_dept, 'member')} ({available_in_dept} available) • {pluralize(active_items_in_dept, 'active item')}"

        department_workload_items.append({
            "name": dept_label,
            "key": dept_key,
            "member_count": total_in_dept,
            "available_members": available_in_dept,
            "active_items": active_items_in_dept,
            "capacity": cap_info["capacity"],
            "availability": cap_info["availability"],
            "utilization": cap_info["utilization"],
            "status": cap_info["status"],
            "color": cap_info["color"],
            "desc": desc,
            "threshold": cap_info["threshold"],
        })

    # Average workload calculation across entire active workforce
    total_assigned_items = len(active_tasks) + len(active_tickets)
    if active_accounts_count > 0 and total_assigned_items > 0:
        avg_items_per_user = total_assigned_items / float(active_accounts_count)
        avg_workload = min(100.0, max(15.0, round(avg_items_per_user * 18.0, 1)))
        status_label = "Optimal" if avg_workload < DEFAULT_CAPACITY_THRESHOLD else "High"
    else:
        avg_workload = None
        status_label = None

    # Filtered member list if department filter provided
    filtered_members = all_members_enriched
    if eff_dept and eff_dept != "all":
        filtered_members = [
            m for m in all_members_enriched
            if m["department_key"] == eff_dept or eff_dept in m["department_key"] or eff_dept in m["department"].lower()
        ]

    # Sort members by full_name
    filtered_members.sort(key=lambda m: (m.get("full_name") or "").lower())

    return {
        "total_members": total_members_count,
        "active_count": active_accounts_count,
        "inactive_count": inactive_accounts_count,
        "pending_count": pending_count,
        "pending_invitations_count": pending_count,
        "online_count": online_now_count,
        "department_counts": department_counts,
        "role_counts": role_counts,
        "average_workload": avg_workload,
        "workload_status": status_label,
        "departments": department_workload_items,
        "members": filtered_members,
        "invitations": [
            {
                "id": inv.id,
                "email": inv.email,
                "role": inv.role,
                "status": inv.status,
                "created_at": inv.created_at.isoformat() if inv.created_at else None,
                "expires_at": inv.expires_at.isoformat() if inv.expires_at else None,
            }
            for inv in pending_invitations
        ],
    }
