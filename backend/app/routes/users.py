import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database import get_db
from backend.app.dependencies import get_current_active_user, get_current_user_id, require_roles
from backend.app.core.security import verify_password, get_password_hash
from backend.app.models import User, Ticket, Task, ProjectMember, Project, UserInvitation, ProjectActivity
from backend.app.schemas import UserRead, UserUpdateProfile, UserChangePassword, UserInviteRequest, UserUpdateRole

logger = logging.getLogger("tronix.users")

router = APIRouter()


@router.get("/me", response_model=UserRead)
async def get_my_profile(
    current_user: User = Depends(get_current_active_user),
):
    """Retrieve profile of currently authenticated user without insecure fallbacks."""
    return current_user


@router.patch("/me", response_model=UserRead)
async def update_my_profile(
    payload: UserUpdateProfile,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Update profile details of currently authenticated user."""
    if payload.full_name is not None and payload.full_name.strip():
        current_user.full_name = payload.full_name.strip()
    if payload.title is not None:
        current_user.title = payload.title.strip() or None
    if payload.department is not None:
        current_user.department = payload.department.strip() or None
    if payload.avatar_url is not None:
        current_user.avatar_url = payload.avatar_url.strip() or None
    if payload.timezone is not None:
        current_user.timezone = payload.timezone.strip() or None
    if payload.on_call_role is not None:
        current_user.on_call_role = payload.on_call_role.strip() or None

    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/change-password")
async def change_password(
    payload: UserChangePassword,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Change authenticated user password."""
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password verification failed",
        )

    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters",
        )

    current_user.hashed_password = get_password_hash(payload.new_password)
    await db.commit()
    return {"success": True, "message": "Password credentials updated successfully"}


@router.post("/invite")
async def invite_member(
    payload: UserInviteRequest,
    current_user: User = Depends(require_roles(["owner", "admin"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Invite a new team member to the workspace.
    Protected by RBAC: only owner and admin can invite members.
    Generates single-use cryptographically secure invitation token and sets tenant organization.
    """
    email_clean = str(payload.email).lower().strip()
    u_res = await db.execute(
        select(User).where(User.email == email_clean, User.organization_id == current_user.organization_id)
    )
    existing_user = u_res.scalars().first()

    now = datetime.now(timezone.utc)
    invitation_token = secrets.token_urlsafe(32)
    expires_at = now + timedelta(days=7)

    # Record secure invitation in database
    invitation = UserInvitation(
        email=email_clean,
        organization_id=current_user.organization_id,
        role=payload.role.lower(),
        token=invitation_token,
        invited_by_id=current_user.id,
        status="pending",
        expires_at=expires_at,
        created_at=now,
    )
    db.add(invitation)

    if not existing_user:
        # Pre-provision inactive member account linked to current organization
        derived_name = email_clean.split("@")[0].replace(".", " ").title()
        temp_random_secret = secrets.token_urlsafe(24)
        new_user = User(
            email=email_clean,
            hashed_password=get_password_hash(temp_random_secret),
            full_name=derived_name,
            role=payload.role.lower(),
            department="Engineering",
            is_active=True,
            email_verified=False,
            organization_id=current_user.organization_id,
            created_at=now,
        )
        db.add(new_user)
        await db.flush()
        target_user = new_user
    else:
        target_user = existing_user

    if payload.project_id:
        # Verify project belongs to current organization
        p_res = await db.execute(
            select(Project).where(
                Project.id == payload.project_id,
                Project.organization_id == current_user.organization_id
            )
        )
        proj = p_res.scalars().first()
        if proj:
            m_res = await db.execute(
                select(ProjectMember).where(
                    ProjectMember.project_id == payload.project_id,
                    ProjectMember.user_id == target_user.id
                )
            )
            existing_m = m_res.scalars().first()
            if not existing_m:
                new_m = ProjectMember(
                    project_id=payload.project_id,
                    user_id=target_user.id,
                    role=payload.role.lower(),
                    access_scope="Full Repository Access",
                )
                db.add(new_m)

    await db.commit()

    return {
        "success": True,
        "message": f"Invitation successfully dispatched to {email_clean}",
        "invitation_token": invitation_token,
        "expires_at": expires_at.isoformat(),
        "user": {
            "id": target_user.id,
            "email": target_user.email,
            "full_name": target_user.full_name,
            "role": target_user.role,
        }
    }


@router.get("", response_model=List[UserRead])
@router.get("/", response_model=List[UserRead], include_in_schema=False)
async def list_team_members(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """List team members strictly within the authenticated user's organization."""
    if not current_user.organization_id:
        return [current_user]

    res = await db.execute(
        select(User)
        .where(User.organization_id == current_user.organization_id)
        .order_by(User.full_name)
    )
    return res.scalars().all()


class TeamSummaryResponse(BaseModel):
    total_members: int
    active_count: int
    inactive_count: int
    pending_invitations_count: int
    department_counts: Dict[str, int]
    role_counts: Dict[str, int]
    average_workload: Optional[float] = None
    workload_status: Optional[str] = None


class UserInvitationItem(BaseModel):
    id: str
    email: str
    role: str
    status: str
    created_at: datetime
    expires_at: datetime


@router.get("/summary", response_model=TeamSummaryResponse)
async def get_team_members_summary(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Calculated workforce summary scoped to user's organization."""
    if not current_user.organization_id:
        return TeamSummaryResponse(
            total_members=1,
            active_count=1,
            inactive_count=0,
            pending_invitations_count=0,
            department_counts={current_user.department or "General": 1},
            role_counts={current_user.role or "member": 1},
            average_workload=None,
            workload_status=None,
        )

    # All users in org
    res = await db.execute(
        select(User).where(User.organization_id == current_user.organization_id)
    )
    users = res.scalars().all()

    total = len(users)
    active = sum(1 for u in users if u.is_active)
    inactive = total - active

    # Pending invitations
    inv_res = await db.execute(
        select(UserInvitation).where(
            UserInvitation.organization_id == current_user.organization_id,
            UserInvitation.status == "pending"
        )
    )
    invitations = inv_res.scalars().all()
    pending_invs = len(invitations)

    # Department breakdown
    dept_counts: Dict[str, int] = {}
    for u in users:
        dept = u.department or "Engineering"
        dept_counts[dept] = dept_counts.get(dept, 0) + 1

    # Role breakdown
    role_counts: Dict[str, int] = {}
    for u in users:
        r = u.role or "member"
        role_counts[r] = role_counts.get(r, 0) + 1

    # Real workload calculation across members from assigned active tickets and tasks
    # Active tickets per user
    tk_res = await db.execute(
        select(Ticket.assignee_id)
        .join(Project, Ticket.project_id == Project.id)
        .where(
            Project.organization_id == current_user.organization_id,
            Ticket.status.notin_(["closed", "resolved"]),
            Ticket.assignee_id.isnot(None)
        )
    )
    active_tk_assignees = tk_res.scalars().all()

    task_res = await db.execute(
        select(Task.assignee_id).where(
            Task.organization_id == current_user.organization_id,
            Task.status.notin_(["done", "cancelled"]),
            Task.assignee_id.isnot(None)
        )
    )
    active_task_assignees = task_res.scalars().all()

    total_active_items = len(active_tk_assignees) + len(active_task_assignees)
    if total > 0 and total_active_items > 0:
        avg_items_per_user = total_active_items / total
        avg_workload = min(100.0, max(15.0, round(avg_items_per_user * 18.0, 1)))
        status_label = "Optimal" if avg_workload < 80 else "High"
    else:
        avg_workload = None
        status_label = None

    return TeamSummaryResponse(
        total_members=total,
        active_count=active,
        inactive_count=inactive,
        pending_invitations_count=pending_invs,
        department_counts=dept_counts,
        role_counts=role_counts,
        average_workload=avg_workload,
        workload_status=status_label,
    )


@router.get("/invitations", response_model=List[UserInvitationItem])
async def list_pending_invitations(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """List pending invitations for the caller's organization."""
    if not current_user.organization_id:
        return []

    res = await db.execute(
        select(UserInvitation).where(
            UserInvitation.organization_id == current_user.organization_id,
            UserInvitation.status == "pending"
        ).order_by(UserInvitation.created_at.desc())
    )
    invs = res.scalars().all()
    return [
        UserInvitationItem(
            id=i.id,
            email=i.email,
            role=i.role,
            status=i.status,
            created_at=i.created_at,
            expires_at=i.expires_at,
        )
        for i in invs
    ]


DEFAULT_WORKLOAD_THRESHOLD = 80


def compute_member_workload(open_tickets_count: int, open_tasks_count: int, blockers_count: int = 0) -> Optional[int]:
    """
    Computes real member workload capacity percentage based on assigned active tickets and tasks:
    - 0 active items: 0% capacity allocated.
    - Each open task: 10 points.
    - Each open ticket: 15 points.
    - Each critical/blocker ticket: +10 points (incident severity penalty).
    Bounded between 5% and 100% when active items exist. Threshold for overloaded state is 80%.
    """
    total_items = open_tickets_count + open_tasks_count
    if total_items == 0:
        return 0
    raw_points = (open_tasks_count * 10) + (open_tickets_count * 15) + (blockers_count * 10)
    return min(100, max(5, raw_points))


def compute_ticket_sla_state(deadline: Optional[datetime], status: str, now: datetime) -> Dict[str, Any]:
    """
    Computes real-time SLA breach / time-remaining status from ticket deadline.
    Returns status ('breached', 'breaching_soon', 'healthy', or None) and human-readable label.
    """
    if not deadline or (status or "").lower() in ("closed", "resolved"):
        return {"status": None, "label": None, "remaining_minutes": None}

    d = deadline if deadline.tzinfo else deadline.replace(tzinfo=timezone.utc)
    n = now if now.tzinfo else now.replace(tzinfo=timezone.utc)

    diff_seconds = (d - n).total_seconds()
    diff_minutes = int(diff_seconds / 60)

    if diff_seconds < 0:
        return {
            "status": "breached",
            "label": "SLA Breached",
            "remaining_minutes": diff_minutes,
        }
    elif diff_seconds <= 2 * 3600:  # within 2 hours
        if diff_minutes < 60:
            time_str = f"{diff_minutes}m"
        else:
            time_str = f"{diff_minutes // 60}h {diff_minutes % 60}m"
        return {
            "status": "breaching_soon",
            "label": f"SLA Breaching in {time_str}",
            "remaining_minutes": diff_minutes,
        }
    else:
        return {
            "status": "healthy",
            "label": "SLA Healthy",
            "remaining_minutes": diff_minutes,
        }


@router.get("/{user_id}")
async def get_user_member_detail(
    user_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Retrieve full user profile with live workload and aggregations, strictly scoped to caller's organization."""
    u_res = await db.execute(
        select(User).where(
            User.id == user_id,
            User.organization_id == current_user.organization_id
        )
    )
    user = u_res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found in this organization")

    # Fetch assigned tickets scoped to current user's organization
    tk_res = await db.execute(
        select(Ticket)
        .join(Project, Ticket.project_id == Project.id)
        .where(
            Ticket.assignee_id == user_id,
            Project.organization_id == current_user.organization_id
        )
        .order_by(Ticket.updated_at.desc())
    )
    all_tickets = tk_res.scalars().all()

    # Fetch assigned tasks scoped to current user's organization
    ts_res = await db.execute(
        select(Task)
        .where(
            Task.assignee_id == user_id,
            Task.organization_id == current_user.organization_id
        )
        .order_by(Task.created_at.desc())
    )
    all_tasks = ts_res.scalars().all()

    # Fetch project memberships
    pm_res = await db.execute(
        select(ProjectMember)
        .join(Project, ProjectMember.project_id == Project.id)
        .options(selectinload(ProjectMember.project))
        .where(
            ProjectMember.user_id == user_id,
            Project.organization_id == current_user.organization_id
        )
    )
    memberships = pm_res.scalars().all()
    projects = [
        {
            "id": m.project.id,
            "name": m.project.name,
            "key": m.project.key,
            "role": m.role,
            "status": m.project.status,
        }
        for m in memberships if m.project
    ]

    now = datetime.now(timezone.utc)

    # Filter tickets
    open_tickets = [t for t in all_tickets if (t.status or "").lower() not in ("closed", "resolved")]
    blockers = [t for t in open_tickets if (t.severity or "").lower() in ("blocker", "critical")]

    # Tasks breakdown
    open_tasks = [t for t in all_tasks if (t.status or "").lower() not in ("done", "cancelled")]
    due_soon_cutoff = now + timedelta(days=2)
    due_soon_count = 0
    overdue_count = 0
    task_counts_by_status: Dict[str, int] = {}

    for t in open_tasks:
        s = (t.status or "todo").lower()
        task_counts_by_status[s] = task_counts_by_status.get(s, 0) + 1
        if t.due_date:
            due_dt = t.due_date if t.due_date.tzinfo else t.due_date.replace(tzinfo=timezone.utc)
            if due_dt < now:
                overdue_count += 1
            elif due_dt <= due_soon_cutoff:
                due_soon_count += 1

    workload_val = compute_member_workload(len(open_tickets), len(open_tasks), len(blockers))

    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "title": user.title,  # Real value or None, no demo fallbacks
        "department": user.department,  # Real value or None
        "avatar_url": user.avatar_url,
        "is_active": user.is_active,
        "timezone": user.timezone,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "joined_date": user.created_at.isoformat() if user.created_at else None,
        "last_active": user.last_active_at.isoformat() if user.last_active_at else None,
        "last_active_at": user.last_active_at.isoformat() if user.last_active_at else None,
        "on_call_role": user.on_call_role,
        "workload_percentage": workload_val,
        "workload": {
            "percentage": workload_val,
            "threshold": DEFAULT_WORKLOAD_THRESHOLD,
            "is_overloaded": (workload_val > DEFAULT_WORKLOAD_THRESHOLD) if workload_val is not None else False,
            "active_incidents": len(blockers),
        },
        "projects": projects,
        "active_tickets_count": len(open_tickets),
        "blockers_count": len(blockers),
        "tasks_count": len(open_tasks),
        "tasks_summary": {
            "total_open": len(open_tasks),
            "counts_by_status": task_counts_by_status,
            "due_soon": due_soon_count,
            "overdue": overdue_count,
        },
        "tickets": [
            {
                "id": t.id,
                "ticket_number": t.ticket_number,
                "title": t.title,
                "status": t.status,
                "severity": t.severity,
                "deadline": t.deadline.isoformat() if t.deadline else None,
                "updated_at": t.updated_at.isoformat() if t.updated_at else None,
                "sla_state": compute_ticket_sla_state(t.deadline, t.status, now),
            }
            for t in open_tickets[:10]
        ],
        "tasks": [
            {
                "id": tk.id,
                "task_number": tk.task_number,
                "title": tk.title,
                "status": tk.status,
                "priority": tk.priority,
                "due_date": tk.due_date.isoformat() if tk.due_date else None,
                "created_at": tk.created_at.isoformat() if tk.created_at else None,
            }
            for tk in open_tasks[:10]
        ],
    }


@router.patch("/{user_id}/role")
async def update_member_role(
    user_id: str,
    payload: UserUpdateRole,
    current_user: User = Depends(require_roles(["owner", "admin"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a team member's role with strict RBAC rules:
    - Caller must be 'owner' or 'admin'.
    - Self-escalation is blocked (admin cannot promote themselves to owner, nor change their own role to owner).
    - Only an 'owner' can assign the 'owner' role.
    - Demoting the last active owner of the organization is strictly forbidden.
    - An audit activity log entry is written.
    """
    new_role = (payload.role or "").strip().lower()
    valid_roles = {"owner", "admin", "manager", "lead", "developer", "member", "viewer", "employee"}
    if new_role not in valid_roles:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role '{payload.role}'. Must be one of: {', '.join(sorted(valid_roles))}"
        )

    # Fetch target user in same organization
    u_res = await db.execute(
        select(User).where(
            User.id == user_id,
            User.organization_id == current_user.organization_id
        )
    )
    target_user = u_res.scalars().first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found in this organization")

    caller_role = (current_user.role or "").lower()

    # Disallow non-owners from promoting anyone to owner
    if new_role == "owner" and caller_role != "owner":
        raise HTTPException(status_code=403, detail="Only workspace owners can promote members to owner")

    # Disallow self-escalation / self role changes by admin
    if current_user.id == target_user.id and caller_role != "owner":
        raise HTTPException(status_code=403, detail="Self-escalation of roles is forbidden")

    old_role = (target_user.role or "").lower()

    # Prevent demoting the last owner
    if old_role == "owner" and new_role != "owner":
        owner_count_res = await db.execute(
            select(func.count(User.id)).where(
                User.organization_id == current_user.organization_id,
                User.role == "owner",
                User.is_active.is_(True)
            )
        )
        owner_count = owner_count_res.scalar() or 0
        if owner_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot demote the last organization owner")

    target_user.role = new_role

    # Audit logging
    logger.info(
        "AUDIT: Member role changed. Target user: %s, Old role: %s, New role: %s, Actor: %s (%s)",
        target_user.id, old_role, new_role, current_user.id, current_user.email
    )

    # If there is a project in the organization, record ProjectActivity
    p_res = await db.execute(
        select(Project.id).where(Project.organization_id == current_user.organization_id).limit(1)
    )
    proj_id = p_res.scalars().first()
    if proj_id:
        act = ProjectActivity(
            project_id=proj_id,
            actor_id=current_user.id,
            action="role_change",
            category="members",
            target_type="member",
            target_id=target_user.id,
            target_title=target_user.full_name,
            details=f"Role changed from '{old_role}' to '{new_role}' by {current_user.full_name}",
        )
        db.add(act)

    await db.commit()
    await db.refresh(target_user)

    return {
        "success": True,
        "message": f"Updated role to {new_role}",
        "user": {
            "id": target_user.id,
            "full_name": target_user.full_name,
            "email": target_user.email,
            "role": target_user.role,
        }
    }
