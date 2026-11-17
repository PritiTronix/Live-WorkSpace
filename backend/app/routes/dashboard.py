"""
Dashboard router — Enterprise Database Driven Implementation.
Replaces static in-memory mock objects with real-time SQL aggregations
strictly scoped to current user's organization.
"""
from __future__ import annotations

import csv
import io
import json
import time
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, status, Response, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func, desc, or_, and_, distinct
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

from backend.app.database import get_db
from backend.app.dependencies import get_current_active_user
from backend.app.models import Project, Task, Ticket, ProjectActivity, User, Organization
from backend.app.services.sla import is_active_sla_breach
from backend.app.core.websockets import ws_manager, authenticate_ws

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class DashboardMetrics(BaseModel):
    total_projects: int = 0
    projects_this_month: Optional[int] = None
    total_tasks: int = 0
    tasks_completion_rate: Optional[float] = None
    my_tasks: int = 0
    my_tasks_due_today: Optional[int] = None
    open_tickets: int = 0
    triage_count: Optional[int] = None
    work_in_progress: int = 0
    active_teams_count: Optional[int] = None
    active_squads_count: Optional[int] = None  # Alias for backward-compatibility
    on_hold: int = 0
    on_hold_subtext: Optional[str] = None
    sla_breached: int = 0
    sla_compliance_rate: Optional[float] = None


class TasksBreakdown(BaseModel):
    total: int = 0
    done: int = 0
    in_progress: int = 0
    in_review: int = 0
    to_do: int = 0
    completion_rate: float = 0.0


class TicketsSeverity(BaseModel):
    total_active: int = 0
    blocker: int = 0
    critical: int = 0
    major: int = 0
    minor: int = 0
    violations_24h: int = 0


class RollingDay(BaseModel):
    day: str
    count: int
    height: str


class SlaPerformance(BaseModel):
    adherence_rate: Optional[float] = None
    adherence_delta: Optional[str] = None
    average_mttr: str = "—"
    mttr_delta: Optional[str] = None
    resolved_rolling_total: int = 0
    rolling_days: List[RollingDay] = []


class ProjectProgressItem(BaseModel):
    id: str
    title: str
    progress: int
    teams: str
    squads: str  # Alias for backward-compatibility
    target: str
    is_overdue: bool = False
    status_color: str


class TeamWorkloadItem(BaseModel):
    name: str
    capacity: int  # Returns availability (100 - utilization)
    availability: Optional[int] = None
    utilization: Optional[int] = None
    status: str
    color: str
    desc: str


class PriorityTicketItem(BaseModel):
    id: str
    title: str
    severity: str
    severity_bg: str
    status: str
    status_color: str
    assignee_name: str
    assignee_avatar: str
    sla_text: str
    sla_class: str


class ActivityTimelineItem(BaseModel):
    id: str
    actor: str
    action: str
    target_id: str
    target_type: Optional[str] = None
    status_badge: Optional[str] = None
    status_color: Optional[str] = None
    dot_color: str = "bg-primary"
    meta: str = ""
    avatar: Optional[str] = None
    is_bot: Optional[bool] = False


class DashboardFiltersResponse(BaseModel):
    teams: List[str] = []
    projects: List[Dict[str, Any]] = []
    date_ranges: List[Dict[str, str]] = []


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def pluralize(count: int, singular: str, plural: Optional[str] = None) -> str:
    """Return '1 member' or '2 members' using single shared rule."""
    p = plural if plural else f"{singular}s"
    return f"{count} {singular if count == 1 else p}"


def calculate_team_capacity(active_items: int, member_count: int) -> dict:
    """
    Capacity & Availability Formula:
    - Baseline capacity assumption: 5 active concurrent items (tasks/tickets) per team member represents 100% workload utilization.
    - Utilization = min(100, round((active_items / (member_count * 5)) * 100)) if member_count > 0 else 0
    - Availability is 100% minus utilization (no work means 100% available).
    - When active_items == 0, utilization is 0%, meaning availability is 100%.
    - Returns availability percentage, utilization percentage, status text, and color badge.
    """
    safe_members = max(1, member_count)
    utilization = min(100, int(round((active_items / (safe_members * 5.0)) * 100))) if member_count > 0 else 0
    availability = max(0, 100 - utilization)

    if utilization >= 85:
        status_text = f"{availability}% Available (High Load)"
        color = "bg-severity-critical"
    elif utilization >= 40:
        status_text = f"{availability}% Available (Optimal)"
        color = "bg-primary-container"
    else:
        status_text = f"{availability}% Available"
        color = "bg-status-resolved"

    return {
        "utilization": utilization,
        "availability": availability,
        "status": status_text,
        "color": color,
    }


def _get_period_start(period: Optional[str], now: datetime) -> Optional[datetime]:
    if not period or period.lower().strip() in ("all", "all_time", "all-time", ""):
        return None
    p = period.lower().strip()
    if p in ("today",):
        return now.replace(hour=0, minute=0, second=0, microsecond=0)
    if p in ("this sprint", "this_sprint", "this week", "this_week"):
        days_since_monday = now.weekday()
        start = now - timedelta(days=days_since_monday)
        return start.replace(hour=0, minute=0, second=0, microsecond=0)
    if p in ("this month", "this_month"):
        return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if "q" in p or "quarter" in p or p in ("this quarter", "this_quarter"):
        quarter_month = ((now.month - 1) // 3) * 3 + 1
        return now.replace(month=quarter_month, day=1, hour=0, minute=0, second=0, microsecond=0)
    return None


# ---------------------------------------------------------------------------
# Filter Options Endpoint
# ---------------------------------------------------------------------------

@router.get("/filters", response_model=DashboardFiltersResponse, summary="Available dynamic filters for current organization")
async def get_dashboard_filters(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns available departments, active projects, and dynamic date ranges from real organization data."""
    org_id = current_user.organization_id
    now = datetime.now(timezone.utc)
    today = now.date()

    # 1. Real departments in organization - deduplicated and normalized (trimmed, case-insensitive)
    dept_res = await db.execute(
        select(User.department)
        .where(User.organization_id == org_id, User.department.isnot(None))
    )
    raw_depts = [d.strip() for d in dept_res.scalars().all() if d and d.strip()]
    seen_depts = set()
    depts = []
    for d in raw_depts:
        norm = d.lower()
        if norm not in seen_depts:
            seen_depts.add(norm)
            depts.append(d.title())
    depts.sort()

    # 2. Real active projects
    proj_res = await db.execute(
        select(Project.id, Project.name, Project.key, Project.color)
        .where(Project.organization_id == org_id, Project.is_archived.is_(False))
        .order_by(Project.name.asc())
    )
    projects = [
        {"id": row[0], "name": row[1], "key": row[2], "color": row[3]}
        for row in proj_res.all()
    ]

    # 3. Dynamic date ranges computed from today's date
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)

    import calendar
    _, last_day = calendar.monthrange(today.year, today.month)
    month_start = today.replace(day=1)
    month_end = today.replace(day=last_day)

    quarter = ((today.month - 1) // 3) + 1
    quarter_start_month = (quarter - 1) * 3 + 1
    quarter_end_month = quarter_start_month + 2
    _, q_last_day = calendar.monthrange(today.year, quarter_end_month)
    quarter_start = today.replace(month=quarter_start_month, day=1)
    quarter_end = today.replace(month=quarter_end_month, day=q_last_day)

    date_ranges = [
        {"id": "today", "label": "Today", "range": today.strftime("%b %d, %Y")},
        {"id": "this_week", "label": "This week", "range": f"{week_start.strftime('%b %d')} to {week_end.strftime('%b %d, %Y')}"},
        {"id": "this_month", "label": "This month", "range": f"{month_start.strftime('%b %d')} to {month_end.strftime('%b %d, %Y')}"},
        {"id": "this_quarter", "label": "This quarter", "range": f"{quarter_start.strftime('%b %d')} to {quarter_end.strftime('%b %d, %Y')}"},
    ]

    return DashboardFiltersResponse(
        teams=depts,
        projects=projects,
        date_ranges=date_ranges,
    )


# ---------------------------------------------------------------------------
# Aggregated Endpoints
# ---------------------------------------------------------------------------

@router.get("/metrics", response_model=DashboardMetrics, summary="Get summary metrics for home dashboard")
async def get_dashboard_metrics(
    project_id: Optional[str] = Query(None),
    project: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    team: Optional[str] = Query(None),
    period: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Aggregate total projects, tasks, user tasks, and ticket health from database."""
    org_id = current_user.organization_id
    eff_project_id = project_id or project
    eff_department = department or team
    now = datetime.now(timezone.utc)
    period_start = _get_period_start(period, now)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    # Projects count
    proj_q = select(func.count(Project.id)).where(Project.organization_id == org_id, Project.is_archived.is_(False))
    if eff_project_id:
        proj_q = proj_q.where(Project.id == eff_project_id)
    proj_res = await db.execute(proj_q)
    total_projects = proj_res.scalar() or 0

    # Projects created this month
    proj_month_q = select(func.count(Project.id)).where(
        Project.organization_id == org_id,
        Project.is_archived.is_(False),
        Project.created_at >= month_start
    )
    if eff_project_id:
        proj_month_q = proj_month_q.where(Project.id == eff_project_id)
    p_month_res = await db.execute(proj_month_q)
    projects_this_month = p_month_res.scalar() or 0

    # Tasks count
    tasks_q = select(Task).where(Task.organization_id == org_id)
    if eff_project_id:
        tasks_q = tasks_q.where(Task.project_id == eff_project_id)
    if period_start:
        tasks_q = tasks_q.where(Task.created_at >= period_start)
    if eff_department:
        tasks_q = tasks_q.join(User, Task.assignee_id == User.id).where(
            User.organization_id == org_id,
            User.department.ilike(eff_department.strip())
        )

    task_res = await db.execute(tasks_q)
    tasks = task_res.scalars().all()
    total_tasks = len(tasks)

    done_tasks = sum(1 for t in tasks if (t.status or "").lower() == "done")
    tasks_completion_rate = round(done_tasks / total_tasks * 100.0, 1) if total_tasks > 0 else None

    # My tasks
    my_tasks_list = [t for t in tasks if t.assignee_id == current_user.id]
    my_tasks = len(my_tasks_list)

    my_tasks_due_today = 0
    for t in my_tasks_list:
        if t.due_date:
            due_dt = t.due_date if t.due_date.tzinfo else t.due_date.replace(tzinfo=timezone.utc)
            if today_start <= due_dt <= today_end:
                my_tasks_due_today += 1

    # Tickets scoped to organization
    tickets_q = select(Ticket).join(Ticket.project).where(Project.organization_id == org_id)
    if eff_project_id:
        tickets_q = tickets_q.where(Ticket.project_id == eff_project_id)
    if period_start:
        tickets_q = tickets_q.where(Ticket.created_at >= period_start)
    if eff_department:
        tickets_q = tickets_q.join(User, Ticket.assignee_id == User.id).where(
            User.organization_id == org_id,
            User.department.ilike(eff_department.strip())
        )

    t_res = await db.execute(tickets_q)
    tickets = t_res.scalars().all()

    open_tickets = sum(1 for t in tickets if (t.status or "").lower() in ("open", "wip"))
    wip_tickets = sum(1 for t in tickets if (t.status or "").lower() == "wip")
    wip_tasks = sum(1 for t in tasks if (t.status or "").lower() == "in_progress")
    work_in_progress = wip_tickets + wip_tasks

    on_hold_count = sum(1 for t in tickets if (t.status or "").lower() == "on_hold")

    # Triage count: tickets that are Open and unassigned
    triage_count = sum(1 for t in tickets if (t.status or "").lower() == "open" and not t.assignee_id)

    # Active teams count: distinct active projects with WIP items
    active_project_ids = set()
    for t in tickets:
        if (t.status or "").lower() in ("open", "wip"):
            active_project_ids.add(t.project_id)
    for tk in tasks:
        if (tk.status or "").lower() == "in_progress" and tk.project_id:
            active_project_ids.add(tk.project_id)
    active_teams_count = len(active_project_ids) if active_project_ids else (1 if work_in_progress > 0 else 0)

    # SLA calculations from centralized active breach definition
    breached_count = sum(1 for t in tickets if is_active_sla_breach(t, now))
    tickets_with_timers = [t for t in tickets if t.deadline is not None]
    total_timers = len(tickets_with_timers)
    if total_timers > 0:
        compliance_rate = round(((total_timers - breached_count) / total_timers) * 100.0, 1)
    else:
        compliance_rate = None  # None indicates no timers exist, displays "—"

    return DashboardMetrics(
        total_projects=total_projects,
        projects_this_month=projects_this_month if projects_this_month > 0 else None,
        total_tasks=total_tasks,
        tasks_completion_rate=tasks_completion_rate,
        my_tasks=my_tasks,
        my_tasks_due_today=my_tasks_due_today if my_tasks_due_today > 0 else None,
        open_tickets=open_tickets,
        triage_count=triage_count if triage_count > 0 else None,
        work_in_progress=work_in_progress,
        active_teams_count=active_teams_count if active_teams_count > 0 else None,
        active_squads_count=active_teams_count if active_teams_count > 0 else None,
        on_hold=on_hold_count,
        on_hold_subtext=None,
        sla_breached=breached_count,
        sla_compliance_rate=compliance_rate,
    )


@router.get("/tasks-breakdown", response_model=TasksBreakdown, summary="Get task breakdown by status")
async def get_tasks_breakdown(
    project_id: Optional[str] = Query(None),
    project: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    team: Optional[str] = Query(None),
    period: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Breakdown tasks by status and calculate real completion rate."""
    eff_project_id = project_id or project
    eff_department = department or team
    now = datetime.now(timezone.utc)
    period_start = _get_period_start(period, now)
    org_id = current_user.organization_id

    tasks_q = select(Task.status).where(Task.organization_id == org_id)
    if eff_project_id:
        tasks_q = tasks_q.where(Task.project_id == eff_project_id)
    if period_start:
        tasks_q = tasks_q.where(Task.created_at >= period_start)
    if eff_department:
        tasks_q = tasks_q.join(User, Task.assignee_id == User.id).where(
            User.organization_id == org_id,
            User.department.ilike(eff_department.strip())
        )

    t_res = await db.execute(tasks_q)
    statuses = [(s or "").lower() for s in t_res.scalars().all() if s]

    total = len(statuses)
    done_count = sum(1 for s in statuses if s == "done")
    in_prog = sum(1 for s in statuses if s == "in_progress")
    in_rev = sum(1 for s in statuses if s == "in_review")
    todo_count = sum(1 for s in statuses if s in ("todo", "to_do"))

    rate = round((done_count / total * 100), 1) if total > 0 else 0.0

    return TasksBreakdown(
        total=total,
        done=done_count,
        in_progress=in_prog,
        in_review=in_rev,
        to_do=todo_count,
        completion_rate=rate,
    )


@router.get("/tickets-severity", response_model=TicketsSeverity, summary="Get ticket counts by severity")
async def get_tickets_severity(
    project_id: Optional[str] = Query(None),
    project: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    team: Optional[str] = Query(None),
    period: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Active tickets grouped by severity with recent breach violations."""
    eff_project_id = project_id or project
    eff_department = department or team
    now = datetime.now(timezone.utc)
    period_start = _get_period_start(period, now)
    twenty_four_hours_ago = now - timedelta(hours=24)
    org_id = current_user.organization_id

    tickets_q = (
        select(Ticket)
        .join(Ticket.project)
        .where(
            Project.organization_id == org_id,
            Ticket.status.notin_(["resolved", "closed"]),
        )
    )
    if eff_project_id:
        tickets_q = tickets_q.where(Ticket.project_id == eff_project_id)
    if period_start:
        tickets_q = tickets_q.where(Ticket.created_at >= period_start)
    if eff_department:
        tickets_q = tickets_q.join(User, Ticket.assignee_id == User.id).where(
            User.organization_id == org_id,
            User.department.ilike(eff_department.strip())
        )

    res = await db.execute(tickets_q)
    active_tickets = res.scalars().all()

    blocker = sum(1 for t in active_tickets if (t.severity or "").lower() == "blocker")
    critical = sum(1 for t in active_tickets if (t.severity or "").lower() == "critical")
    major = sum(1 for t in active_tickets if (t.severity or "").lower() == "major")
    minor = sum(1 for t in active_tickets if (t.severity or "").lower() == "minor")

    # Real 24h violations: tickets that breached in the last 24h
    violations_24h = 0
    for t in active_tickets:
        if t.deadline:
            dl = t.deadline if t.deadline.tzinfo else t.deadline.replace(tzinfo=timezone.utc)
            if twenty_four_hours_ago <= dl <= now:
                violations_24h += 1
        elif (t.severity or "").lower() == "blocker":
            violations_24h += 1

    return TicketsSeverity(
        total_active=len(active_tickets),
        blocker=blocker,
        critical=critical,
        major=major,
        minor=minor,
        violations_24h=violations_24h,
    )


@router.get("/sla-performance", response_model=SlaPerformance, summary="Get SLA adherence velocity and rolling days")
async def get_sla_performance(
    project_id: Optional[str] = Query(None),
    project: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    team: Optional[str] = Query(None),
    period: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Calculate SLA adherence rate and real rolling resolution volume."""
    eff_project_id = project_id or project
    eff_department = department or team
    now = datetime.now(timezone.utc)
    period_start = _get_period_start(period, now)
    org_id = current_user.organization_id

    tickets_q = select(Ticket).join(Ticket.project).where(Project.organization_id == org_id)
    if eff_project_id:
        tickets_q = tickets_q.where(Ticket.project_id == eff_project_id)
    if period_start:
        tickets_q = tickets_q.where(Ticket.created_at >= period_start)
    if eff_department:
        tickets_q = tickets_q.join(User, Ticket.assignee_id == User.id).where(
            User.organization_id == org_id,
            User.department.ilike(eff_department.strip())
        )

    res = await db.execute(tickets_q)
    tickets = res.scalars().all()

    timed_tickets = [t for t in tickets if t.deadline is not None]
    seven_days_ago = now - timedelta(days=7)
    fourteen_days_ago = now - timedelta(days=14)

    # Previous baseline period (7 to 14 days ago)
    prev_timed = [
        t for t in timed_tickets
        if t.created_at and fourteen_days_ago <= (t.created_at if t.created_at.tzinfo else t.created_at.replace(tzinfo=timezone.utc)) < seven_days_ago
    ]

    if timed_tickets:
        breached = sum(
            1 for t in timed_tickets
            if (t.status or "").lower() not in ("resolved", "closed")
            and (t.deadline if t.deadline.tzinfo else t.deadline.replace(tzinfo=timezone.utc)) < now
        )
        adherence = round(((len(timed_tickets) - breached) / len(timed_tickets) * 100), 1)

        # Only compute adherence_delta if a valid previous baseline exists
        if prev_timed:
            prev_breached = sum(
                1 for t in prev_timed
                if (t.status or "").lower() not in ("resolved", "closed")
                and (t.deadline if t.deadline.tzinfo else t.deadline.replace(tzinfo=timezone.utc)) < seven_days_ago
            )
            prev_adherence = round(((len(prev_timed) - prev_breached) / len(prev_timed) * 100), 1)
            delta = round(adherence - prev_adherence, 1)
            adherence_delta = f"{'+' if delta >= 0 else ''}{delta}%"
        else:
            adherence_delta = None
    else:
        adherence = None
        adherence_delta = None

    resolved_tickets = [t for t in tickets if (t.status or "").lower() in ("resolved", "closed")]
    resolved_total = len(resolved_tickets)

    # Rolling 7 days: real resolved counts
    rolling: List[RollingDay] = []
    max_count = 1
    day_counts = []
    for i in range(6, -1, -1):
        target_date = (now - timedelta(days=i)).date()
        day_label = "Today" if i == 0 else target_date.strftime("%a")
        count = sum(
            1 for t in resolved_tickets
            if t.updated_at and (t.updated_at.date() if hasattr(t.updated_at, "date") else target_date) == target_date
        )
        day_counts.append((day_label, count))
        if count > max_count:
            max_count = count

    for d_label, count in day_counts:
        height_pct = max(10, int(round(count / max_count * 100))) if count > 0 else 5
        rolling.append(RollingDay(day=d_label, count=count, height=f"{height_pct}%"))

    # Average MTTR calculation
    mttr_durations = []
    for t in resolved_tickets:
        if t.created_at and t.updated_at:
            c_at = t.created_at if t.created_at.tzinfo else t.created_at.replace(tzinfo=timezone.utc)
            u_at = t.updated_at if t.updated_at.tzinfo else t.updated_at.replace(tzinfo=timezone.utc)
            diff_mins = max(1, int((u_at - c_at).total_seconds() / 60))
            mttr_durations.append(diff_mins)

    # Prior week baseline for MTTR
    prev_resolved = [
        t for t in resolved_tickets
        if t.updated_at and fourteen_days_ago <= (t.updated_at if t.updated_at.tzinfo else t.updated_at.replace(tzinfo=timezone.utc)) < seven_days_ago
    ]
    prev_mttr_durations = []
    for t in prev_resolved:
        if t.created_at and t.updated_at:
            c_at = t.created_at if t.created_at.tzinfo else t.created_at.replace(tzinfo=timezone.utc)
            u_at = t.updated_at if t.updated_at.tzinfo else t.updated_at.replace(tzinfo=timezone.utc)
            diff_mins = max(1, int((u_at - c_at).total_seconds() / 60))
            prev_mttr_durations.append(diff_mins)

    if mttr_durations:
        avg_mins = sum(mttr_durations) // len(mttr_durations)
        average_mttr = f"{avg_mins}m" if avg_mins < 60 else f"{avg_mins // 60}h"
        if prev_mttr_durations:
            prev_avg = sum(prev_mttr_durations) // len(prev_mttr_durations)
            diff = avg_mins - prev_avg
            mttr_delta = f"{'+' if diff >= 0 else ''}{diff}m vs last week"
        else:
            mttr_delta = None
    else:
        average_mttr = "—"
        mttr_delta = None

    return SlaPerformance(
        adherence_rate=adherence,
        adherence_delta=adherence_delta,
        average_mttr=average_mttr,
        mttr_delta=mttr_delta,
        resolved_rolling_total=resolved_total,
        rolling_days=rolling,
    )


@router.get("/project-progress", response_model=List[ProjectProgressItem], summary="Get active project progress metrics")
async def get_project_progress(
    project_id: Optional[str] = Query(None),
    project: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    team: Optional[str] = Query(None),
    period: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get active projects with real calculated task completion progress strictly matching Tasks page."""
    org_id = current_user.organization_id
    eff_project_id = project_id or project
    eff_department = department or team
    now = datetime.now(timezone.utc)
    today = now.date()

    query = (
        select(Project)
        .options(selectinload(Project.tasks), selectinload(Project.members))
        .where(Project.organization_id == org_id, Project.is_archived.is_(False))
    )
    if eff_project_id:
        query = query.where(Project.id == eff_project_id)
    if eff_department:
        query = query.join(Project.members).where(
            User.organization_id == org_id,
            User.department.ilike(eff_department.strip())
        )
    query = query.order_by(Project.created_at.asc()).limit(6)

    p_res = await db.execute(query)
    projects = p_res.scalars().all()

    items = []
    for p in projects:
        # Load tasks strictly for this project and tenant
        p_tasks = [t for t in p.tasks if getattr(t, "organization_id", org_id) == org_id]
        total_tasks = len(p_tasks)
        done_tasks = sum(1 for t in p_tasks if (t.status or "").lower() == "done")
        prog = int(round(done_tasks / total_tasks * 100)) if total_tasks > 0 else 0

        # Target date with year, marked overdue when past today
        if p.target_date:
            target_dt = p.target_date.date() if hasattr(p.target_date, "date") else p.target_date
            is_overdue = target_dt < today
            date_str = p.target_date.strftime("%b %d, %Y")
            target = f"{date_str} (Overdue)" if is_overdue else date_str
        else:
            is_overdue = False
            target = "Flexible"

        member_count = len(p.members) if p.members else 0
        teams_str = f"{pluralize(member_count, 'member')} assigned" if member_count > 0 else "Team assigned"

        items.append(
            ProjectProgressItem(
                id=p.id,
                title=p.name,
                progress=prog,
                teams=teams_str,
                squads=teams_str,
                target=target,
                is_overdue=is_overdue,
                status_color=p.color or "bg-btn-primary",
            )
        )
    return items


@router.get("/team-workload", response_model=List[TeamWorkloadItem], summary="Get team workload and capacity")
async def get_team_workload(
    project_id: Optional[str] = Query(None),
    project: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    team: Optional[str] = Query(None),
    period: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Aggregate member workloads by normalized teams across the organization."""
    org_id = current_user.organization_id
    eff_project_id = project_id or project
    eff_department = department or team
    now = datetime.now(timezone.utc)
    period_start = _get_period_start(period, now)

    # Fetch users in organization
    user_q = select(User).where(User.organization_id == org_id)
    if eff_department:
        user_q = user_q.where(User.department.ilike(eff_department.strip()))
    u_res = await db.execute(user_q)
    users = u_res.scalars().all()
    if not users:
        return []

    # Active tasks in org matching filters
    t_q = select(Task.assignee_id).where(
        Task.organization_id == org_id,
        Task.status.notin_(["done", "cancelled"])
    )
    if eff_project_id:
        t_q = t_q.where(Task.project_id == eff_project_id)
    if period_start:
        t_q = t_q.where(Task.created_at >= period_start)
    t_res = await db.execute(t_q)
    active_tasks = t_res.scalars().all()

    # Active tickets in org matching filters
    tk_q = select(Ticket.assignee_id).join(Ticket.project).where(
        Project.organization_id == org_id,
        Ticket.status.notin_(["resolved", "closed"])
    )
    if eff_project_id:
        tk_q = tk_q.where(Ticket.project_id == eff_project_id)
    if period_start:
        tk_q = tk_q.where(Ticket.created_at >= period_start)
    tk_res = await db.execute(tk_q)
    active_tickets = tk_res.scalars().all()

    # Group by normalized department name (trim, lowercase so Engineering and engineering are one team)
    dept_map: Dict[str, List[User]] = {}
    dept_display: Dict[str, str] = {}
    for u in users:
        raw_dept = (u.department or "General").strip()
        if not raw_dept:
            raw_dept = "General"
        norm_key = raw_dept.lower()
        if norm_key not in dept_display:
            dept_display[norm_key] = raw_dept.title()
        dept_map.setdefault(norm_key, []).append(u)

    workloads = []
    # Sort teams by member count descending then name
    sorted_teams = sorted(dept_map.items(), key=lambda x: (-len(x[1]), x[0]))

    for norm_key, dept_users in sorted_teams:
        dept_user_ids = {u.id for u in dept_users}
        dept_tasks_count = sum(1 for a_id in active_tasks if a_id in dept_user_ids)
        dept_tickets_count = sum(1 for a_id in active_tickets if a_id in dept_user_ids)
        total_items = dept_tasks_count + dept_tickets_count

        member_count = len(dept_users)
        capacity_info = calculate_team_capacity(total_items, member_count)

        desc = f"{pluralize(member_count, 'Member')} • {pluralize(total_items, 'active item')}"

        workloads.append(
            TeamWorkloadItem(
                name=dept_display[norm_key],
                capacity=capacity_info["availability"],
                availability=capacity_info["availability"],
                utilization=capacity_info["utilization"],
                status=capacity_info["status"],
                color=capacity_info["color"],
                desc=desc,
            )
        )

    return workloads


@router.get("/priority-tickets", response_model=List[PriorityTicketItem], summary="Get priority tickets requiring attention")
async def get_priority_tickets(
    project_id: Optional[str] = Query(None),
    project: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    team: Optional[str] = Query(None),
    period: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Top active blocker and critical tickets scoped to organization."""
    eff_project_id = project_id or project
    eff_department = department or team
    now = datetime.now(timezone.utc)
    period_start = _get_period_start(period, now)
    org_id = current_user.organization_id

    query = (
        select(Ticket)
        .options(selectinload(Ticket.assignee), selectinload(Ticket.project))
        .join(Ticket.project)
        .where(
            Project.organization_id == org_id,
            Ticket.status.notin_(["resolved", "closed"]),
            Ticket.severity.in_(["blocker", "critical", "major"]),
        )
    )
    if eff_project_id:
        query = query.where(Ticket.project_id == eff_project_id)
    if period_start:
        query = query.where(Ticket.created_at >= period_start)
    if eff_department:
        query = query.join(User, Ticket.assignee_id == User.id).where(
            User.organization_id == org_id,
            User.department.ilike(eff_department.strip())
        )

    res = await db.execute(query.order_by(desc(Ticket.created_at)).limit(5))
    tickets = res.scalars().all()

    items = []
    for t in tickets:
        sev = (t.severity or "major").lower()
        if sev == "blocker":
            sev_bg = "bg-red-100 text-severity-blocker border-red-200"
        elif sev == "critical":
            sev_bg = "bg-amber-100 text-severity-critical border-amber-200"
        else:
            sev_bg = "bg-yellow-100 text-[#b58300] border-yellow-200"

        # SLA text derived from deadline if present
        if t.deadline:
            dl = t.deadline if t.deadline.tzinfo else t.deadline.replace(tzinfo=timezone.utc)
            if dl < now:
                mins_over = int((now - dl).total_seconds() / 60)
                sla_text = f"BREACHED (-{mins_over}m)" if mins_over < 60 else f"BREACHED (-{mins_over//60}h)"
                sla_class = "bg-error text-white animate-pulse"
            else:
                mins_left = int((dl - now).total_seconds() / 60)
                if mins_left < 60:
                    sla_text = f"{mins_left}m remaining"
                    sla_class = "bg-amber-100 text-severity-critical border border-amber-300"
                else:
                    hrs = mins_left // 60
                    sla_text = f"{hrs}h {mins_left % 60}m remaining"
                    sla_class = "text-text-secondary font-medium"
        else:
            if sev == "blocker":
                sla_text = "BREACHED"
                sla_class = "bg-error text-white animate-pulse"
            elif sev == "critical":
                sla_text = "Urgent (< 30m)"
                sla_class = "bg-amber-100 text-severity-critical border border-amber-300"
            else:
                sla_text = "Standard SLA"
                sla_class = "text-text-secondary font-medium"

        assignee_name = t.assignee.full_name if t.assignee else "Unassigned"
        assignee_avatar = t.assignee.avatar_url if t.assignee and t.assignee.avatar_url else ""

        items.append(
            PriorityTicketItem(
                id=t.ticket_number,
                title=t.title,
                severity=sev.capitalize(),
                severity_bg=sev_bg,
                status=t.status.replace("_", " ").title(),
                status_color=f"bg-status-{t.status}",
                assignee_name=assignee_name,
                assignee_avatar=assignee_avatar,
                sla_text=sla_text,
                sla_class=sla_class,
            )
        )
    return items


@router.get("/activity-timeline", response_model=List[ActivityTimelineItem], summary="Get recent activity log events")
async def get_activity_timeline(
    project_id: Optional[str] = Query(None),
    project: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    team: Optional[str] = Query(None),
    period: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Recent project and ticket activities within current tenant."""
    org_id = current_user.organization_id
    eff_project_id = project_id or project
    eff_department = department or team
    now = datetime.now(timezone.utc)
    period_start = _get_period_start(period, now)

    query = (
        select(ProjectActivity)
        .options(selectinload(ProjectActivity.actor), selectinload(ProjectActivity.project))
        .join(ProjectActivity.project)
        .where(Project.organization_id == org_id)
    )
    if eff_project_id:
        query = query.where(ProjectActivity.project_id == eff_project_id)
    if period_start:
        query = query.where(ProjectActivity.created_at >= period_start)
    if eff_department:
        query = query.join(ProjectActivity.actor).where(
            User.organization_id == org_id,
            User.department.ilike(eff_department.strip())
        )

    res = await db.execute(query.order_by(desc(ProjectActivity.created_at)).limit(10))
    activities = res.scalars().all()

    items = []
    for a in activities:
        actor_name = a.actor.full_name if a.actor else "System"
        actor_avatar = a.actor.avatar_url if a.actor else None
        meta = f"{a.project.key} • {a.category}" if a.project else a.category

        items.append(
            ActivityTimelineItem(
                id=a.id,
                actor=actor_name,
                action=a.action.replace("_", " "),
                target_id=a.target_title or a.target_id or "Item",
                target_type=a.target_type,
                dot_color="bg-btn-primary",
                meta=meta,
                avatar=actor_avatar,
                is_bot=(a.actor is None),
            )
        )
    return items


# ---------------------------------------------------------------------------
# Workspace Summary Export (CSV & PDF)
# ---------------------------------------------------------------------------

_EXPORT_RATE_LIMITS: Dict[str, List[float]] = defaultdict(list)
_EXPORT_RATE_LIMIT = 15  # 15 requests per 60s per user
_EXPORT_WINDOW = 60.0


def sanitize_csv_cell(value: Any) -> str:
    """Neutralize formula injection by prefixing trigger characters with an apostrophe."""
    if value is None:
        return ""
    val_str = str(value)
    if val_str and val_str[0] in ("=", "+", "-", "@", "\t", "\r"):
        return f"'{val_str}"
    return val_str


class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas for dynamic total page count (Page X of Y) and running header/footer."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#71717A"))
        if self._pageNumber > 1:
            self.drawString(54, 750, "Live Workspace — Executive Summary Report")
            self.setStrokeColor(colors.HexColor("#E4E4E7"))
            self.setLineWidth(0.5)
            self.line(54, 744, 558, 744)

        self.setStrokeColor(colors.HexColor("#E4E4E7"))
        self.setLineWidth(0.5)
        self.line(54, 45, 558, 45)
        self.drawString(54, 32, "Confidential — Live Workspace Internal Use Only")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 32, page_str)
        self.restoreState()


@router.get("/export", summary="Export workspace summary report as CSV or PDF")
async def export_workspace_summary(
    format: str = Query(..., pattern=r"^(?i)(csv|pdf)$"),
    project_id: Optional[str] = Query(None),
    project: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    team: Optional[str] = Query(None),
    period: Optional[str] = Query(None),
    tz: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate an executive operational summary export in CSV or PDF format.
    Strictly scoped to current authenticated user's organization.
    """
    # 1. Rate limiting
    now_ts = time.time()
    user_reqs = [t for t in _EXPORT_RATE_LIMITS[current_user.id] if now_ts - t < _EXPORT_WINDOW]
    if len(user_reqs) >= _EXPORT_RATE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Export rate limit exceeded. Please wait a moment before trying again."
        )
    user_reqs.append(now_ts)
    _EXPORT_RATE_LIMITS[current_user.id] = user_reqs

    # 2. Timezone resolution
    user_tz = timezone.utc
    if tz:
        try:
            user_tz = ZoneInfo(tz)
        except Exception:
            user_tz = timezone.utc

    now_utc = datetime.now(timezone.utc)
    now_local = now_utc.astimezone(user_tz)
    formatted_time = now_local.strftime("%Y-%m-%d %H:%M:%S %Z")
    safe_date = now_local.strftime("%Y-%m-%d")

    # 3. Organization & user scoping
    org_id = current_user.organization_id
    org = await db.get(Organization, org_id)
    workspace_name = org.name if org and org.name else "Live Workspace"
    generator_name = current_user.full_name or current_user.email or "Workspace User"

    eff_project_id = project_id or project
    eff_department = department or team
    period_start = _get_period_start(period, now_utc)

    filter_desc = []
    if eff_project_id:
        proj_obj = await db.get(Project, eff_project_id)
        filter_desc.append(f"Project: {proj_obj.name if proj_obj else eff_project_id}")
    if eff_department:
        filter_desc.append(f"Department: {eff_department}")
    if period:
        filter_desc.append(f"Period: {period}")
    active_filters_str = ", ".join(filter_desc) if filter_desc else "All Data (No filters applied)"

    # 4. Aggregations (SAME queries and figures as dashboard)
    # Projects
    proj_q = select(Project).where(Project.organization_id == org_id, Project.is_archived.is_(False))
    if eff_project_id:
        proj_q = proj_q.where(Project.id == eff_project_id)
    proj_res = await db.execute(proj_q.order_by(Project.name.asc()))
    active_projects = proj_res.scalars().all()
    total_projects = len(active_projects)

    # Tasks
    tasks_q = select(Task).where(Task.organization_id == org_id)
    if eff_project_id:
        tasks_q = tasks_q.where(Task.project_id == eff_project_id)
    if period_start:
        tasks_q = tasks_q.where(Task.created_at >= period_start)
    if eff_department:
        tasks_q = tasks_q.join(User, Task.assignee_id == User.id).where(
            User.organization_id == org_id,
            User.department.ilike(eff_department.strip())
        )
    task_res = await db.execute(tasks_q)
    tasks = task_res.scalars().all()
    total_tasks = len(tasks)

    # Tasks by status
    done_tasks = sum(1 for t in tasks if (t.status or "").lower() == "done")
    in_progress_tasks = sum(1 for t in tasks if (t.status or "").lower() == "in_progress")
    in_review_tasks = sum(1 for t in tasks if (t.status or "").lower() == "in_review")
    todo_tasks = sum(1 for t in tasks if (t.status or "").lower() in ("todo", "to_do"))
    completion_rate_str = f"{round(done_tasks / total_tasks * 100.0, 1)}%" if total_tasks > 0 else "—"

    # My tasks
    my_tasks = sum(1 for t in tasks if t.assignee_id == current_user.id)

    # Tickets scoped to org
    tickets_q = select(Ticket).join(Ticket.project).where(Project.organization_id == org_id)
    if eff_project_id:
        tickets_q = tickets_q.where(Ticket.project_id == eff_project_id)
    if period_start:
        tickets_q = tickets_q.where(Ticket.created_at >= period_start)
    if eff_department:
        tickets_q = tickets_q.join(User, Ticket.assignee_id == User.id).where(
            User.organization_id == org_id,
            User.department.ilike(eff_department.strip())
        )
    t_res = await db.execute(tickets_q)
    tickets = t_res.scalars().all()

    open_tickets = sum(1 for t in tickets if (t.status or "").lower() in ("open", "wip"))
    wip_tickets = sum(1 for t in tickets if (t.status or "").lower() == "wip")
    work_in_progress = wip_tickets + in_progress_tasks
    on_hold = sum(1 for t in tickets if (t.status or "").lower() == "on_hold")

    # Tickets by severity (active)
    active_tickets = [t for t in tickets if (t.status or "").lower() not in ("resolved", "closed")]
    blocker_count = sum(1 for t in active_tickets if (t.severity or "").lower() == "blocker")
    critical_count = sum(1 for t in active_tickets if (t.severity or "").lower() == "critical")
    major_count = sum(1 for t in active_tickets if (t.severity or "").lower() == "major")
    minor_count = sum(1 for t in active_tickets if (t.severity or "").lower() == "minor")

    twenty_four_hours_ago = now_utc - timedelta(hours=24)
    violations_24h = sum(
        1 for t in active_tickets
        if is_active_sla_breach(t, now_utc)
        and t.deadline
        and twenty_four_hours_ago <= (t.deadline if t.deadline.tzinfo else t.deadline.replace(tzinfo=timezone.utc)) <= now_utc
    )

    # SLA Breached and compliance from centralized active breach definition
    breached_count = sum(1 for t in tickets if is_active_sla_breach(t, now_utc))
    tickets_with_timers = [t for t in tickets if t.deadline is not None]
    if tickets_with_timers:
        compliance_rate_val = round(((len(tickets_with_timers) - breached_count) / len(tickets_with_timers)) * 100.0, 1)
        compliance_rate_str = f"{compliance_rate_val}%"
    else:
        compliance_rate_str = "—"

    # Per-project breakdown
    project_breakdown = []
    for p in active_projects:
        p_tasks = [t for t in tasks if t.project_id == p.id]
        p_total_tasks = len(p_tasks)
        p_done_tasks = sum(1 for t in p_tasks if (t.status or "").lower() == "done")
        p_tickets = [t for t in tickets if t.project_id == p.id]
        p_open_tickets = sum(1 for t in p_tickets if (t.status or "").lower() in ("open", "wip"))
        project_breakdown.append({
            "name": p.name,
            "key": p.key,
            "total_tasks": p_total_tasks,
            "done_tasks": p_done_tasks,
            "open_tickets": p_open_tickets,
        })

    # Per-assignee breakdown
    user_q = select(User).where(User.organization_id == org_id).order_by(User.full_name.asc())
    u_res = await db.execute(user_q)
    org_users = u_res.scalars().all()

    assignee_breakdown = []
    for u in org_users:
        u_tasks = [t for t in tasks if t.assignee_id == u.id]
        u_active_tasks = sum(1 for t in u_tasks if (t.status or "").lower() not in ("done", "cancelled"))
        u_done_tasks = sum(1 for t in u_tasks if (t.status or "").lower() == "done")
        u_tickets = [t for t in tickets if t.assignee_id == u.id]
        u_open_tickets = sum(1 for t in u_tickets if (t.status or "").lower() in ("open", "wip"))
        if len(u_tasks) > 0 or len(u_tickets) > 0:
            assignee_breakdown.append({
                "name": u.full_name or u.email,
                "email": u.email,
                "department": u.department or "—",
                "active_tasks": u_active_tasks,
                "done_tasks": u_done_tasks,
                "open_tickets": u_open_tickets,
            })

    is_empty_workspace = (total_projects == 0 and total_tasks == 0 and len(tickets) == 0)
    fmt_lower = format.lower().strip()

    # CSV FORMAT
    if fmt_lower == "csv":
        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

        writer.writerow([sanitize_csv_cell("Workspace Summary Report")])
        writer.writerow([sanitize_csv_cell("Workspace:"), sanitize_csv_cell(workspace_name)])
        writer.writerow([sanitize_csv_cell("Generated At:"), sanitize_csv_cell(formatted_time)])
        writer.writerow([sanitize_csv_cell("Generated By:"), sanitize_csv_cell(generator_name)])
        writer.writerow([sanitize_csv_cell("Active Filters:"), sanitize_csv_cell(active_filters_str)])
        writer.writerow([])

        if is_empty_workspace:
            writer.writerow([sanitize_csv_cell("Status"), sanitize_csv_cell("No operational data found in this workspace for the selected filters.")])
        else:
            # Executive Summary Figures
            writer.writerow([sanitize_csv_cell("Executive Summary")])
            writer.writerow([sanitize_csv_cell("Metric"), sanitize_csv_cell("Value")])
            writer.writerow([sanitize_csv_cell("Total Projects"), sanitize_csv_cell(total_projects)])
            writer.writerow([sanitize_csv_cell("Total Tasks"), sanitize_csv_cell(total_tasks)])
            writer.writerow([sanitize_csv_cell("Tasks Completion Rate"), sanitize_csv_cell(completion_rate_str)])
            writer.writerow([sanitize_csv_cell("My Assigned Tasks"), sanitize_csv_cell(my_tasks)])
            writer.writerow([sanitize_csv_cell("Open Tickets"), sanitize_csv_cell(open_tickets)])
            writer.writerow([sanitize_csv_cell("Work in Progress"), sanitize_csv_cell(work_in_progress)])
            writer.writerow([sanitize_csv_cell("On Hold Tickets"), sanitize_csv_cell(on_hold)])
            writer.writerow([sanitize_csv_cell("SLA Breached"), sanitize_csv_cell(breached_count)])
            writer.writerow([sanitize_csv_cell("SLA Compliance Rate"), sanitize_csv_cell(compliance_rate_str)])
            writer.writerow([])

            # Tasks by Status
            writer.writerow([sanitize_csv_cell("Tasks by Status")])
            writer.writerow([sanitize_csv_cell("Status"), sanitize_csv_cell("Count")])
            writer.writerow([sanitize_csv_cell("Done"), sanitize_csv_cell(done_tasks)])
            writer.writerow([sanitize_csv_cell("In Progress"), sanitize_csv_cell(in_progress_tasks)])
            writer.writerow([sanitize_csv_cell("In Review"), sanitize_csv_cell(in_review_tasks)])
            writer.writerow([sanitize_csv_cell("To Do"), sanitize_csv_cell(todo_tasks)])
            writer.writerow([])

            # Tickets by Severity
            writer.writerow([sanitize_csv_cell("Tickets by Severity (Active)")])
            writer.writerow([sanitize_csv_cell("Severity"), sanitize_csv_cell("Count")])
            writer.writerow([sanitize_csv_cell("Blocker"), sanitize_csv_cell(blocker_count)])
            writer.writerow([sanitize_csv_cell("Critical"), sanitize_csv_cell(critical_count)])
            writer.writerow([sanitize_csv_cell("Major"), sanitize_csv_cell(major_count)])
            writer.writerow([sanitize_csv_cell("Minor"), sanitize_csv_cell(minor_count)])
            writer.writerow([sanitize_csv_cell("Violations (Last 24h)"), sanitize_csv_cell(violations_24h)])
            writer.writerow([])

            # Per-Project Breakdown
            if project_breakdown:
                writer.writerow([sanitize_csv_cell("Per-Project Breakdown")])
                writer.writerow([
                    sanitize_csv_cell("Project Name"),
                    sanitize_csv_cell("Key"),
                    sanitize_csv_cell("Total Tasks"),
                    sanitize_csv_cell("Completed Tasks"),
                    sanitize_csv_cell("Open Tickets")
                ])
                for p in project_breakdown:
                    writer.writerow([
                        sanitize_csv_cell(p["name"]),
                        sanitize_csv_cell(p["key"]),
                        sanitize_csv_cell(p["total_tasks"]),
                        sanitize_csv_cell(p["done_tasks"]),
                        sanitize_csv_cell(p["open_tickets"])
                    ])
                writer.writerow([])

            # Per-Assignee Breakdown
            if assignee_breakdown:
                writer.writerow([sanitize_csv_cell("Per-Assignee Breakdown")])
                writer.writerow([
                    sanitize_csv_cell("Assignee"),
                    sanitize_csv_cell("Email"),
                    sanitize_csv_cell("Department"),
                    sanitize_csv_cell("Active Tasks"),
                    sanitize_csv_cell("Completed Tasks"),
                    sanitize_csv_cell("Open Tickets")
                ])
                for a in assignee_breakdown:
                    writer.writerow([
                        sanitize_csv_cell(a["name"]),
                        sanitize_csv_cell(a["email"]),
                        sanitize_csv_cell(a["department"]),
                        sanitize_csv_cell(a["active_tasks"]),
                        sanitize_csv_cell(a["done_tasks"]),
                        sanitize_csv_cell(a["open_tickets"])
                    ])

        csv_content = output.getvalue()
        output.close()

        filename = f"workspace-summary-{safe_date}.csv"
        headers = {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "text/csv; charset=utf-8",
        }
        return Response(content=csv_content, media_type="text/csv", headers=headers)

    # PDF FORMAT
    pdf_buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        pdf_buffer,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54,
    )
    styles = getSampleStyleSheet()

    # Typography styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#18181B"),
    )
    section_title = ParagraphStyle(
        "SectionTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#27272A"),
        spaceBefore=12,
        spaceAfter=6,
    )
    meta_label = ParagraphStyle(
        "MetaLabel",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#52525B"),
    )
    meta_val = ParagraphStyle(
        "MetaVal",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#18181B"),
    )
    cell_head = ParagraphStyle(
        "CellHead",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#FFFFFF"),
    )
    cell_body = ParagraphStyle(
        "CellBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#27272A"),
    )
    cell_body_bold = ParagraphStyle(
        "CellBodyBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#18181B"),
    )

    story = []

    # Title
    story.append(Paragraph("Live Workspace — Executive Summary", title_style))
    story.append(Spacer(1, 8))

    # Metadata Block
    meta_data = [
        [Paragraph("Workspace:", meta_label), Paragraph(str(workspace_name), meta_val),
         Paragraph("Generated At:", meta_label), Paragraph(formatted_time, meta_val)],
        [Paragraph("Generated By:", meta_label), Paragraph(str(generator_name), meta_val),
         Paragraph("Active Filters:", meta_label), Paragraph(active_filters_str, meta_val)],
    ]
    meta_table = Table(meta_data, colWidths=[80, 172, 80, 172])
    meta_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F4F4F5")),
        ("PADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, colors.HexColor("#E4E4E7")),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 14))

    if is_empty_workspace:
        empty_box = [
            [Paragraph("No operational data found in this workspace for the selected filters.", cell_body)]
        ]
        empty_table = Table(empty_box, colWidths=[504])
        empty_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FAFAFA")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#E4E4E7")),
            ("PADDING", (0, 0), (-1, -1), 16),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ]))
        story.append(empty_table)
    else:
        # Table of Figures: Key Operational Metrics
        story.append(Paragraph("Key Operational Metrics", section_title))
        summary_data = [
            [
                Paragraph("Metric", cell_head),
                Paragraph("Value", cell_head),
                Paragraph("Metric", cell_head),
                Paragraph("Value", cell_head),
            ],
            [
                Paragraph("Total Projects", cell_body_bold),
                Paragraph(str(total_projects), cell_body),
                Paragraph("Open Tickets", cell_body_bold),
                Paragraph(str(open_tickets), cell_body),
            ],
            [
                Paragraph("Total Tasks", cell_body_bold),
                Paragraph(str(total_tasks), cell_body),
                Paragraph("Work In Progress", cell_body_bold),
                Paragraph(str(work_in_progress), cell_body),
            ],
            [
                Paragraph("Tasks Completion Rate", cell_body_bold),
                Paragraph(str(completion_rate_str), cell_body),
                Paragraph("On Hold Tickets", cell_body_bold),
                Paragraph(str(on_hold), cell_body),
            ],
            [
                Paragraph("My Assigned Tasks", cell_body_bold),
                Paragraph(str(my_tasks), cell_body),
                Paragraph("SLA Breached", cell_body_bold),
                Paragraph(str(breached_count), cell_body),
            ],
            [
                Paragraph("SLA Compliance Rate", cell_body_bold),
                Paragraph(str(compliance_rate_str), cell_body),
                Paragraph("24h Severity Violations", cell_body_bold),
                Paragraph(str(violations_24h), cell_body),
            ],
        ]
        summary_table = Table(summary_data, colWidths=[150, 102, 150, 102])
        summary_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
            ("PADDING", (0, 0), (-1, -1), 5),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E4E4E7")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]),
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 12))

        # Status & Severity Distributions
        story.append(Paragraph("Task Status & Ticket Severity Distributions", section_title))
        dist_data = [
            [
                Paragraph("Task Status", cell_head),
                Paragraph("Count", cell_head),
                Paragraph("Ticket Severity (Active)", cell_head),
                Paragraph("Count", cell_head),
            ],
            [
                Paragraph("Done", cell_body),
                Paragraph(str(done_tasks), cell_body_bold),
                Paragraph("Blocker", cell_body),
                Paragraph(str(blocker_count), cell_body_bold),
            ],
            [
                Paragraph("In Progress", cell_body),
                Paragraph(str(in_progress_tasks), cell_body_bold),
                Paragraph("Critical", cell_body),
                Paragraph(str(critical_count), cell_body_bold),
            ],
            [
                Paragraph("In Review", cell_body),
                Paragraph(str(in_review_tasks), cell_body_bold),
                Paragraph("Major", cell_body),
                Paragraph(str(major_count), cell_body_bold),
            ],
            [
                Paragraph("To Do", cell_body),
                Paragraph(str(todo_tasks), cell_body_bold),
                Paragraph("Minor", cell_body),
                Paragraph(str(minor_count), cell_body_bold),
            ],
        ]
        dist_table = Table(dist_data, colWidths=[150, 102, 150, 102])
        dist_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#312E81")),
            ("PADDING", (0, 0), (-1, -1), 5),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E4E4E7")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]),
        ]))
        story.append(dist_table)
        story.append(Spacer(1, 12))

        # Project Breakdown Table (if any)
        if project_breakdown:
            p_elements = [
                Paragraph("Per-Project Operational Breakdown", section_title)
            ]
            proj_data = [
                [
                    Paragraph("Project Name", cell_head),
                    Paragraph("Key", cell_head),
                    Paragraph("Total Tasks", cell_head),
                    Paragraph("Done Tasks", cell_head),
                    Paragraph("Open Tickets", cell_head),
                ]
            ]
            for p in project_breakdown:
                proj_data.append([
                    Paragraph(str(p["name"]), cell_body_bold),
                    Paragraph(str(p["key"]), cell_body),
                    Paragraph(str(p["total_tasks"]), cell_body),
                    Paragraph(str(p["done_tasks"]), cell_body),
                    Paragraph(str(p["open_tickets"]), cell_body),
                ])
            p_table = Table(proj_data, colWidths=[184, 80, 80, 80, 80])
            p_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E293B")),
                ("PADDING", (0, 0), (-1, -1), 5),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E4E4E7")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]),
            ]))
            p_elements.append(p_table)
            story.append(KeepTogether(p_elements))
            story.append(Spacer(1, 12))

        # Assignee Breakdown Table (if any)
        if assignee_breakdown:
            a_elements = [
                Paragraph("Per-Assignee Workload Breakdown", section_title)
            ]
            assignee_data = [
                [
                    Paragraph("Assignee", cell_head),
                    Paragraph("Department", cell_head),
                    Paragraph("Active Tasks", cell_head),
                    Paragraph("Done Tasks", cell_head),
                    Paragraph("Open Tickets", cell_head),
                ]
            ]
            for a in assignee_breakdown:
                assignee_data.append([
                    Paragraph(str(a["name"]), cell_body_bold),
                    Paragraph(str(a["department"]), cell_body),
                    Paragraph(str(a["active_tasks"]), cell_body),
                    Paragraph(str(a["done_tasks"]), cell_body),
                    Paragraph(str(a["open_tickets"]), cell_body),
                ])
            a_table = Table(assignee_data, colWidths=[174, 90, 80, 80, 80])
            a_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#334155")),
                ("PADDING", (0, 0), (-1, -1), 5),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E4E4E7")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9FAFB")]),
            ]))
            a_elements.append(a_table)
            story.append(KeepTogether(a_elements))

    doc.build(story, canvasmaker=NumberedCanvas)
    pdf_bytes = pdf_buffer.getvalue()
    pdf_buffer.close()

    filename = f"workspace-summary-{safe_date}.pdf"
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Content-Type": "application/pdf",
    }
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)


# ---------------------------------------------------------------------------
# WebSocket Endpoint (Authenticated and Scoped)
# ---------------------------------------------------------------------------

@router.websocket("/ws")
@router.websocket("/ws/{workspace_id}")
async def dashboard_websocket_endpoint(
    websocket: WebSocket,
    workspace_id: Optional[str] = None,
    token: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticated real-time dashboard events stream.
    """
    user = await authenticate_ws(websocket, token, db, required_workspace_id=workspace_id)
    if not user:
        return

    target_ws = user.organization_id
    await ws_manager.connect(websocket, target_ws)
    await websocket.send_text(
        json.dumps({"type": "CONNECTION_ESTABLISHED", "payload": {"workspace_id": target_ws}})
    )
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(json.dumps({"type": "PONG", "payload": {"received": data}}))
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, target_ws)
    except Exception:
        ws_manager.disconnect(websocket, target_ws)
