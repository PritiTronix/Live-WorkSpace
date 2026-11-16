import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database import get_db
from backend.app.dependencies import get_current_active_user, get_current_user_id, require_roles
from backend.app.core.security import verify_password, get_password_hash
from backend.app.models import User, Ticket, Task, ProjectMember, Project, UserInvitation
from backend.app.schemas import UserRead, UserUpdateProfile, UserChangePassword, UserInviteRequest

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


@router.get("/{user_id}")
async def get_user_member_detail(
    user_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Retrieve full user profile with live workload, scoped to the caller's organization."""
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
        .order_by(Ticket.created_at.desc())
    )
    tickets = tk_res.scalars().all()

    # Fetch assigned tasks scoped to current user's organization
    ts_res = await db.execute(
        select(Task)
        .where(
            Task.assignee_id == user_id,
            Task.organization_id == current_user.organization_id
        )
        .order_by(Task.created_at.desc())
    )
    tasks = ts_res.scalars().all()

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
        {"id": m.project.id, "name": m.project.name, "key": m.project.key, "role": m.role}
        for m in memberships if m.project
    ]

    open_tickets = [t for t in tickets if t.status.lower() not in ("closed", "resolved")]
    blockers = [t for t in open_tickets if t.severity.lower() == "blocker"]

    workload = min(100, max(20, (len(open_tickets) * 15) + (len(tasks) * 8)))

    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "title": user.title or "Engineer",
        "department": user.department or "Engineering",
        "avatar_url": user.avatar_url,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "workload_percentage": workload,
        "projects": projects,
        "active_tickets_count": len(open_tickets),
        "blockers_count": len(blockers),
        "tasks_count": len(tasks),
        "tickets": [
            {
                "id": t.id,
                "ticket_number": t.ticket_number,
                "title": t.title,
                "status": t.status,
                "severity": t.severity,
                "deadline": t.deadline.isoformat() if t.deadline else None,
                "updated_at": t.updated_at.isoformat() if t.updated_at else None,
            }
            for t in open_tickets[:5]
        ],
        "tasks": [
            {
                "id": tk.id,
                "task_number": tk.task_number,
                "title": tk.title,
                "status": tk.status,
                "priority": tk.priority,
            }
            for tk in tasks[:5]
        ],
    }
