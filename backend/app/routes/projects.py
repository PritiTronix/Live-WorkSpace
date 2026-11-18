import re
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, or_, and_, desc, func, delete, case
from sqlalchemy.orm import selectinload, joinedload, noload
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database import get_db
from backend.app.dependencies import get_current_active_user, get_current_user_id, require_roles
from backend.app.models import (
    Project,
    ProjectMember,
    ProjectInvitation,
    Task,
    Ticket,
    User,
    Organization,
    Discussion,
    ProjectFile,
    ProjectActivity,
    ProjectMilestone,
    ProjectSprint,
)
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


def check_project_lead_or_org_admin(project: Project, current_user: User):
    """
    RBAC rule: only the project lead, an organization admin, or owner
    can invite, change roles, or remove members. Returns 403 for everyone else.
    """
    is_org_admin_or_owner = (current_user.role or "").lower() in ("owner", "admin")
    is_project_lead = project.lead_id == current_user.id
    if not (is_org_admin_or_owner or is_project_lead):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only the project lead, an organization admin, or owner can manage project members."
        )


async def calculate_project_metrics(project_id: str, db: AsyncSession, organization_id: Optional[str] = None) -> ProjectMetrics:
    task_filter = [Task.project_id == project_id]
    ticket_filter = [Ticket.project_id == project_id]
    disc_filter = [Discussion.project_id == project_id]
    file_filter = [ProjectFile.project_id == project_id]

    if organization_id:
        task_filter.append(Task.organization_id == organization_id)

    metrics_stmt = select(
        select(func.count(Task.id)).where(*task_filter).scalar_subquery().label("total_tasks"),
        select(func.count(Task.id)).where(
            *task_filter,
            func.lower(Task.status).in_(["done", "completed", "resolved"])
        ).scalar_subquery().label("completed_tasks"),
        select(func.count(Ticket.id)).where(
            *ticket_filter,
            ~func.lower(Ticket.status).in_(["closed", "resolved"])
        ).scalar_subquery().label("open_tickets"),
        select(func.count(Ticket.id)).where(
            *ticket_filter,
            func.lower(Ticket.severity) == "blocker",
            func.lower(Ticket.status) != "closed"
        ).scalar_subquery().label("blocker_tickets"),
        select(func.count(Ticket.id)).where(
            *ticket_filter,
            func.lower(Ticket.severity) == "critical",
            func.lower(Ticket.status) != "closed"
        ).scalar_subquery().label("critical_tickets"),
        select(func.count(Discussion.id)).where(*disc_filter).scalar_subquery().label("total_discussions"),
        select(func.count(ProjectFile.id)).where(*file_filter).scalar_subquery().label("total_files"),
    )
    row = (await db.execute(metrics_stmt)).one()

    def _to_int(val):
        try:
            return int(val)
        except (TypeError, ValueError):
            return 0

    total_tasks = _to_int(getattr(row, "total_tasks", 0))
    completed_tasks = _to_int(getattr(row, "completed_tasks", 0))
    sprint_progress = round((completed_tasks / total_tasks * 100)) if total_tasks > 0 else 0
    open_tickets = _to_int(getattr(row, "open_tickets", 0))
    blocker_tickets = _to_int(getattr(row, "blocker_tickets", 0))
    critical_tickets = _to_int(getattr(row, "critical_tickets", 0))
    total_discussions = _to_int(getattr(row, "total_discussions", 0))
    total_files = _to_int(getattr(row, "total_files", 0))

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
        total_discussions=total_discussions,
        total_files=total_files,
        attention_severity=attention_severity,
        attention_text=attention_text,
    )


@router.get("", response_model=List[ProjectRead])
@router.get("/", response_model=List[ProjectRead], include_in_schema=False)
async def list_projects(
    search: Optional[str] = Query(None, description="Search term for title, description, key"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (all, active, planning, on_hold, completed, archived)"),
    lead_id: Optional[str] = Query(None, description="Filter by project lead user ID"),
    scope: Optional[str] = Query(None, description="Filter by visibility scope (organization, restricted)"),
    sort: Optional[str] = Query("updated_at", description="Sort order: updated_at, name, created_at, progress"),
    include_archived: bool = Query(False, description="Whether to include archived projects"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all projects in the caller's organization.
    Guarantees strict tenant isolation and batches metrics computation (no N+1).
    """
    query = select(Project).options(
        selectinload(Project.lead),
        selectinload(Project.members).selectinload(ProjectMember.user),
        selectinload(Project.invitations).selectinload(ProjectInvitation.invited_by),
    ).where(Project.organization_id == current_user.organization_id)

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

    if not projects:
        return []

    project_ids = [p.id for p in projects]

    # Batch load tasks and tickets across projects in 2 queries to eliminate N+1 problem, strictly tenant-scoped
    tasks_res = await db.execute(
        select(Task).where(
            Task.project_id.in_(project_ids),
            Task.organization_id == current_user.organization_id,
        )
    )
    all_tasks = tasks_res.scalars().all()
    tasks_by_proj: Dict[str, list] = {pid: [] for pid in project_ids}
    for t in all_tasks:
        if t.project_id in tasks_by_proj:
            tasks_by_proj[t.project_id].append(t)

    tickets_res = await db.execute(
        select(Ticket).where(
            Ticket.project_id.in_(project_ids),
        )
    )
    all_tickets = tickets_res.scalars().all()
    tickets_by_proj: Dict[str, list] = {pid: [] for pid in project_ids}
    for tk in all_tickets:
        if tk.project_id in tickets_by_proj:
            tickets_by_proj[tk.project_id].append(tk)

    response_list = []
    for proj in projects:
        p_tasks = tasks_by_proj.get(proj.id, [])
        p_tickets = tickets_by_proj.get(proj.id, [])

        total_tasks = len(p_tasks)
        completed_tasks = sum(1 for t in p_tasks if (t.status or "").lower() in ("done", "completed", "resolved"))
        sprint_progress = round((completed_tasks / total_tasks * 100)) if total_tasks > 0 else 0

        open_tickets = sum(1 for tk in p_tickets if (tk.status or "").lower() not in ("closed", "resolved"))
        blocker_tickets = sum(1 for tk in p_tickets if (tk.severity or "").lower() == "blocker" and (tk.status or "").lower() != "closed")
        critical_tickets = sum(1 for tk in p_tickets if (tk.severity or "").lower() == "critical" and (tk.status or "").lower() != "closed")

        attention_severity = None
        attention_text = None
        if blocker_tickets > 0:
            attention_severity = "blocker"
            attention_text = f"{blocker_tickets} Blocker"
        elif critical_tickets > 0:
            attention_severity = "critical"
            attention_text = f"{critical_tickets} Critical"

        metrics = ProjectMetrics(
            total_tasks=total_tasks,
            completed_tasks=completed_tasks,
            open_tickets=open_tickets,
            blocker_tickets=blocker_tickets,
            critical_tickets=critical_tickets,
            sprint_progress=sprint_progress,
            attention_severity=attention_severity,
            attention_text=attention_text,
        )

        proj_dict = ProjectRead.model_validate(proj)
        proj_dict.metrics = metrics
        response_list.append(proj_dict)

    if sort == "progress":
        response_list.sort(key=lambda p: (p.metrics.sprint_progress if p.metrics else 0), reverse=True)

    return response_list


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=ProjectRead, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_project(
    project_in: ProjectCreate,
    current_user: User = Depends(require_roles(["owner", "admin", "manager", "lead"])),
    db: AsyncSession = Depends(get_db)
):
    """Create a new project workspace bound strictly to caller's organization."""
    org_id = current_user.organization_id
    if not org_id:
        raise HTTPException(status_code=400, detail="User must belong to an organization to create projects")

    key = project_in.key
    if not key or not key.strip():
        key = generate_key_from_name(project_in.name)

    lead_id = project_in.lead_id or current_user.id
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

    metrics = await calculate_project_metrics(saved_project.id, db, current_user.organization_id)
    out = ProjectRead.model_validate(saved_project)
    out.metrics = metrics
    return out


@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get project details, metrics, and members within caller's organization."""
    query = (
        select(Project)
        .options(
            selectinload(Project.lead),
            selectinload(Project.members).selectinload(ProjectMember.user),
            selectinload(Project.invitations).selectinload(ProjectInvitation.invited_by),
        )
        .where(
            or_(Project.id == project_id, Project.key == project_id),
            Project.organization_id == current_user.organization_id
        )
    )
    res = await db.execute(query)
    project = res.scalars().first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found",
        )

    metrics = await calculate_project_metrics(project.id, db, current_user.organization_id)
    out = ProjectRead.model_validate(project)
    out.metrics = metrics
    return out


@router.get("/{project_id}/activity", response_model=List[ProjectActivityRead])
async def get_project_activity(
    project_id: str,
    category: Optional[str] = Query(None),
    actor_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Screen 45: Get activity events for a specific project."""
    proj_res = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.organization_id == current_user.organization_id
        )
    )
    if not proj_res.scalars().first():
        raise HTTPException(status_code=404, detail="Project not found")

    query = select(ProjectActivity).where(ProjectActivity.project_id == project_id)
    if category and category.lower() != "all":
        query = query.where(ProjectActivity.category == category)
    if actor_id and actor_id.lower() != "all":
        query = query.where(ProjectActivity.actor_id == actor_id)
    if search:
        s = f"%{search.strip()}%"
        query = query.where(ProjectActivity.description.ilike(s))

    query = query.order_by(desc(ProjectActivity.created_at))
    res = await db.execute(query)
    return res.scalars().all()


async def _get_scoped_project(project_id: str, org_id: str, db: AsyncSession) -> Project:
    query = (
        select(Project)
        .options(
            joinedload(Project.lead),
            selectinload(Project.members).joinedload(ProjectMember.user),
        )
        .where(
            or_(Project.id == project_id, Project.key == project_id),
            Project.organization_id == org_id
        )
    )
    res = await db.execute(query)
    project = res.scalars().first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found",
        )
    if "invitations" not in project.__dict__:
        project.__dict__["invitations"] = []
    return project


async def fetch_burndown(project_id: str, db: AsyncSession) -> Optional[Dict[str, Any]]:
    try:
        sprints_res = await db.execute(
            select(ProjectSprint)
            .where(ProjectSprint.project_id == project_id, ProjectSprint.status == "active")
            .order_by(desc(ProjectSprint.created_at))
            .limit(1)
        )
        active_sprint = sprints_res.scalars().first()
        if active_sprint:
            now = datetime.now(timezone.utc)
            days_rem = (active_sprint.end_date - now).days if active_sprint.end_date else None
            return {
                "sprint_name": active_sprint.name,
                "progress_pct": round(active_sprint.completed_points / active_sprint.target_points * 100) if active_sprint.target_points > 0 else 0,
                "total_story_points": active_sprint.target_points,
                "completed_points": active_sprint.completed_points,
                "days_remaining": max(0, days_rem) if days_rem is not None else 0,
                "has_data": True,
            }
    except Exception:
        pass
    return None


async def fetch_milestones(project_id: str, db: AsyncSession) -> List[Dict[str, Any]]:
    try:
        ms_res = await db.execute(
            select(ProjectMilestone)
            .options(joinedload(ProjectMilestone.owner))
            .where(ProjectMilestone.project_id == project_id)
            .order_by(ProjectMilestone.due_date.asc().nulls_last())
        )
        now = datetime.now(timezone.utc)
        milestones = []
        for m in ms_res.scalars().all():
            m_status = m.status or "planned"
            if m.due_date and m.due_date < now and (m.progress_pct or 0) < 100 and m_status == "on_track":
                m_status = "overdue"
            milestones.append({
                "id": m.id,
                "title": m.title,
                "progress_pct": m.progress_pct or 0,
                "status": m_status,
                "owner": m.owner.full_name if m.owner else "Unassigned",
                "owner_avatar": m.owner.avatar_url if m.owner else None,
                "due_date": m.due_date.strftime("%b %d, %Y") if m.due_date else None,
            })
        return milestones
    except Exception:
        return []


async def fetch_workload(project_id: str, org_id: str, members: List[ProjectMember], db: AsyncSession) -> List[Dict[str, Any]]:
    workload_res = await db.execute(
        select(
            Task.assignee_id,
            func.count(Task.id).label("total"),
            func.count(case((~func.lower(Task.status).in_(["done", "completed", "resolved"]), 1))).label("active"),
        )
        .where(Task.project_id == project_id, Task.organization_id == org_id)
        .group_by(Task.assignee_id)
    )
    workload_stats = {row[0]: (row[1], row[2]) for row in workload_res.all()}

    workload = []
    for mem in members:
        u = mem.user
        if not u:
            continue
        tot_count, active_count = workload_stats.get(u.id, (0, 0))
        workload.append({
            "user_id": u.id,
            "name": u.full_name,
            "role": u.title or mem.role,
            "avatar_url": u.avatar_url,
            "active_tasks_count": active_count,
            "capacity_pct": min(100, tot_count * 22),
            "status": "optimal" if tot_count <= 4 else "overloaded",
        })
    return workload


async def fetch_urgent_tickets(project_id: str, db: AsyncSession) -> List[TicketRead]:
    tkt_res = await db.execute(
        select(Ticket)
        .options(
            joinedload(Ticket.assignee),
            joinedload(Ticket.reporter),
            noload(Ticket.comments),
            noload(Ticket.attachments),
            noload(Ticket.activities),
        )
        .where(
            Ticket.project_id == project_id,
            Ticket.status.in_(["open", "wip", "on_hold"])
        )
        .order_by(
            desc(Ticket.severity == "blocker"),
            desc(Ticket.severity == "critical"),
            desc(Ticket.created_at)
        )
        .limit(5)
    )
    return [TicketRead.model_validate(t) for t in tkt_res.scalars().all()]


async def fetch_recent_activity(project_id: str, db: AsyncSession) -> List[ProjectActivityRead]:
    act_res = await db.execute(
        select(ProjectActivity)
        .options(joinedload(ProjectActivity.actor))
        .where(ProjectActivity.project_id == project_id)
        .order_by(desc(ProjectActivity.created_at))
        .limit(10)
    )
    return [ProjectActivityRead.model_validate(a) for a in act_res.scalars().all()]


@router.get("/{project_id}/overview", response_model=ProjectOverviewSummary)
async def get_project_overview(
    project_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Aggregate real-time metrics, burndown, milestones, workload, and alerts for Screen 40."""
    project = await _get_scoped_project(project_id, current_user.organization_id, db)

    metrics = await calculate_project_metrics(project.id, db, current_user.organization_id)
    proj_read = ProjectRead.model_validate(project)
    proj_read.metrics = metrics

    burndown = await fetch_burndown(project.id, db)
    milestones = await fetch_milestones(project.id, db)
    workload = await fetch_workload(project.id, current_user.organization_id, project.members, db)
    urgent_tickets = await fetch_urgent_tickets(project.id, db)
    recent_activity = await fetch_recent_activity(project.id, db)

    return ProjectOverviewSummary(
        project=proj_read,
        burndown=burndown,
        milestones=milestones,
        team_workload=workload,
        urgent_tickets=urgent_tickets,
        recent_activity=recent_activity,
    )


@router.get("/{project_id}/overview/burndown")
async def get_overview_burndown(
    project_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    project = await _get_scoped_project(project_id, current_user.organization_id, db)
    return await fetch_burndown(project.id, db)


@router.get("/{project_id}/overview/milestones")
async def get_overview_milestones(
    project_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    project = await _get_scoped_project(project_id, current_user.organization_id, db)
    return await fetch_milestones(project.id, db)


@router.get("/{project_id}/overview/workload")
async def get_overview_workload(
    project_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    project = await _get_scoped_project(project_id, current_user.organization_id, db)
    return await fetch_workload(project.id, current_user.organization_id, project.members, db)


@router.get("/{project_id}/overview/urgent-tickets", response_model=List[TicketRead])
async def get_overview_urgent_tickets(
    project_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    project = await _get_scoped_project(project_id, current_user.organization_id, db)
    return await fetch_urgent_tickets(project.id, db)


@router.get("/{project_id}/overview/activity", response_model=List[ProjectActivityRead])
async def get_overview_activity(
    project_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    project = await _get_scoped_project(project_id, current_user.organization_id, db)
    return await fetch_recent_activity(project.id, db)


@router.patch("/{project_id}", response_model=ProjectRead)
async def update_project(
    project_id: str,
    project_update: ProjectUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Update project details within caller's organization."""
    query = (
        select(Project)
        .options(
            selectinload(Project.lead),
            selectinload(Project.members).selectinload(ProjectMember.user),
            selectinload(Project.invitations).selectinload(ProjectInvitation.invited_by),
        )
        .where(
            or_(Project.id == project_id, Project.key == project_id),
            Project.organization_id == current_user.organization_id
        )
    )
    res = await db.execute(query)
    project = res.scalars().first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found",
        )

    # RBAC: Only project lead, organization admin, or owner can edit project settings
    user_role = (current_user.role or "").lower()
    is_org_admin = user_role in ("owner", "admin")
    is_project_lead = project.lead_id == current_user.id
    if not (is_org_admin or is_project_lead):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the project lead, organization admin, or owner can edit project settings.",
        )

    update_data = project_update.model_dump(exclude_unset=True)
    contributor_ids = update_data.pop("contributor_ids", None)

    for field, val in update_data.items():
        setattr(project, field, val)

    project.updated_at = datetime.now(timezone.utc)

    if contributor_ids is not None:
        existing_members = {m.user_id: m for m in project.members}
        new_ids = set(contributor_ids)
        if project.lead_id:
            new_ids.add(project.lead_id)

        for uid, mem in list(existing_members.items()):
            if uid not in new_ids and mem.role != "owner":
                await db.delete(mem)

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

    res = await db.execute(query)
    updated_project = res.scalars().first()
    metrics = await calculate_project_metrics(updated_project.id, db, current_user.organization_id)
    out = ProjectRead.model_validate(updated_project)
    out.metrics = metrics
    return out


@router.post("/{project_id}/archive", response_model=ProjectRead)
async def archive_project(
    project_id: str,
    current_user: User = Depends(require_roles(["owner", "admin", "lead", "manager"])),
    db: AsyncSession = Depends(get_db)
):
    """Archive a project non-destructively. Requires manager/admin/owner role."""
    query = (
        select(Project)
        .options(
            selectinload(Project.lead),
            selectinload(Project.members).selectinload(ProjectMember.user),
            selectinload(Project.invitations).selectinload(ProjectInvitation.invited_by),
        )
        .where(
            or_(Project.id == project_id, Project.key == project_id),
            Project.organization_id == current_user.organization_id
        )
    )
    res = await db.execute(query)
    project = res.scalars().first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    project.is_archived = True
    project.status = "archived"
    project.updated_at = datetime.now(timezone.utc)
    await db.commit()

    res = await db.execute(query)
    updated_project = res.scalars().first()
    metrics = await calculate_project_metrics(updated_project.id, db, current_user.organization_id)
    out = ProjectRead.model_validate(updated_project)
    out.metrics = metrics
    return out


@router.post("/{project_id}/unarchive", response_model=ProjectRead)
async def unarchive_project(
    project_id: str,
    current_user: User = Depends(require_roles(["owner", "admin", "lead", "manager"])),
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
        .where(
            or_(Project.id == project_id, Project.key == project_id),
            Project.organization_id == current_user.organization_id
        )
    )
    res = await db.execute(query)
    project = res.scalars().first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    project.is_archived = False
    project.status = "active"
    project.updated_at = datetime.now(timezone.utc)
    await db.commit()

    res = await db.execute(query)
    updated_project = res.scalars().first()
    metrics = await calculate_project_metrics(updated_project.id, db, current_user.organization_id)
    out = ProjectRead.model_validate(updated_project)
    out.metrics = metrics
    return out


@router.delete("/{project_id}", status_code=status.HTTP_200_OK)
async def delete_project(
    project_id: str,
    current_user: User = Depends(require_roles(["owner", "admin"])),
    db: AsyncSession = Depends(get_db)
):
    """Permanently delete a project. Enforces Owner/Admin RBAC."""
    res = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.organization_id == current_user.organization_id
        )
    )
    project = res.scalars().first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found",
        )

    await db.delete(project)
    await db.commit()

    return {
        "success": True,
        "message": f"Project '{project.name}' successfully deleted",
        "id": project_id,
    }


@router.get("/{project_id}/members")
async def get_project_members(
    project_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get roster of project members and pending invitations within organization."""
    # Ensure project belongs to current organization
    p_check = await db.execute(
        select(Project)
        .options(selectinload(Project.lead))
        .where(
            Project.id == project_id,
            Project.organization_id == current_user.organization_id
        )
    )
    project = p_check.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    members_res = await db.execute(
        select(ProjectMember)
        .options(selectinload(ProjectMember.user))
        .where(ProjectMember.project_id == project_id)
        .order_by(ProjectMember.created_at)
    )
    members = list(members_res.scalars().all())

    # Guarantee single source of truth: if project has a lead who is not yet in project_members, insert as owner
    if project.lead_id and not any(m.user_id == project.lead_id for m in members):
        lead_mem = ProjectMember(
            project_id=project.id,
            user_id=project.lead_id,
            role="owner",
            access_scope="Full Control",
            created_at=project.created_at or datetime.now(timezone.utc),
        )
        db.add(lead_mem)
        await db.commit()
        members_res = await db.execute(
            select(ProjectMember)
            .options(selectinload(ProjectMember.user))
            .where(ProjectMember.project_id == project_id)
            .order_by(ProjectMember.created_at)
        )
        members = list(members_res.scalars().all())

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
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Add a member or create an invitation by email to project.
    Scoped strictly to caller's organization.
    Only project lead, org admin, or owner can invite members (403 for others).
    """
    p_res = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.organization_id == current_user.organization_id
        )
    )
    project = p_res.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    check_project_lead_or_org_admin(project, current_user)

    target_user = None
    if member_in.user_id:
        u_res = await db.execute(
            select(User).where(
                User.id == member_in.user_id,
                User.organization_id == current_user.organization_id
            )
        )
        target_user = u_res.scalars().first()
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found in organization")
    elif member_in.email:
        u_res = await db.execute(
            select(User).where(
                User.email == str(member_in.email).lower(),
                User.organization_id == current_user.organization_id
            )
        )
        target_user = u_res.scalars().first()

    now = datetime.now(timezone.utc)
    normalized_role = (member_in.role or "developer").lower()

    if target_user:
        m_res = await db.execute(
            select(ProjectMember).where(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == target_user.id
            )
        )
        existing = m_res.scalars().first()
        if existing:
            if (existing.role == "owner" or existing.user_id == project.lead_id) and normalized_role != "owner":
                raise HTTPException(status_code=400, detail="Cannot demote the project owner or lead.")
            existing.role = normalized_role
            if member_in.access_scope:
                existing.access_scope = member_in.access_scope
            await db.commit()
            return ProjectMemberRead.model_validate(existing)

        new_member = ProjectMember(
            project_id=project_id,
            user_id=target_user.id,
            role=normalized_role,
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
        inv = ProjectInvitation(
            project_id=project_id,
            email=str(member_in.email).lower(),
            role=normalized_role,
            invited_by_id=current_user.id,
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
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update role or access permissions of an assigned project member.
    Enforces project lead, org admin, or owner RBAC (403 for others).
    Project owner/lead cannot be demoted.
    """
    p_check = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.organization_id == current_user.organization_id
        )
    )
    project = p_check.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    check_project_lead_or_org_admin(project, current_user)

    res = await db.execute(
        select(ProjectMember)
        .options(selectinload(ProjectMember.user))
        .where(ProjectMember.id == member_id, ProjectMember.project_id == project_id)
    )
    member = res.scalars().first()
    if not member:
        raise HTTPException(status_code=404, detail="Project member not found")

    is_owner_or_lead = member.role == "owner" or member.user_id == project.lead_id
    if is_owner_or_lead and member_update.role and member_update.role.lower() != "owner":
        raise HTTPException(
            status_code=400,
            detail="Cannot demote project owner directly. Transfer ownership first."
        )

    if member_update.role:
        member.role = member_update.role.lower()
    if member_update.access_scope:
        member.access_scope = member_update.access_scope

    await db.commit()
    return ProjectMemberRead.model_validate(member)


@router.delete("/{project_id}/members/{member_id}")
async def remove_project_member(
    project_id: str,
    member_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Remove a collaborator from a project.
    Enforces project lead, org admin, or owner RBAC (403 for others).
    Project owner/lead cannot be removed.
    """
    p_check = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.organization_id == current_user.organization_id
        )
    )
    project = p_check.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    check_project_lead_or_org_admin(project, current_user)

    res = await db.execute(
        select(ProjectMember).where(ProjectMember.id == member_id, ProjectMember.project_id == project_id)
    )
    member = res.scalars().first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if member.role == "owner" or member.user_id == project.lead_id:
        raise HTTPException(status_code=400, detail="Cannot remove the project owner")

    await db.delete(member)
    await db.commit()

    return {"success": True, "message": "Member removed from project", "id": member_id}


@router.post("/{project_id}/invitations/{invitation_id}/resend")
async def resend_invitation(
    project_id: str,
    invitation_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Resend a pending invitation. Enforces project lead / org admin RBAC."""
    p_check = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.organization_id == current_user.organization_id
        )
    )
    project = p_check.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    check_project_lead_or_org_admin(project, current_user)

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
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Revoke a pending project invitation. Enforces project lead / org admin RBAC."""
    p_check = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.organization_id == current_user.organization_id
        )
    )
    project = p_check.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    check_project_lead_or_org_admin(project, current_user)

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
