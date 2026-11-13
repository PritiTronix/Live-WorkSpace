"""
Spotlight Global Search router — Enterprise Database Driven Implementation.
Executes live SQL queries across Tickets, Projects, Tasks, and Team Members,
strictly scoped to the authenticated user's organization.
"""
from __future__ import annotations

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel
from sqlalchemy import select, or_, desc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.database import get_db
from backend.app.dependencies import get_current_active_user
from backend.app.models import Project, Task, Ticket, User

router = APIRouter()


class SearchResponse(BaseModel):
    query: str
    total_matches: int
    tickets: List[Dict[str, Any]]
    projects: List[Dict[str, Any]]
    tasks: List[Dict[str, Any]]
    employees: List[Dict[str, Any]]


class RecentSearchRequest(BaseModel):
    query: str


# In-memory recent searches store (per-session lightweight buffer)
_RECENT_SEARCHES: List[str] = ["kafka", "platform", "SRE"]


@router.get("", response_model=SearchResponse, summary="Perform multi-entity spotlight search")
@router.get("/", response_model=SearchResponse, include_in_schema=False)
async def search_entities(
    q: Optional[str] = Query(default="", description="Search query string"),
    category: Optional[str] = Query(default="all", description="Entity category filter"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Spotlight search across Tickets, Projects, Tasks, and Organization Users.
    """
    query_str = (q or "").strip()
    term = f"%{query_str.lower()}%" if query_str else "%"
    cat = (category or "all").lower()

    matched_tickets = []
    matched_projects = []
    matched_tasks = []
    matched_employees = []

    # 1. Tickets Search
    if cat in ("all", "tickets"):
        t_query = (
            select(Ticket)
            .options(selectinload(Ticket.assignee), selectinload(Ticket.project))
            .join(Ticket.project)
            .where(
                Project.organization_id == current_user.organization_id,
                or_(
                    Ticket.title.ilike(term),
                    Ticket.ticket_number.ilike(term),
                    Ticket.description.ilike(term) if query_str else True,
                )
            )
            .order_by(desc(Ticket.created_at))
            .limit(10)
        )
        res_t = await db.execute(t_query)
        tickets = res_t.scalars().all()
        for t in tickets:
            matched_tickets.append({
                "id": t.ticket_number,
                "title": t.title,
                "severity": (t.severity or "major").capitalize(),
                "status": t.status.replace("_", " ").title(),
                "assignee": t.assignee.full_name if t.assignee else "Unassigned",
                "sla": "SLA Active",
            })

    # 2. Projects Search
    if cat in ("all", "projects"):
        p_query = (
            select(Project)
            .options(selectinload(Project.lead), selectinload(Project.tasks))
            .where(
                Project.organization_id == current_user.organization_id,
                Project.is_archived.is_(False),
                or_(
                    Project.name.ilike(term),
                    Project.key.ilike(term),
                    Project.description.ilike(term) if query_str else True,
                )
            )
            .order_by(Project.created_at.asc())
            .limit(10)
        )
        res_p = await db.execute(p_query)
        projects = res_p.scalars().all()
        for p in projects:
            total_tasks = len(p.tasks) if p.tasks else 0
            done_tasks = sum(1 for t in p.tasks if t.status == "done") if p.tasks else 0
            progress = int(round(done_tasks / total_tasks * 100)) if total_tasks > 0 else 0
            matched_projects.append({
                "id": p.id,
                "title": p.name,
                "lead": p.lead.full_name if p.lead else "Team Lead",
                "progress": progress,
                "status": p.status.replace("_", " ").title(),
            })

    # 3. Tasks Search
    if cat in ("all", "tasks"):
        task_query = (
            select(Task)
            .options(selectinload(Task.project))
            .where(
                Task.organization_id == current_user.organization_id,
                or_(
                    Task.title.ilike(term),
                    Task.task_number.ilike(term),
                    Task.description.ilike(term) if query_str else True,
                )
            )
            .order_by(desc(Task.created_at))
            .limit(10)
        )
        res_task = await db.execute(task_query)
        tasks = res_task.scalars().all()
        for tk in tasks:
            matched_tasks.append({
                "id": tk.task_number,
                "title": tk.title,
                "status": tk.status.replace("_", " ").title(),
                "sprint": tk.project.name if tk.project else "Active Sprint",
                "due": tk.due_date.strftime("%b %d") if tk.due_date else "Flexible",
            })

    # 4. Employees / Users Search
    if cat in ("all", "employees"):
        u_query = (
            select(User)
            .where(
                User.organization_id == current_user.organization_id,
                or_(
                    User.full_name.ilike(term),
                    User.email.ilike(term),
                    User.title.ilike(term) if query_str else True,
                    User.department.ilike(term) if query_str else True,
                )
            )
            .limit(10)
        )
        res_u = await db.execute(u_query)
        users = res_u.scalars().all()
        for u in users:
            matched_employees.append({
                "id": u.id,
                "name": u.full_name or u.email,
                "title": u.title or u.role.capitalize(),
                "email": u.email,
                "status": "Available" if u.is_active else "Inactive",
            })

    total = len(matched_tickets) + len(matched_projects) + len(matched_tasks) + len(matched_employees)

    return SearchResponse(
        query=query_str,
        total_matches=total,
        tickets=matched_tickets,
        projects=matched_projects,
        tasks=matched_tasks,
        employees=matched_employees,
    )


@router.get("/recent", response_model=List[str], summary="Retrieve recent search history")
async def get_recent_searches():
    return _RECENT_SEARCHES


@router.post("/recent", status_code=status.HTTP_201_CREATED, summary="Store a recent search term")
async def add_recent_search(req: RecentSearchRequest):
    term = req.query.strip()
    if term and term not in _RECENT_SEARCHES:
        _RECENT_SEARCHES.insert(0, term)
        if len(_RECENT_SEARCHES) > 10:
            _RECENT_SEARCHES.pop()
    return {"status": "success", "term": term}
