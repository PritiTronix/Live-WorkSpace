import io
import csv
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.database import get_db
from backend.app.dependencies import get_current_user_id
from backend.app.models import Task, Ticket, Project, User
from backend.app.schemas import (
    AnalyticsDashboardResponse,
    AnalyticsKPIMetrics,
    VelocityTrendResponse,
    VelocityTrendItem,
    SeverityDistributionItem,
    StatusDistributionItem,
    SquadSLAComplianceItem,
    EmployeeWorkloadItem,
    AnalyticsExportRequest,
)

router = APIRouter()


def _format_duration(seconds: float) -> Optional[str]:
    if seconds is None or seconds < 0:
        return None
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    if hours > 0:
        return f"{hours}h {minutes}m"
    if minutes > 0:
        return f"{minutes}m {secs}s"
    return f"{secs}s"


def _format_duration_delta(diff_seconds: float) -> str:
    sign = "+" if diff_seconds >= 0 else "-"
    abs_sec = abs(diff_seconds)
    hours = int(abs_sec // 3600)
    minutes = int((abs_sec % 3600) // 60)
    secs = int(abs_sec % 60)
    if hours > 0:
        return f"{sign}{hours}h {minutes}m"
    if minutes > 0:
        return f"{sign}{minutes}m"
    return f"{sign}{secs}s"


@router.get("/summary")
async def get_analytics_summary(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get high-level workspace performance analytics (organization scoped)."""
    user_res = await db.execute(select(User).where(User.id == current_user_id))
    current_user = user_res.scalar_one_or_none()
    org_id = current_user.organization_id if current_user else None

    if not org_id:
        return {
            "total_projects": 0,
            "total_tasks": 0,
            "tasks_completed": 0,
            "task_completion_rate": 0.0,
            "total_tickets": 0,
            "tickets_resolved": 0,
            "velocity_points": 0,
            "average_cycle_time_days": 0.0,
        }

    p_res = await db.execute(select(Project.id).where(Project.organization_id == org_id))
    org_project_ids = [pid for pid in p_res.scalars().all()]

    if not org_project_ids:
        return {
            "total_projects": 0,
            "total_tasks": 0,
            "tasks_completed": 0,
            "task_completion_rate": 0.0,
            "total_tickets": 0,
            "tickets_resolved": 0,
            "velocity_points": 0,
            "average_cycle_time_days": 0.0,
        }

    t_res = await db.execute(select(Task).where(Task.project_id.in_(org_project_ids)))
    tasks = t_res.scalars().all()
    total_tasks = len(tasks)
    done_tasks = sum(1 for t in tasks if (t.status or "").lower() in ("done", "completed"))
    completion_rate = round((done_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0.0

    tk_res = await db.execute(select(Ticket).where(Ticket.project_id.in_(org_project_ids)))
    tickets = tk_res.scalars().all()
    total_tickets = len(tickets)
    resolved_tickets = sum(1 for tk in tickets if (tk.status or "").lower() in ("resolved", "closed"))

    return {
        "total_projects": len(org_project_ids),
        "total_tasks": total_tasks,
        "tasks_completed": done_tasks,
        "task_completion_rate": completion_rate,
        "total_tickets": total_tickets,
        "tickets_resolved": resolved_tickets,
        "velocity_points": resolved_tickets * 5,
        "average_cycle_time_days": 0.0,
    }


@router.get("/dashboard", response_model=AnalyticsDashboardResponse)
async def get_analytics_dashboard(
    time_horizon: str = Query("30d", description="Time window: today, 7d, 30d, month"),
    project_id: Optional[str] = Query(None, description="Filter by project ID or 'all'"),
    severity: Optional[str] = Query(None, description="Filter by severity or 'all'"),
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> AnalyticsDashboardResponse:
    """Retrieve verified organization-scoped analytics telemetry for Screen 1."""
    # 1. Fetch current user and org
    user_res = await db.execute(select(User).where(User.id == current_user_id))
    current_user = user_res.scalar_one_or_none()
    org_id = current_user.organization_id if current_user else None

    # Strict Tenant Isolation: if user has no org, return empty structure with zero fabricated data
    if not org_id:
        return AnalyticsDashboardResponse(
            window_label="No Organization Assigned",
            kpis=AnalyticsKPIMetrics(),
            velocity_trend=VelocityTrendResponse(),
            severity_distribution=[
                SeverityDistributionItem(key="blocker", label="Blocker (P0)", count=0, percentage=0.0),
                SeverityDistributionItem(key="critical", label="Critical (P1)", count=0, percentage=0.0),
                SeverityDistributionItem(key="major", label="Major (P2)", count=0, percentage=0.0),
                SeverityDistributionItem(key="minor", label="Minor (P3)", count=0, percentage=0.0),
            ],
            status_distribution=[
                StatusDistributionItem(key="open", label="Open Backlog", count=0, percentage=0.0),
                StatusDistributionItem(key="wip", label="In Progress", count=0, percentage=0.0),
                StatusDistributionItem(key="on_hold", label="On Hold", count=0, percentage=0.0),
                StatusDistributionItem(key="resolved", label="Resolved", count=0, percentage=0.0),
                StatusDistributionItem(key="closed", label="Closed", count=0, percentage=0.0),
            ],
            squad_sla=[],
            employees=[],
            total_employees=0
        )

    # 2. Get organization projects
    p_res = await db.execute(select(Project).where(Project.organization_id == org_id))
    org_projects = p_res.scalars().all()
    org_project_ids = [p.id for p in org_projects]

    if not org_project_ids:
        return AnalyticsDashboardResponse(
            window_label="Empty Workspace",
            kpis=AnalyticsKPIMetrics(),
            velocity_trend=VelocityTrendResponse(),
            severity_distribution=[
                SeverityDistributionItem(key="blocker", label="Blocker (P0)", count=0, percentage=0.0),
                SeverityDistributionItem(key="critical", label="Critical (P1)", count=0, percentage=0.0),
                SeverityDistributionItem(key="major", label="Major (P2)", count=0, percentage=0.0),
                SeverityDistributionItem(key="minor", label="Minor (P3)", count=0, percentage=0.0),
            ],
            status_distribution=[
                StatusDistributionItem(key="open", label="Open Backlog", count=0, percentage=0.0),
                StatusDistributionItem(key="wip", label="In Progress", count=0, percentage=0.0),
                StatusDistributionItem(key="on_hold", label="On Hold", count=0, percentage=0.0),
                StatusDistributionItem(key="resolved", label="Resolved", count=0, percentage=0.0),
                StatusDistributionItem(key="closed", label="Closed", count=0, percentage=0.0),
            ],
            squad_sla=[],
            employees=[],
            total_employees=0
        )

    # 3. Calculate Date Windows for Current & Comparison Periods
    now = datetime.now(timezone.utc)
    if time_horizon == "today":
        window_duration = timedelta(days=1)
        window_label = "Past 24 Hours"
    elif time_horizon == "7d":
        window_duration = timedelta(days=7)
        window_label = "Last 7 Days"
    elif time_horizon == "month":
        start_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
        window_duration = now - start_of_month
        window_label = "This Month"
    else:  # default "30d"
        window_duration = timedelta(days=30)
        window_label = "Last 30 Days"

    window_start = now - window_duration
    prev_window_start = window_start - window_duration

    # 4. Query all organization tickets scoped
    t_query = select(Ticket).options(
        selectinload(Ticket.assignee),
        selectinload(Ticket.project)
    ).where(Ticket.project_id.in_(org_project_ids))

    if project_id and project_id != "all":
        t_query = t_query.where(Ticket.project_id == project_id)
    if severity and severity != "all":
        t_query = t_query.where(Ticket.severity == severity.lower())

    t_res = await db.execute(t_query)
    all_tickets = t_res.scalars().all()

    # Split into current period vs previous period
    curr_tickets = [t for t in all_tickets if t.created_at and t.created_at >= window_start]
    prev_tickets = [t for t in all_tickets if t.created_at and prev_window_start <= t.created_at < window_start]

    total_tickets = len(curr_tickets)
    resolved_tickets = [t for t in curr_tickets if (t.status or "").lower() in ("resolved", "closed")]
    open_tickets = [t for t in curr_tickets if (t.status or "").lower() in ("open", "wip", "on_hold")]
    high_priority_backlog = [t for t in open_tickets if (t.severity or "").lower() in ("blocker", "critical")]

    completion_rate = round((len(resolved_tickets) / total_tickets * 100), 1) if total_tickets > 0 else 0.0

    # Real Delta calculation: Compare current period vs previous period
    if len(prev_tickets) > 0:
        total_tickets_delta_pct = round(((total_tickets - len(prev_tickets)) / len(prev_tickets) * 100), 1)
    else:
        total_tickets_delta_pct = None

    # SLA Adherence cannot be authoritatively calculated without a resolved_at timestamp
    # (updated_at advances on any subsequent ticket mutation). Return None.
    sla_adherence_pct = None

    # Calculate Mean First Reply for current & previous
    curr_first_replies = [
        (t.first_response_at - t.created_at).total_seconds()
        for t in curr_tickets
        if t.first_response_at and t.created_at and (t.first_response_at - t.created_at).total_seconds() >= 0
    ]
    prev_first_replies = [
        (t.first_response_at - t.created_at).total_seconds()
        for t in prev_tickets
        if t.first_response_at and t.created_at and (t.first_response_at - t.created_at).total_seconds() >= 0
    ]

    if curr_first_replies:
        curr_avg_reply_sec = sum(curr_first_replies) / len(curr_first_replies)
        avg_response_time = _format_duration(curr_avg_reply_sec)
        if prev_first_replies:
            prev_avg_reply_sec = sum(prev_first_replies) / len(prev_first_replies)
            avg_response_delta = _format_duration_delta(curr_avg_reply_sec - prev_avg_reply_sec)
        else:
            avg_response_delta = None
    else:
        avg_response_time = None
        avg_response_delta = None

    # Mean MTTR cannot be authoritatively calculated without a resolved_at timestamp.
    # (updated_at - created_at reflects the latest ticket modification rather than resolution time).
    avg_mttr = None
    avg_mttr_delta = None

    kpis = AnalyticsKPIMetrics(
        total_tickets=total_tickets,
        total_tickets_delta_pct=total_tickets_delta_pct,
        resolved_tickets=len(resolved_tickets),
        completion_rate=completion_rate,
        open_backlog=len(open_tickets),
        high_priority_backlog=len(high_priority_backlog),
        sla_adherence_pct=sla_adherence_pct,
        sla_target_pct=None,  # No configured SLA target percentage in database
        avg_response_time=avg_response_time,
        avg_response_delta=avg_response_delta,
        avg_mttr=avg_mttr,
        avg_mttr_delta=avg_mttr_delta,
    )

    # 5. Velocity Trend Calculation
    # Created ticket counts use authentic created_at timestamps.
    # Historical resolution timestamps are not recorded in the Ticket model;
    # do NOT fabricate resolution timestamps using updated_at.
    trend_items: List[VelocityTrendItem] = []
    if time_horizon == "today":
        for i in range(6):
            t_start = window_start + timedelta(hours=i * 4)
            t_end = t_start + timedelta(hours=4)
            c_cnt = sum(1 for t in curr_tickets if t.created_at and t_start <= t.created_at < t_end)
            trend_items.append(VelocityTrendItem(
                period_label=f"{t_start.strftime('%H:%M')}",
                created_count=c_cnt,
                resolved_count=None,
                target_sla=None
            ))
    elif time_horizon == "7d":
        for i in range(7):
            day = window_start + timedelta(days=i)
            day_end = day + timedelta(days=1)
            c_cnt = sum(1 for t in curr_tickets if t.created_at and day <= t.created_at < day_end)
            trend_items.append(VelocityTrendItem(
                period_label=day.strftime("%a"),
                created_count=c_cnt,
                resolved_count=None,
                target_sla=None
            ))
    else:
        interval_days = max(1, int(window_duration.days / 6))
        for i in range(6):
            b_start = window_start + timedelta(days=i * interval_days)
            b_end = b_start + timedelta(days=interval_days)
            c_cnt = sum(1 for t in curr_tickets if t.created_at and b_start <= t.created_at < b_end)
            trend_items.append(VelocityTrendItem(
                period_label=f"Wk {i+1} ({b_start.strftime('%b %d')})",
                created_count=c_cnt,
                resolved_count=None,
                target_sla=None
            ))

    # Net velocity ratio and sprint velocity change cannot be computed without authoritative resolution timestamps
    velocity_trend = VelocityTrendResponse(
        items=trend_items,
        baseline_threshold=None,
        net_velocity_ratio=None,
        sprint_velocity_pct=None
    )

    # 6. Severity Distribution (Real database counts)
    sev_counts = {"blocker": 0, "critical": 0, "major": 0, "minor": 0}
    for t in curr_tickets:
        sev = (t.severity or "major").lower()
        if sev in sev_counts:
            sev_counts[sev] += 1
        else:
            sev_counts["major"] += 1

    sev_labels = {
        "blocker": "Blocker (P0)",
        "critical": "Critical (P1)",
        "major": "Major (P2)",
        "minor": "Minor (P3)",
    }
    severity_distribution = [
        SeverityDistributionItem(
            key=k,
            label=sev_labels[k],
            count=cnt,
            percentage=round((cnt / total_tickets * 100), 1) if total_tickets > 0 else 0.0
        )
        for k, cnt in sev_counts.items()
    ]

    # 7. Status Distribution (Real database counts)
    stat_counts = {"open": 0, "wip": 0, "on_hold": 0, "resolved": 0, "closed": 0}
    for t in curr_tickets:
        st = (t.status or "open").lower()
        if st in stat_counts:
            stat_counts[st] += 1
        else:
            stat_counts["open"] += 1

    stat_labels = {
        "open": "Open Backlog",
        "wip": "In Progress",
        "on_hold": "On Hold",
        "resolved": "Resolved",
        "closed": "Closed",
    }
    status_distribution = [
        StatusDistributionItem(
            key=k,
            label=stat_labels[k],
            count=cnt,
            percentage=round((cnt / total_tickets * 100), 1) if total_tickets > 0 else 0.0
        )
        for k, cnt in stat_counts.items()
    ]

    # 8. Squad SLA Compliance: Return empty list because no Squad entity/SLA target exists in DB (F-01)
    squad_sla: List[SquadSLAComplianceItem] = []

    # 9. Employee Workload Table (Derived strictly from real ticket assignments)
    u_res = await db.execute(select(User).where(User.organization_id == org_id))
    org_users = u_res.scalars().all()

    employees: List[EmployeeWorkloadItem] = []
    for u in org_users[:15]:
        u_tickets = [t for t in curr_tickets if t.assignee_id == u.id]
        u_resolved = [t for t in u_tickets if (t.status or "").lower() in ("resolved", "closed")]
        u_active = [t for t in u_tickets if (t.status or "").lower() in ("open", "wip", "on_hold")]
        res_count = len(u_resolved)

        # MTTR and SLA adherence are unavailable because authoritative resolution timestamps are not recorded
        u_mean_mttr = None
        u_sla = None

        employees.append(EmployeeWorkloadItem(
            user_id=u.id,
            name=u.full_name or "Engineer",
            role=u.title or u.role or "Member",
            avatar_url=u.avatar_url,
            squad=u.department or "General",
            resolved_count=res_count,
            mean_mttr=u_mean_mttr,
            sla_adherence=u_sla,
            active_tickets=len(u_active),
            active_capacity=None,  # No synthetic capacity percentages
            capacity_status=None
        ))

    return AnalyticsDashboardResponse(
        window_label=window_label,
        kpis=kpis,
        velocity_trend=velocity_trend,
        severity_distribution=severity_distribution,
        status_distribution=status_distribution,
        squad_sla=squad_sla,
        employees=employees,
        total_employees=len(employees)
    )


@router.post("/export")
async def export_analytics_report(
    req: AnalyticsExportRequest,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Generate and stream real organization-scoped analytics export report (CSV only)."""
    # Reject unsupported export formats explicitly (F-09)
    if (req.format or "").lower() != "csv":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Export format '{req.format}' is not supported. Supported formats: csv"
        )

    user_res = await db.execute(select(User).where(User.id == current_user_id))
    current_user = user_res.scalar_one_or_none()
    org_id = current_user.organization_id if current_user else None

    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authenticated user does not belong to any organization."
        )

    p_res = await db.execute(select(Project.id).where(Project.organization_id == org_id))
    org_project_ids = [p for p in p_res.scalars().all()]

    if not org_project_ids:
        t_query = select(Ticket).where(Ticket.id == "none")
    else:
        t_query = select(Ticket).options(
            selectinload(Ticket.assignee),
            selectinload(Ticket.project)
        ).where(Ticket.project_id.in_(org_project_ids))

    if req.project_id and req.project_id != "all":
        t_query = t_query.where(Ticket.project_id == req.project_id)
    if req.severity and req.severity != "all":
        t_query = t_query.where(Ticket.severity == req.severity.lower())

    t_res = await db.execute(t_query)
    tickets = t_res.scalars().all()

    # Generate genuine CSV stream
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["# Link-WorkSpace Analytics Report"])
    writer.writerow(["# Exported At (UTC)", datetime.now(timezone.utc).isoformat()])
    writer.writerow(["# Time Horizon", req.time_horizon])
    writer.writerow(["# Format", "csv"])
    writer.writerow([])

    writer.writerow([
        "Ticket Number",
        "Title",
        "Project",
        "Severity",
        "Status",
        "Assignee",
        "Created At (UTC)",
        "Deadline (UTC)",
        "RCA Trigger",
        "RCA Mitigation"
    ])

    for t in tickets:
        writer.writerow([
            t.ticket_number,
            t.title,
            t.project.name if t.project else "",
            t.severity,
            t.status,
            t.assignee.full_name if t.assignee else "Unassigned",
            t.created_at.isoformat() if t.created_at else "",
            t.deadline.isoformat() if t.deadline else "",
            t.rca_trigger or "",
            t.rca_mitigation or ""
        ])

    output.seek(0)
    filename = f"analytics-report-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
