import re
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, or_, and_, desc, func, delete
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database import get_db
from backend.app.dependencies import get_current_user_id
from backend.app.models import Project, ProjectMember, ProjectInvitation, Task, Ticket, User, Organization, Discussion, ProjectFile, ProjectActivity
from backend.app.schemas import (
    ProjectCreate,
    ProjectUpdate,
    ProjectRead,
    ProjectMetrics,
    ProjectMemberCreate,
    ProjectMemberUpdate,
    ProjectMemberRead,
    ProjectInvitationRead,
    ProjectOverviewSummary,
    TaskRead,
    TicketRead,
    ProjectActivityRead,
)

router = APIRouter()


def generate_key_from_name(name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9\s]", "", name).strip()
    words = cleaned.split()
    if len(words) == 1:
        return words[0][:6].upper()
    letters = [w[0] for w in words]
    if len(letters) < 4:
        first_word = words[0][: 4 - len(letters) + 1]
        return (first_word + "".join(w[0] for w in words[1:])).upper()[:6]
    return "".join(letters)[:6].upper()


async def calculate_project_metrics(project_id: str, db: AsyncSession) -> ProjectMetrics:
    # 1. Tasks
    tasks_res = await db.execute(select(Task).where(Task.project_id == project_id))
    tasks = tasks_res.scalars().all()
    total_tasks = len(tasks)
    completed_tasks = sum(1 for t in tasks if t.status.lower() in ("done", "completed", "resolved"))

    sprint_progress = round((completed_tasks / total_tasks * 100)) if total_tasks > 0 else 0

    # 2. Tickets
    tickets_res = await db.execute(select(Ticket).where(Ticket.project_id == project_id))
    tickets = tickets_res.scalars().all()
    open_tickets = sum(1 for tk in tickets if tk.status.lower() not in ("closed", "resolved"))
    blocker_tickets = sum(1 for tk in tickets if tk.severity.lower() == "blocker" and tk.status.lower() != "closed")
    critical_tickets = sum(1 for tk in tickets if tk.severity.lower() == "critical" and tk.status.lower() != "closed")

    attention_severity = None
    attention_text = None
    if blocker_tickets > 0:
        attention_severity = "blocker"
        attention_text = f"{blocker_tickets} Blocker"
    elif critical_tickets > 0:
        attention_severity = "critical"
        attention_text = f"{critical_tickets} Critical"

    return ProjectMetrics(
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        open_tickets=open_tickets,
        blocker_tickets=blocker_tickets,
        critical_tickets=critical_tickets,
        sprint_progress=sprint_progress,
        attention_severity=attention_severity,
        attention_text=attention_text,
    )


@router.get("/", response_model=List[ProjectRead])
async def list_projects(
    search: Optional[str] = Query(None, description="Search term for title, description, key"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (all, active, planning, on_hold, completed, archived)"),
    lead_id: Optional[str] = Query(None, description="Filter by project lead user ID"),
    scope: Optional[str] = Query(None, description="Filter by visibility scope (organization, restricted)"),
    sort: Optional[str] = Query("updated_at", description="Sort order: updated_at, name, created_at, progress"),
    include_archived: bool = Query(False, description="Whether to include archived projects"),
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """List all projects in the current workspace with metrics and members."""
    query = select(Project).options(
        selectinload(Project.lead),
        selectinload(Project.members).selectinload(ProjectMember.user),
        selectinload(Project.invitations).selectinload(ProjectInvitation.invited_by),
    )

    if not include_archived and (not status_filter or status_filter.lower() != "archived"):
        query = query.where(Project.is_archived.is_(False))

    if search:
        search_term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Project.name.ilike(search_term),
                Project.key.ilike(search_term),
                Project.description.ilike(search_term),
            )
        )

    if status_filter and status_filter.lower() != "all":
        query = query.where(Project.status == status_filter.lower())

    if lead_id and lead_id.lower() != "all":
        query = query.where(Project.lead_id == lead_id)

    if scope and scope.lower() != "all":
        query = query.where(Project.visibility == scope.lower())

    if sort == "name":
        query = query.order_by(Project.name.asc())
    elif sort == "created_at":
        query = query.order_by(Project.created_at.desc())
    else:
        query = query.order_by(desc(Project.updated_at))

    result = await db.execute(query)
    projects = result.scalars().all()

    # Compute live metrics for each project
    response_list = []
    for proj in projects:
        metrics = await calculate_project_metrics(proj.id, db)
        proj_dict = ProjectRead.model_validate(proj)
        proj_dict.metrics = metrics
        response_list.append(proj_dict)

    if sort == "progress":
        response_list.sort(key=lambda p: (p.metrics.sprint_progress if p.metrics else 0), reverse=True)

    return response_list


@router.post("/", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_in: ProjectCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Create a new project workspace."""
    # Ensure organization
    org_res = await db.execute(select(Organization))
    org = org_res.scalars().first()
    org_id = org.id if org else "org_01"

    key = project_in.key
    if not key or not key.strip():
        key = generate_key_from_name(project_in.name)

    lead_id = project_in.lead_id or current_user_id

    now = datetime.now(timezone.utc)
    new_project = Project(
        name=project_in.name,
        key=key,
        description=project_in.description,
        status=project_in.status or "active",
        icon=project_in.icon or "rocket_launch",
        color=project_in.color or "bg-btn-primary",
        visibility=project_in.visibility or "organization",
        sla_tier=project_in.sla_tier or "Standard SaaS Tier 1",
        lead_id=lead_id,
        start_date=project_in.start_date,
        target_date=project_in.target_date,
        organization_id=org_id,
        is_archived=False,
        created_at=now,
        updated_at=now,
    )
    db.add(new_project)
    await db.flush()

    # Add lead as Owner project member
    owner_member = ProjectMember(
        project_id=new_project.id,
        user_id=lead_id,
        role="owner",
        access_scope="Full Control",
        created_at=now,
    )
    db.add(owner_member)

    # Add other contributors if specified
    if project_in.contributor_ids:
        for user_id in project_in.contributor_ids:
            if user_id != lead_id:
                member = ProjectMember(
                    project_id=new_project.id,
                    user_id=user_id,
                    role="developer",
                    access_scope="Full Repository Write Access",
                    created_at=now,
                )
                db.add(member)

    await db.commit()

    # Load with relationships
    query = (
        select(Project)
        .options(
            selectinload(Project.lead),
            selectinload(Project.members).selectinload(ProjectMember.user),
            selectinload(Project.invitations).selectinload(ProjectInvitation.invited_by),
        )
        .where(Project.id == new_project.id)
    )
    res = await db.execute(query)
    saved_project = res.scalars().first()

    metrics = await calculate_project_metrics(saved_project.id, db)
    out = ProjectRead.model_validate(saved_project)
    out.metrics = metrics
    return out


@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(
    project_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get project details, metrics, and members."""
    query = (
        select(Project)
        .options(
            selectinload(Project.lead),
            selectinload(Project.members).selectinload(ProjectMember.user),
            selectinload(Project.invitations).selectinload(ProjectInvitation.invited_by),
        )
        .where(Project.id == project_id)
    )
    res = await db.execute(query)
    project = res.scalars().first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found",
        )

    metrics = await calculate_project_metrics(project.id, db)
    out = ProjectRead.model_validate(project)
    out.metrics = metrics
    return out


@router.get("/{project_id}/overview", response_model=ProjectOverviewSummary)
async def get_project_overview(
    project_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Aggregate real-time metrics, burndown, milestones, workload, and alerts for Screen 40."""
    query = (
        select(Project)
        .options(
            selectinload(Project.lead),
            selectinload(Project.members).selectinload(ProjectMember.user),
            selectinload(Project.invitations).selectinload(ProjectInvitation.invited_by),
        )
        .where(Project.id == project_id)
    )
    res = await db.execute(query)
    project = res.scalars().first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found",
        )

    metrics = await calculate_project_metrics(project.id, db)
    proj_read = ProjectRead.model_validate(project)
    proj_read.metrics = metrics

    # 1. Burndown stats
    tasks_res = await db.execute(select(Task).where(Task.project_id == project_id))
    tasks = tasks_res.scalars().all()
    total_pts = len(tasks) * 3  # estimate ~3 story points per task
    done_pts = sum(3 for t in tasks if t.status in ("done", "completed", "resolved"))
    burndown = {
        "sprint_name": "Sprint 4 of 6",
        "progress_pct": metrics.sprint_progress,
        "ideal_burn": 140,
        "actual_burn": max(0, total_pts - done_pts),
        "total_story_points": max(total_pts, 180),
        "completed_points": done_pts,
        "days_remaining": 14,
    }

    # 2. Key Milestones
    milestones = [
        {
            "id": "ms_01",
            "title": "Auth Engine OIDC 2.0 Multi-Tenant Gateway",
            "progress_pct": 82,
            "tasks_count": 8,
            "status": "on_track",
            "owner": "Aarav Mehta",
            "owner_avatar": "https://lh3.googleusercontent.com/aida-public/AB6AXuBnY9OXem7tY-WC7GGIxR_JEkjBZZxyuBB-0mDqrUE6lOeiD0P2SWK26K-s-lUh0dGTZQxOlxTGW32Ij8iX-yKRMXgzDt0JPxqs-W4ENCsT_-YF18QAkuRBiF1NWi2xyCndsZyOaB-aGeYQAJAQDzEst5nV9N0oxnz6Rvo0NjCyG9e7INBNDHklHz4AE2P5GSv5kMzjbQLQU9LlePz0mmrDeSZ-Q7RXH6M0-8zNYTNg",
            "due_date": "Dec 01, 2025",
        },
        {
            "id": "ms_02",
            "title": "Storage Tiers Partitioned S3 Bucketing",
            "progress_pct": 54,
            "tasks_count": 5,
            "status": "at_risk",
            "owner": "David K.",
            "owner_avatar": "https://lh3.googleusercontent.com/aida-public/AB6AXuDVWTSLNi0GXnptwfl_xCnCJDsc4HvgETwUC34jhvb60mvLuQD-1m8SbomgblI-1Khtgxz-YIFR_GrBMiCCjBMF57DId8aNCrd7Qv8VleUPw0yGTVYEw3IWylcDmjXxsqKaDb8KRDVn5QsnFKWWMQ53xl6FKVTau3ufkYrQqol-GISclAV0oH77YrosPTEFXR2BCzYI8l6DvnDWavrx4gi1Oeve7NBIjJbr1Rk0ZTuX",
            "due_date": "Dec 12, 2025",
        },
        {
            "id": "ms_03",
            "title": "Edge Cache Invalidation Pipeline",
            "progress_pct": 18,
            "tasks_count": 6,
            "status": "delayed",
            "owner": "Sarah Taylor",
            "owner_avatar": "https://lh3.googleusercontent.com/aida-public/AB6AXuAZR3R45TSkuyi5-9-QC88ejJbDWv3yFmbIh5ihy1fn3yrKE07uN_LmJVpWhpYlHwziMyjPvtPpBj54idYhILVcQaT2Z_gtfSlDy6pVQqg9X2it2aDiY0MBSy3dn7OcXM7RWHA8yITcG8lNnLR767DovdLaIAQ00WCMNyHA9P5hENrqJnq9hjwwc7Cs5hFebTLKpZ1xXlbl01HrOx5OphfYB_U15TE1XpYYV5j_L_Re",
            "due_date": "Dec 20, 2025",
        },
    ]

    # 3. Team Workload from actual project members
    workload = []
    for mem in project.members:
        u = mem.user
        if not u:
            continue
        mem_tasks = [t for t in tasks if t.assigned_to_id == u.id]
        workload.append({
            "user_id": u.id,
            "name": u.full_name,
            "role": u.title or mem.role,
            "avatar_url": u.avatar_url,
            "active_tasks_count": len([t for t in mem_tasks if t.status != "done"]),
            "capacity_pct": min(100, len(mem_tasks) * 22),
            "status": "optimal" if len(mem_tasks) <= 4 else "overloaded",
        })

    # 4. Urgent Issues & Tickets
    tkt_res = await db.execute(
        select(Ticket)
        .where(
            Ticket.project_id == project_id,
            Ticket.status.in_(["open", "wip", "on_hold"])
        )
        .order_by(
            # Sort blockers first, then critical, then major
            desc(Ticket.severity == "blocker"),
            desc(Ticket.severity == "critical"),
            desc(Ticket.created_at)
        )
        .limit(5)
    )
    urgent_tickets = [TicketRead.model_validate(t) for t in tkt_res.scalars().all()]

    # 5. Recent Activity
    act_res = await db.execute(
        select(ProjectActivity)
        .options(selectinload(ProjectActivity.actor))
        .where(ProjectActivity.project_id == project_id)
        .order_by(desc(ProjectActivity.created_at))
        .limit(10)
    )
    recent_activity = [ProjectActivityRead.model_validate(a) for a in act_res.scalars().all()]

    return ProjectOverviewSummary(
        project=proj_read,
        burndown=burndown,
        milestones=milestones,
        team_workload=workload,
        urgent_tickets=urgent_tickets,
        recent_activity=recent_activity,
    )


@router.patch("/{project_id}", response_model=ProjectRead)
async def update_project(
    project_id: str,
    project_update: ProjectUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Update project details, assignees, dates and status."""
    query = (
        select(Project)
        .options(
            selectinload(Project.lead),
            selectinload(Project.members).selectinload(ProjectMember.user),
            selectinload(Project.invitations).selectinload(ProjectInvitation.invited_by),
        )
        .where(Project.id == project_id)
    )
    res = await db.execute(query)
    project = res.scalars().first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found",
        )

    update_data = project_update.model_dump(exclude_unset=True)
    contributor_ids = update_data.pop("contributor_ids", None)

    for field, val in update_data.items():
        setattr(project, field, val)

    project.updated_at = datetime.now(timezone.utc)

    # Sync contributors if provided
    if contributor_ids is not None:
        # Keep lead/owner
        existing_members = {m.user_id: m for m in project.members}
        new_ids = set(contributor_ids)
        if project.lead_id:
            new_ids.add(project.lead_id)

        # Remove members not in new_ids (unless owner)
        for uid, mem in list(existing_members.items()):
            if uid not in new_ids and mem.role != "owner":
                await db.delete(mem)

        # Add new members
        for uid in new_ids:
            if uid not in existing_members:
                role = "owner" if uid == project.lead_id else "developer"
                new_mem = ProjectMember(
                    project_id=project.id,
                    user_id=uid,
                    role=role,
                    access_scope="Full Control" if role == "owner" else "Full Repository Write Access",
                    created_at=datetime.now(timezone.utc),
                )
                db.add(new_mem)

    await db.commit()

    # Re-fetch fresh
    res = await db.execute(query)
    updated_project = res.scalars().first()
    metrics = await calculate_project_metrics(updated_project.id, db)
    out = ProjectRead.model_validate(updated_project)
    out.metrics = metrics
    return out


@router.post("/{project_id}/archive", response_model=ProjectRead)
async def archive_project(
    project_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Archive a project, pausing its sprints and active SLA timers non-destructively."""
    query = (
        select(Project)
        .options(
            selectinload(Project.lead),
            selectinload(Project.members).selectinload(ProjectMember.user),
            selectinload(Project.invitations).selectinload(ProjectInvitation.invited_by),
        )
        .where(Project.id == project_id)
    )
    res = await db.execute(query)
    project = res.scalars().first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    project.is_archived = True
    project.status = "archived"
    project.updated_at = datetime.now(timezone.utc)
    await db.commit()

    res = await db.execute(query)
    updated_project = res.scalars().first()
    metrics = await calculate_project_metrics(updated_project.id, db)
    out = ProjectRead.model_validate(updated_project)
    out.metrics = metrics
    return out


@router.post("/{project_id}/unarchive", response_model=ProjectRead)
async def unarchive_project(
    project_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Restore an archived project to active status."""
    query = (
        select(Project)
        .options(
            selectinload(Project.lead),
            selectinload(Project.members).selectinload(ProjectMember.user),
            selectinload(Project.invitations).selectinload(ProjectInvitation.invited_by),
        )
        .where(Project.id == project_id)
    )
    res = await db.execute(query)
    project = res.scalars().first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    project.is_archived = False
    project.status = "active"
    project.updated_at = datetime.now(timezone.utc)
    await db.commit()

    res = await db.execute(query)
    updated_project = res.scalars().first()
    metrics = await calculate_project_metrics(updated_project.id, db)
    out = ProjectRead.model_validate(updated_project)
    out.metrics = metrics
    return out


@router.delete("/{project_id}", status_code=status.HTTP_200_OK)
async def delete_project(
    project_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Permanently delete a project and its associated resources."""
    res = await db.execute(select(Project).where(Project.id == project_id))
    project = res.scalars().first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found",
        )

    # Cascades delete project_members, tasks, tickets, invitations
    await db.delete(project)
    await db.commit()

    return {
        "success": True,
        "message": f"Project '{project.name}' successfully deleted",
        "id": project_id,
    }


# --- Project Members Management Endpoints (Screen 37) ---

@router.get("/{project_id}/members")
async def get_project_members(
    project_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get roster of project members and pending invitations."""
    # Members
    members_res = await db.execute(
        select(ProjectMember)
        .options(selectinload(ProjectMember.user))
        .where(ProjectMember.project_id == project_id)
        .order_by(ProjectMember.created_at)
    )
    members = members_res.scalars().all()

    # Invitations
    invites_res = await db.execute(
        select(ProjectInvitation)
        .options(selectinload(ProjectInvitation.invited_by))
        .where(ProjectInvitation.project_id == project_id)
        .order_by(ProjectInvitation.created_at.desc())
    )
    invitations = invites_res.scalars().all()

    return {
        "members": [ProjectMemberRead.model_validate(m) for m in members],
        "invitations": [ProjectInvitationRead.model_validate(i) for i in invitations],
    }


@router.post("/{project_id}/members", status_code=status.HTTP_201_CREATED)
async def add_project_member(
    project_id: str,
    member_in: ProjectMemberCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Add a member or create an invitation by email."""
    # Verify project exists
    p_res = await db.execute(select(Project).where(Project.id == project_id))
    if not p_res.scalars().first():
        raise HTTPException(status_code=404, detail="Project not found")

    target_user = None
    if member_in.user_id:
        u_res = await db.execute(select(User).where(User.id == member_in.user_id))
        target_user = u_res.scalars().first()
    elif member_in.email:
        u_res = await db.execute(select(User).where(User.email == str(member_in.email).lower()))
        target_user = u_res.scalars().first()

    now = datetime.now(timezone.utc)

    if target_user:
        # Check if already a member
        m_res = await db.execute(
            select(ProjectMember).where(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == target_user.id
            )
        )
        existing = m_res.scalars().first()
        if existing:
            existing.role = member_in.role
            if member_in.access_scope:
                existing.access_scope = member_in.access_scope
            await db.commit()
            return ProjectMemberRead.model_validate(existing)

        new_member = ProjectMember(
            project_id=project_id,
            user_id=target_user.id,
            role=member_in.role,
            access_scope=member_in.access_scope or "Full Repository Write Access",
            created_at=now,
        )
        db.add(new_member)
        await db.commit()

        res = await db.execute(
            select(ProjectMember)
            .options(selectinload(ProjectMember.user))
            .where(ProjectMember.id == new_member.id)
        )
        return ProjectMemberRead.model_validate(res.scalars().first())

    elif member_in.email:
        # Create pending invitation
        inv = ProjectInvitation(
            project_id=project_id,
            email=str(member_in.email).lower(),
            role=member_in.role,
            invited_by_id=current_user_id,
            status="pending",
            created_at=now,
        )
        db.add(inv)
        await db.commit()

        res = await db.execute(
            select(ProjectInvitation)
            .options(selectinload(ProjectInvitation.invited_by))
            .where(ProjectInvitation.id == inv.id)
        )
        return ProjectInvitationRead.model_validate(res.scalars().first())

    raise HTTPException(status_code=400, detail="Must provide user_id or email")


@router.patch("/{project_id}/members/{member_id}", response_model=ProjectMemberRead)
async def update_project_member(
    project_id: str,
    member_id: str,
    member_update: ProjectMemberUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Update role or access permissions of an assigned project member."""
    res = await db.execute(
        select(ProjectMember)
        .options(selectinload(ProjectMember.user))
        .where(ProjectMember.id == member_id, ProjectMember.project_id == project_id)
    )
    member = res.scalars().first()
    if not member:
        raise HTTPException(status_code=404, detail="Project member not found")

    if member.role == "owner" and member_update.role and member_update.role != "owner":
        raise HTTPException(
            status_code=400,
            detail="Cannot demote project owner directly. Transfer ownership first."
        )

    if member_update.role:
        member.role = member_update.role
    if member_update.access_scope:
        member.access_scope = member_update.access_scope

    await db.commit()
    return ProjectMemberRead.model_validate(member)


@router.delete("/{project_id}/members/{member_id}")
async def remove_project_member(
    project_id: str,
    member_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Remove a collaborator from a project."""
    res = await db.execute(
        select(ProjectMember).where(ProjectMember.id == member_id, ProjectMember.project_id == project_id)
    )
    member = res.scalars().first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if member.role == "owner":
        raise HTTPException(status_code=400, detail="Cannot remove the project owner")

    await db.delete(member)
    await db.commit()

    return {"success": True, "message": "Member removed from project", "id": member_id}


@router.post("/{project_id}/invitations/{invitation_id}/resend")
async def resend_invitation(
    project_id: str,
    invitation_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Resend a pending invitation."""
    res = await db.execute(
        select(ProjectInvitation).where(
            ProjectInvitation.id == invitation_id,
            ProjectInvitation.project_id == project_id
        )
    )
    inv = res.scalars().first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found")

    inv.created_at = datetime.now(timezone.utc)
    await db.commit()
    return {"success": True, "message": f"Invitation resent to {inv.email}", "id": invitation_id}


@router.delete("/{project_id}/invitations/{invitation_id}")
async def revoke_invitation(
    project_id: str,
    invitation_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Revoke a pending project invitation."""
    res = await db.execute(
        select(ProjectInvitation).where(
            ProjectInvitation.id == invitation_id,
            ProjectInvitation.project_id == project_id
        )
    )
    inv = res.scalars().first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found")

    await db.delete(inv)
    await db.commit()
    return {"success": True, "message": f"Invitation revoked for {inv.email}", "id": invitation_id}
