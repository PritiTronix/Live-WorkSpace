"""
Spotlight Global Search router — Enterprise Database Driven Implementation.
Executes live SQL queries across Tickets, Projects, Tasks, Team Members, and Comments,
strictly scoped to the authenticated user's organization.
"""
from __future__ import annotations

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import select, or_, func, desc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.database import get_db
from backend.app.dependencies import get_current_active_user
from backend.app.models import (
    Project,
    Task,
    Ticket,
    User,
    TicketComment,
    TaskComment,
    Discussion,
    DiscussionComment,
)

router = APIRouter()


class RecentSearchRequest(BaseModel):
    query: str


# In-memory recent searches store keyed by user_id
_USER_RECENT_SEARCHES: Dict[str, List[str]] = {}


def escape_ilike(val: str) -> str:
    """Escape SQL ILIKE wildcard characters (% and _) and backslash."""
    return val.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


@router.get("", summary="Perform multi-entity spotlight search")
@router.get("/", include_in_schema=False)
async def search_entities(
    q: Optional[str] = Query(default="", description="Search query string"),
    type: Optional[str] = Query(default=None, description="Entity category filter"),
    category: Optional[str] = Query(default=None, description="Alias for type filter"),
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=20, ge=1, le=100, description="Results limit per category"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Spotlight search across Tickets, Projects, Tasks, Organization Users, and Comments.
    Strictly scoped to current_user.organization_id.
    """
    if not current_user.organization_id:
        return JSONResponse(
            status_code=400,
            content={"error": {"code": "ORG_REQUIRED", "message": "User is not associated with an organization."}},
        )

    query_str = (q or "").strip()
    if len(query_str) < 2:
        return JSONResponse(
            status_code=400,
            content={"error": {"code": "QUERY_TOO_SHORT", "message": "Search query must be at least 2 characters long."}},
        )

    search_type = (type or category or "all").lower().strip()
    valid_types = {"all", "tickets", "projects", "tasks", "employees", "comments"}
    if search_type not in valid_types:
        return JSONResponse(
            status_code=400,
            content={
                "error": {
                    "code": "INVALID_TYPE",
                    "message": f"Invalid search type '{search_type}'. Must be one of: {', '.join(sorted(valid_types))}.",
                }
            },
        )

    capped_limit = min(max(1, limit), 50)
    offset = (page - 1) * capped_limit
    org_id = current_user.organization_id
    safe_term = f"%{escape_ilike(query_str)}%"

    # 1. Tickets Filter & Count
    ticket_where = (
        Project.organization_id == org_id,
        or_(
            Ticket.title.ilike(safe_term, escape="\\"),
            Ticket.ticket_number.ilike(safe_term, escape="\\"),
            Ticket.description.ilike(safe_term, escape="\\"),
        ),
    )
    res_t_count = await db.execute(
        select(func.count(Ticket.id)).join(Ticket.project).where(*ticket_where)
    )
    tickets_count = res_t_count.scalar() or 0

    # 2. Projects Filter & Count
    project_where = (
        Project.organization_id == org_id,
        Project.is_archived.is_(False),
        or_(
            Project.name.ilike(safe_term, escape="\\"),
            Project.key.ilike(safe_term, escape="\\"),
            Project.description.ilike(safe_term, escape="\\"),
        ),
    )
    res_p_count = await db.execute(
        select(func.count(Project.id)).where(*project_where)
    )
    projects_count = res_p_count.scalar() or 0

    # 3. Tasks Filter & Count
    task_where = (
        Task.organization_id == org_id,
        or_(
            Task.title.ilike(safe_term, escape="\\"),
            Task.task_number.ilike(safe_term, escape="\\"),
            Task.description.ilike(safe_term, escape="\\"),
        ),
    )
    res_task_count = await db.execute(
        select(func.count(Task.id)).where(*task_where)
    )
    tasks_count = res_task_count.scalar() or 0

    # 4. Employees Filter & Count
    employee_where = (
        User.organization_id == org_id,
        or_(
            User.full_name.ilike(safe_term, escape="\\"),
            User.email.ilike(safe_term, escape="\\"),
            User.title.ilike(safe_term, escape="\\"),
            User.department.ilike(safe_term, escape="\\"),
        ),
    )
    res_u_count = await db.execute(
        select(func.count(User.id)).where(*employee_where)
    )
    employees_count = res_u_count.scalar() or 0

    # 5. Comments Filter & Count across Ticket, Task, and Discussion comments
    t_comment_where = (
        Project.organization_id == org_id,
        TicketComment.content.ilike(safe_term, escape="\\"),
    )
    res_tc_count = await db.execute(
        select(func.count(TicketComment.id))
        .join(TicketComment.ticket)
        .join(Ticket.project)
        .where(*t_comment_where)
    )
    t_comments_count = res_tc_count.scalar() or 0

    task_comment_where = (
        Task.organization_id == org_id,
        TaskComment.body.ilike(safe_term, escape="\\"),
    )
    res_tkc_count = await db.execute(
        select(func.count(TaskComment.id))
        .join(TaskComment.task)
        .where(*task_comment_where)
    )
    task_comments_count = res_tkc_count.scalar() or 0

    disc_comment_where = (
        Project.organization_id == org_id,
        DiscussionComment.content.ilike(safe_term, escape="\\"),
    )
    res_dc_count = await db.execute(
        select(func.count(DiscussionComment.id))
        .join(DiscussionComment.discussion)
        .join(Discussion.project)
        .where(*disc_comment_where)
    )
    disc_comments_count = res_dc_count.scalar() or 0
    comments_count = t_comments_count + task_comments_count + disc_comments_count

    all_count = tickets_count + projects_count + tasks_count + employees_count + comments_count
    counts = {
        "all": all_count,
        "tickets": tickets_count,
        "projects": projects_count,
        "tasks": tasks_count,
        "employees": employees_count,
        "comments": comments_count,
    }

    matched_tickets: List[Dict[str, Any]] = []
    matched_projects: List[Dict[str, Any]] = []
    matched_tasks: List[Dict[str, Any]] = []
    matched_employees: List[Dict[str, Any]] = []
    matched_comments: List[Dict[str, Any]] = []

    now = datetime.now(timezone.utc)

    # Fetch matching tickets
    if search_type in ("all", "tickets"):
        ticket_limit = capped_limit if search_type == "tickets" else min(capped_limit, 10)
        t_query = (
            select(Ticket)
            .options(
                selectinload(Ticket.assignee),
                selectinload(Ticket.project),
            )
            .join(Ticket.project)
            .where(*ticket_where)
            .order_by(desc(Ticket.created_at))
            .offset(offset if search_type == "tickets" else 0)
            .limit(ticket_limit)
        )
        res_t = await db.execute(t_query)
        for t in res_t.scalars().all():
            sla_badge = "SLA Active"
            sla_status = "active"
            if t.status.lower() in ("resolved", "closed"):
                sla_badge = "Resolved"
                sla_status = "resolved"
            elif t.deadline:
                t_dl = t.deadline if t.deadline.tzinfo else t.deadline.replace(tzinfo=timezone.utc)
                if t_dl < now:
                    diff_m = max(1, int((now - t_dl).total_seconds() // 60))
                    sla_badge = f"SLA Breached (-{diff_m}m)"
                    sla_status = "breached"
                else:
                    diff_h = int((t_dl - now).total_seconds() // 3600)
                    diff_m = int(((t_dl - now).total_seconds() % 3600) // 60)
                    sla_badge = f"{diff_h}h {diff_m}m SLA left" if diff_h > 0 else f"{diff_m}m SLA left"
                    sla_status = "warning" if (t_dl - now).total_seconds() < 3600 else "active"
            elif (t.severity or "").lower() == "blocker":
                sla_badge = "SLA Breached"
                sla_status = "breached"

            first_resp_str = None
            if t.first_response_at and t.created_at:
                diff_sec = (t.first_response_at - t.created_at).total_seconds()
                diff_mins = max(1, int(diff_sec // 60))
                first_resp_str = f"{diff_mins}m (Met)"

            matched_tickets.append({
                "id": t.id,
                "ticket_number": t.ticket_number,
                "title": t.title,
                "description": t.description or "",
                "severity": (t.severity or "major").lower(),
                "status": (t.status or "open").replace("_", " ").title(),
                "status_raw": (t.status or "open").lower(),
                "assignee": t.assignee.full_name if t.assignee else "Unassigned",
                "assignee_avatar": t.assignee.avatar_url if t.assignee else "",
                "project_id": t.project_id,
                "project_name": t.project.name if t.project else "",
                "created_at": t.created_at.isoformat() if t.created_at else None,
                "deadline": t.deadline.isoformat() if t.deadline else None,
                "first_response_at": t.first_response_at.isoformat() if t.first_response_at else None,
                "first_response_str": first_resp_str,
                "sla_badge": sla_badge,
                "sla_status": sla_status,
                "sla_tier": t.project.sla_tier if t.project else "Standard",
                "type": "ticket",
            })

    # Fetch matching projects
    if search_type in ("all", "projects"):
        project_limit = capped_limit if search_type == "projects" else min(capped_limit, 10)
        p_query = (
            select(Project)
            .options(
                selectinload(Project.lead),
                selectinload(Project.tasks),
                selectinload(Project.members),
            )
            .where(*project_where)
            .order_by(desc(Project.updated_at))
            .offset(offset if search_type == "projects" else 0)
            .limit(project_limit)
        )
        res_p = await db.execute(p_query)
        for p in res_p.scalars().all():
            total_tasks = len(p.tasks) if p.tasks else 0
            done_tasks = sum(1 for t in p.tasks if (t.status or "").lower() in ("done", "completed", "resolved")) if p.tasks else 0
            progress = int(round(done_tasks / total_tasks * 100)) if total_tasks > 0 else 0
            members_count = len(p.members) if p.members else 0

            matched_projects.append({
                "id": p.id,
                "key": p.key,
                "title": p.name,
                "name": p.name,
                "description": p.description or "",
                "lead": p.lead.full_name if p.lead else "No Lead Assigned",
                "lead_id": p.lead_id,
                "progress": progress,
                "status": (p.status or "active").replace("_", " ").title(),
                "status_raw": (p.status or "active").lower(),
                "members_count": members_count,
                "sla_tier": p.sla_tier,
                "type": "project",
            })

    # Fetch matching tasks
    if search_type in ("all", "tasks"):
        task_limit = capped_limit if search_type == "tasks" else min(capped_limit, 10)
        tk_query = (
            select(Task)
            .options(
                selectinload(Task.project),
                selectinload(Task.assignee),
            )
            .where(*task_where)
            .order_by(desc(Task.created_at))
            .offset(offset if search_type == "tasks" else 0)
            .limit(task_limit)
        )
        res_tk = await db.execute(tk_query)
        for tk in res_tk.scalars().all():
            matched_tasks.append({
                "id": tk.id,
                "task_number": tk.task_number,
                "title": tk.title,
                "description": tk.description or "",
                "status": (tk.status or "todo").replace("_", " ").title(),
                "status_raw": (tk.status or "todo").lower(),
                "priority": (tk.priority or "medium").lower(),
                "task_type": tk.task_type,
                "project_id": tk.project_id,
                "project_name": tk.project.name if tk.project else "Workspace",
                "due": tk.due_date.strftime("%b %d, %Y") if tk.due_date else "No due date",
                "due_date": tk.due_date.isoformat() if tk.due_date else None,
                "assignee": tk.assignee.full_name if tk.assignee else "Unassigned",
                "assignee_avatar": tk.assignee.avatar_url if tk.assignee else "",
                "type": "task",
            })

    # Fetch matching employees
    if search_type in ("all", "employees"):
        emp_limit = capped_limit if search_type == "employees" else min(capped_limit, 10)
        u_query = (
            select(User)
            .where(*employee_where)
            .order_by(User.full_name.asc())
            .offset(offset if search_type == "employees" else 0)
            .limit(emp_limit)
        )
        res_u = await db.execute(u_query)
        for u in res_u.scalars().all():
            matched_employees.append({
                "id": u.id,
                "name": u.full_name or u.email,
                "title": u.title or (u.role.capitalize() if u.role else "Team Member"),
                "email": u.email,
                "department": u.department or "",
                "role": u.role or "member",
                "is_active": u.is_active,
                "status": "Available" if u.is_active else "Inactive",
                "avatar": u.avatar_url or "",
                "type": "employee",
            })

    # Fetch matching comments
    if search_type in ("all", "comments"):
        comment_limit = capped_limit if search_type == "comments" else min(capped_limit, 10)
        # Ticket comments
        tc_query = (
            select(TicketComment)
            .options(
                selectinload(TicketComment.author),
                selectinload(TicketComment.ticket),
            )
            .join(TicketComment.ticket)
            .join(Ticket.project)
            .where(*t_comment_where)
            .order_by(desc(TicketComment.created_at))
            .limit(comment_limit)
        )
        res_tc = await db.execute(tc_query)
        for tc in res_tc.scalars().all():
            matched_comments.append({
                "id": tc.id,
                "content": tc.content,
                "author": tc.author.full_name if tc.author else "Author",
                "target_type": "ticket",
                "target_id": tc.ticket_id,
                "target_label": f"Ticket {tc.ticket.ticket_number}" if tc.ticket else "Ticket",
                "created_at": tc.created_at.isoformat() if tc.created_at else None,
                "type": "comment",
            })

        # Discussion comments
        dc_query = (
            select(DiscussionComment)
            .options(
                selectinload(DiscussionComment.author),
                selectinload(DiscussionComment.discussion),
            )
            .join(DiscussionComment.discussion)
            .join(Discussion.project)
            .where(*disc_comment_where)
            .order_by(desc(DiscussionComment.created_at))
            .limit(comment_limit)
        )
        res_dc = await db.execute(dc_query)
        for dc in res_dc.scalars().all():
            matched_comments.append({
                "id": dc.id,
                "content": dc.content,
                "author": dc.author.full_name if dc.author else "Author",
                "target_type": "discussion",
                "target_id": dc.discussion_id,
                "target_label": f"Discussion: {dc.discussion.title}" if dc.discussion else "Discussion",
                "created_at": dc.created_at.isoformat() if dc.created_at else None,
                "type": "comment",
            })

        # Task comments
        tkc_query = (
            select(TaskComment)
            .options(
                selectinload(TaskComment.author),
                selectinload(TaskComment.task),
            )
            .join(TaskComment.task)
            .where(*task_comment_where)
            .order_by(desc(TaskComment.created_at))
            .limit(comment_limit)
        )
        res_tkc = await db.execute(tkc_query)
        for tkc in res_tkc.scalars().all():
            matched_comments.append({
                "id": tkc.id,
                "content": tkc.body,
                "author": tkc.author.full_name if tkc.author else "Author",
                "target_type": "task",
                "target_id": tkc.task_id,
                "target_label": f"Task {tkc.task.task_number}" if tkc.task else "Task",
                "created_at": tkc.created_at.isoformat() if tkc.created_at else None,
                "type": "comment",
            })

        # Sort combined comments by created_at desc and cap to limit
        matched_comments.sort(key=lambda c: c.get("created_at") or "", reverse=True)
        matched_comments = matched_comments[:comment_limit]

    return {
        "query": query_str,
        "type": search_type,
        "category": search_type,
        "counts": counts,
        "total_matches": counts.get(search_type, all_count),
        "page": page,
        "limit": capped_limit,
        "tickets": matched_tickets,
        "projects": matched_projects,
        "tasks": matched_tasks,
        "employees": matched_employees,
        "comments": matched_comments,
        "results": {
            "tickets": matched_tickets,
            "projects": matched_projects,
            "tasks": matched_tasks,
            "employees": matched_employees,
            "comments": matched_comments,
        },
    }


@router.get("/recent", response_model=List[str], summary="Retrieve recent search history")
async def get_recent_searches(
    current_user: User = Depends(get_current_active_user),
):
    """Retrieve recent searches strictly scoped to the authenticated user."""
    return _USER_RECENT_SEARCHES.get(current_user.id, [])


@router.post("/recent", status_code=status.HTTP_201_CREATED, summary="Store a recent search term")
async def add_recent_search(
    req: RecentSearchRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Save a search term into user's recent searches."""
    term = req.query.strip()
    if term:
        user_list = _USER_RECENT_SEARCHES.setdefault(current_user.id, [])
        if term in user_list:
            user_list.remove(term)
        user_list.insert(0, term)
        if len(user_list) > 10:
            user_list.pop()
    return {"status": "success", "term": term}


@router.delete("/recent", summary="Clear recent searches")
async def clear_recent_searches(
    query: Optional[str] = Query(None, description="Specific term to remove, or omit to clear all"),
    current_user: User = Depends(get_current_active_user),
):
    """Clear all or remove a single search term for the authenticated user."""
    user_list = _USER_RECENT_SEARCHES.get(current_user.id, [])
    if query:
        term = query.strip()
        if term in user_list:
            user_list.remove(term)
    else:
        _USER_RECENT_SEARCHES[current_user.id] = []
    return {"status": "success"}
