"""
Metrics Service — Centralized Platform & Operational Metric Calculations.
Enterprise multi-tenant implementation providing shared single sources of truth
for tasks, tickets, completion rates, and user workloads.
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models import Task, Ticket, Project, User


async def get_my_tasks_count(
    db: AsyncSession,
    user_id: str,
    organization_id: str,
    project_id: Optional[str] = None,
    period_start: Optional[datetime] = None,
    department: Optional[str] = None,
    status: Optional[str] = None,
) -> int:
    """
    Unified definition of 'My Tasks':
    Total number of tasks assigned to the specified user (Task.assignee_id == user_id)
    strictly within their tenant organization (Task.organization_id == organization_id),
    honoring any project, department, period, or status filters.
    """
    conditions = [
        Task.organization_id == organization_id,
        Task.assignee_id == user_id,
    ]
    if project_id and project_id.lower() != "all":
        conditions.append(Task.project_id == project_id)
    if period_start:
        conditions.append(Task.created_at >= period_start)
    if status and status.lower() != "all":
        stat_val = status.lower()
        conditions.append(
            func.lower(Task.status).in_([
                stat_val,
                stat_val.replace("to_do", "todo"),
                stat_val.replace("todo", "to_do"),
            ])
        )
    q = select(func.count(Task.id)).where(*conditions)
    if department:
        q = q.join(User, Task.assignee_id == User.id).where(
            User.organization_id == organization_id,
            User.department.ilike(department.strip()),
        )
    res = await db.execute(q)
    return res.scalar() or 0


async def get_my_tasks_stats(
    db: AsyncSession,
    user_id: str,
    organization_id: str,
    project_id: Optional[str] = None,
    period_start: Optional[datetime] = None,
    department: Optional[str] = None,
) -> Dict[str, int]:
    """
    Comprehensive workflow status breakdown of 'My Tasks':
    assigned (total), todo, in_progress, done, and due_today.
    """
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    conditions = [
        Task.organization_id == organization_id,
        Task.assignee_id == user_id,
    ]
    if project_id and project_id.lower() != "all":
        conditions.append(Task.project_id == project_id)
    if period_start:
        conditions.append(Task.created_at >= period_start)

    q = select(Task).where(*conditions)
    if department:
        q = q.join(User, Task.assignee_id == User.id).where(
            User.organization_id == organization_id,
            User.department.ilike(department.strip()),
        )

    res = await db.execute(q)
    tasks = res.scalars().all()

    total = len(tasks)
    todo = sum(1 for t in tasks if (t.status or "").lower() in ("todo", "to_do"))
    in_progress = sum(1 for t in tasks if (t.status or "").lower() == "in_progress")
    done = sum(1 for t in tasks if (t.status or "").lower() == "done")

    due_today = 0
    for t in tasks:
        if t.due_date:
            due_dt = t.due_date if t.due_date.tzinfo else t.due_date.replace(tzinfo=timezone.utc)
            if today_start <= due_dt <= today_end:
                due_today += 1

    return {
        "total": total,
        "todo": todo,
        "in_progress": in_progress,
        "done": done,
        "due_today": due_today,
    }


async def get_total_tasks_count(
    db: AsyncSession,
    organization_id: str,
    project_id: Optional[str] = None,
    period_start: Optional[datetime] = None,
    department: Optional[str] = None,
) -> int:
    """
    Unified definition of 'Total Tasks':
    Total number of tasks within the tenant organization (Task.organization_id == organization_id),
    honoring active project, department, and period filters.
    """
    conditions = [Task.organization_id == organization_id]
    if project_id and project_id.lower() != "all":
        conditions.append(Task.project_id == project_id)
    if period_start:
        conditions.append(Task.created_at >= period_start)

    q = select(func.count(Task.id)).where(*conditions)
    if department:
        q = q.join(User, Task.assignee_id == User.id).where(
            User.organization_id == organization_id,
            User.department.ilike(department.strip()),
        )
    res = await db.execute(q)
    return res.scalar() or 0


async def get_tasks_completion_percentage(
    db: AsyncSession,
    organization_id: str,
    project_id: Optional[str] = None,
    period_start: Optional[datetime] = None,
    department: Optional[str] = None,
) -> Optional[float]:
    """
    Unified definition of 'Tasks Completion %':
    Ratio of tasks with status 'done' over total tasks within the organization,
    expressed as a percentage rounded to 1 decimal place. Returns None if total tasks is 0.
    """
    total = await get_total_tasks_count(db, organization_id, project_id, period_start, department)
    if total == 0:
        return None

    conditions = [
        Task.organization_id == organization_id,
        func.lower(Task.status) == "done",
    ]
    if project_id and project_id.lower() != "all":
        conditions.append(Task.project_id == project_id)
    if period_start:
        conditions.append(Task.created_at >= period_start)

    q = select(func.count(Task.id)).where(*conditions)
    if department:
        q = q.join(User, Task.assignee_id == User.id).where(
            User.organization_id == organization_id,
            User.department.ilike(department.strip()),
        )
    res = await db.execute(q)
    done_count = res.scalar() or 0

    return round((done_count / total) * 100.0, 1)


async def get_open_tickets_count(
    db: AsyncSession,
    organization_id: str,
    project_id: Optional[str] = None,
    period_start: Optional[datetime] = None,
    department: Optional[str] = None,
) -> int:
    """
    Unified definition of 'Open Tickets':
    Total number of tickets within the organization's projects with status 'open'.
    """
    conditions = [
        Project.organization_id == organization_id,
        func.lower(Ticket.status) == "open",
    ]
    if project_id and project_id.lower() != "all":
        conditions.append(Ticket.project_id == project_id)
    if period_start:
        conditions.append(Ticket.created_at >= period_start)

    q = select(func.count(Ticket.id)).join(Ticket.project).where(*conditions)
    if department:
        q = q.join(User, Ticket.assignee_id == User.id).where(
            User.organization_id == organization_id,
            User.department.ilike(department.strip()),
        )
    res = await db.execute(q)
    return res.scalar() or 0


async def get_work_in_progress_count(
    db: AsyncSession,
    organization_id: str,
    project_id: Optional[str] = None,
    period_start: Optional[datetime] = None,
    department: Optional[str] = None,
) -> int:
    """
    Unified definition of 'Work in Progress' (WIP):
    Total number of tickets within the organization's projects with status 'wip'.
    """
    conditions = [
        Project.organization_id == organization_id,
        func.lower(Ticket.status).in_(["wip", "in_progress"]),
    ]
    if project_id and project_id.lower() != "all":
        conditions.append(Ticket.project_id == project_id)
    if period_start:
        conditions.append(Ticket.created_at >= period_start)

    q = select(func.count(Ticket.id)).join(Ticket.project).where(*conditions)
    if department:
        q = q.join(User, Ticket.assignee_id == User.id).where(
            User.organization_id == organization_id,
            User.department.ilike(department.strip()),
        )
    res = await db.execute(q)
    return res.scalar() or 0
