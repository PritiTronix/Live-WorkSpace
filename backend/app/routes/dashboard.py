from typing import List, Dict, Any, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel
import asyncio
import json

router = APIRouter()


class DashboardMetrics(BaseModel):
    total_projects: int = 14
    total_tasks: int = 248
    my_tasks: int = 12
    open_tickets: int = 37
    work_in_progress: int = 19
    on_hold: int = 5
    sla_breached: int = 2


class TasksBreakdown(BaseModel):
    total: int = 248
    done: int = 142
    in_progress: int = 68
    in_review: int = 26
    to_do: int = 12
    completion_rate: float = 57.2


class TicketsSeverity(BaseModel):
    total_active: int = 37
    blocker: int = 3
    critical: int = 7
    major: int = 12
    minor: int = 15
    violations_24h: int = 2


class RollingDay(BaseModel):
    day: str
    count: int
    height: str


class SlaPerformance(BaseModel):
    adherence_rate: float = 96.4
    adherence_delta: str = "+1.8%"
    average_mttr: str = "14m"
    mttr_delta: str = "-3m faster"
    resolved_rolling_total: int = 34
    rolling_days: List[RollingDay]


class ProjectProgressItem(BaseModel):
    id: str
    title: str
    progress: int
    squads: str
    target: str
    status_color: str


class TeamWorkloadItem(BaseModel):
    name: str
    capacity: int
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
    dot_color: str
    meta: str
    avatar: Optional[str] = None
    is_bot: Optional[bool] = False


# In-memory reference datasets faithfully matching the Stitch screen specifications
DEFAULT_METRICS = DashboardMetrics()
DEFAULT_TASKS = TasksBreakdown()
DEFAULT_SEVERITY = TicketsSeverity()
DEFAULT_SLA = SlaPerformance(
    adherence_rate=96.4,
    adherence_delta="+1.8%",
    average_mttr="14m",
    mttr_delta="-3m faster",
    resolved_rolling_total=34,
    rolling_days=[
        RollingDay(day="Thu", count=4, height="45%"),
        RollingDay(day="Fri", count=6, height="60%"),
        RollingDay(day="Sat", count=3, height="35%"),
        RollingDay(day="Sun", count=2, height="20%"),
        RollingDay(day="Mon", count=9, height="85%"),
        RollingDay(day="Tue", count=10, height="100%"),
        RollingDay(day="Today", count=7, height="70%"),
    ],
)
DEFAULT_PROJECTS = [
    ProjectProgressItem(
        id="prj_1",
        title="Platform Revamp 2.0",
        progress=78,
        squads="4 squads assigned",
        target="Dec 15",
        status_color="bg-btn-primary",
    ),
    ProjectProgressItem(
        id="prj_2",
        title="Auth Proxy Gateway Migration",
        progress=92,
        squads="SRE Canary Rollout",
        target="Nov 30",
        status_color="bg-status-resolved",
    ),
    ProjectProgressItem(
        id="prj_3",
        title="Data Pipeline v3",
        progress=45,
        squads="Blocked on Kafka sync",
        target="Jan 10",
        status_color="bg-severity-critical",
    ),
]
DEFAULT_WORKLOAD = [
    TeamWorkloadItem(
        name="Platform Squad",
        capacity=88,
        status="88% Capacity",
        color="bg-primary-container",
        desc="6 Engineers • 18 active tasks • Optimal burn-rate",
    ),
    TeamWorkloadItem(
        name="SRE Incident Response",
        capacity=94,
        status="94% Overload Warning",
        color="bg-severity-critical",
        desc="4 On-call SREs • 2 Blocker alerts active • High paging rate",
    ),
    TeamWorkloadItem(
        name="Core API Squad",
        capacity=62,
        status="62% Available",
        color="bg-status-resolved",
        desc="5 Engineers • Ready for failover sprint allocation",
    ),
]
DEFAULT_PRIORITY_TICKETS = [
    PriorityTicketItem(
        id="TKT-1025",
        title="Auth proxy latency spike on us-east cluster",
        severity="Blocker",
        severity_bg="bg-red-100 text-severity-blocker border-red-200",
        status="Work in Progress",
        status_color="bg-status-wip text-status-wip",
        assignee_name="Aarav Mehta",
        assignee_avatar="https://lh3.googleusercontent.com/aida-public/AB6AXuDqo8GgKfFsr5cHkqp1lCuMgd1yOtshoM_YSGgJFFDK0Qgzdq0EUdwPnnMhWjR-vLKk-ohcrmXdD__DMIkM0sihddxtnQilLqE9PAGu-e-IxSgqZa2oyFX_FUbcgOdaYbxR0hdK5dugjU4JeIkGzzlFNdKCR8haQg1EvM3Xzb0YLd2kUzSzoev5QLC1O4W2A7GXgHhIPq6RPxCszdG_snfOg4RAAUrndtuYU-ioTyhB",
        sla_text="BREACHED (-14m)",
        sla_class="bg-error text-white animate-pulse",
    ),
    PriorityTicketItem(
        id="TKT-1031",
        title="Payment Webhook retry queue exhaustion",
        severity="Critical",
        severity_bg="bg-amber-100 text-severity-critical border-amber-200",
        status="Open",
        status_color="bg-status-open text-status-open",
        assignee_name="Maya Shah",
        assignee_avatar="https://lh3.googleusercontent.com/aida-public/AB6AXuCHjELWytJwzAGP7e9QWUNSnKTW-MnICfKIA4yhY0ydh6QRNwk51QKDJmSqZNYC5W3eoKGinUDbbAQmRvX35RpXmFV6yS8x2cAOfq40RxPjGqD3zCWtI1AJFUNvHUEUugdu-zKQHOwWJdzCSo5V8qCwd6DmaI5Yi59nV-giaE3goUTr8b3RUsVWJ7BO_G0fbI6HE11ROdx7RW1hQuT1ZguQQI4UVC1w3V8obEWEYWJJ",
        sla_text="18m remaining",
        sla_class="bg-amber-100 text-severity-critical border border-amber-300",
    ),
    PriorityTicketItem(
        id="TKT-1028",
        title="Kafka consumer lag exceeding 50k messages",
        severity="Critical",
        severity_bg="bg-amber-100 text-severity-critical border-amber-200",
        status="Work in Progress",
        status_color="bg-status-wip text-status-wip",
        assignee_name="David K.",
        assignee_avatar="https://lh3.googleusercontent.com/aida-public/AB6AXuCgpxBabcNP-VflfUu9YxPtRNgBmTPculGmwVPxmA67FPyIuIwm4qwUa1SZB6Ob31t9xz2dfM-HZGM2mWeTTF8ELwGn7hk3zWhLyvo_abqg4as9rbKLAfWH1NfG9EvhTsIbj1jFGmgXElKtRxt-hPjG_KnFLOimtvCmZlBcEHsiM3uP1jk1DMXrsJH360536mg0WTLxlUGj0OVUbNjOySGUYJkfs01YGDuLe34eZ1DO",
        sla_text="42m remaining",
        sla_class="text-text-secondary font-medium",
    ),
    PriorityTicketItem(
        id="TKT-1019",
        title="Cross-region telemetry replication failover",
        severity="Major",
        severity_bg="bg-yellow-100 text-[#b58300] border-yellow-200",
        status="On Hold",
        status_color="bg-status-on-hold text-text-secondary",
        assignee_name="Sarah T.",
        assignee_avatar="https://lh3.googleusercontent.com/aida-public/AB6AXuD1igbZGJ7L1Ky6xJ0okSYPBlzX8JW7EnkSjN-LZ6EDW7hdB6IOcBjmoNieDP1pECCl5dYOzlzTfE_TMS-l2sNeANsUCp0vMRe-s3fgpUk8D_5MM8MOFF2c3HNeIN8RDawNhYFdJ38e-UiBbJbHvuFXMUUrvJdrLjYINKXjeUd5kDeC_BFI-k4XmOGA3xyZNMnY81gO8Bj6PXEAUlXsKqHIFLhSe8VEmQWgUye8JmIG",
        sla_text="2h 15m remaining",
        sla_class="text-text-secondary font-medium",
    ),
]
DEFAULT_TIMELINE = [
    ActivityTimelineItem(
        id="act_1",
        actor="Aarav Mehta",
        action="escalated",
        target_id="TKT-1025",
        target_type="ticket",
        status_badge="Blocker",
        status_color="text-severity-blocker",
        dot_color="bg-severity-blocker",
        meta="4 mins ago • us-east SRE Incident Channel",
        avatar="https://lh3.googleusercontent.com/aida-public/AB6AXuCbSDx---2N7YIzdzZoQ8HAru3n3DNE-tkCnVWcCPzTznNa_RBQOPWMov2WCi5YUvRYAvfccNsDasvnWl63I735VtTdfTZqM55gCmlu3LthPMNIFIORrDgjXJ8XE6mggi_Gq_oOt2iMZHUF_zC9msl1oXX_2_juzfEdlXYmHuvA6sWB3f2Ep2LJ6gph_Q8xHVEDOaiRv4Ie_Zz9y2YhwvJZccr6CIIJHsC7ContR2EV",
    ),
    ActivityTimelineItem(
        id="act_2",
        actor="Maya Shah",
        action="committed fix to branch fix/webhook-retry on Platform Revamp",
        target_id="commit_e8f902c",
        dot_color="bg-status-resolved",
        meta="18 mins ago • GitHub Commit #e8f902c",
        avatar="https://lh3.googleusercontent.com/aida-public/AB6AXuCCy6qL9ZlcLH4Vu-iRCkxSXaW5P4LBRnvqfxp6kgLTNP06HXluT9liexSMcTufAAd3NWWFqSshRHyt4scKmJA_HEhxJoPZav3aX81osQsgOAp0QloVpsSK-_z2Rwxbu8wc_U0kolH9icYjq_8cNd3TZNyLMDqnxu_whgCJqw0mRcyFAdqsAee2mqwTcET-ovE-BcEESiGOpz5V4HIbT940fhfWtfdUi7eZtbeG_fjc",
    ),
    ActivityTimelineItem(
        id="act_3",
        actor="System Bot",
        action="triggered SLA warning alert for TKT-1031 (80% threshold reached)",
        target_id="TKT-1031",
        dot_color="bg-severity-critical",
        meta="32 mins ago • Datadog Alert Webhook",
        is_bot=True,
    ),
    ActivityTimelineItem(
        id="act_4",
        actor="Priya Nair",
        action="marked TASK-198 as Resolved",
        target_id="TASK-198",
        dot_color="bg-status-resolved",
        meta="1 hr ago • Verified in staging cluster",
        avatar="https://lh3.googleusercontent.com/aida-public/AB6AXuAEr672y36GRoGPHj6QXmjQ6FVZEYKIXOkynZXObLyfier5tVYr9Bd0TdLPzVwhakG4-1yl4Eo9I_4Ptq8N0OPGgQIJ6YCz2ra55-vKMKWwEmtA_PiWfF0RNfQBh8Sw9Qu6oU7sAhzBn6-fi_1lLFe5oUINz4TvjpZ72jWQobwHD-stL4W8xlP_eYZKa8nQXvroDFyG_bJhq6SIuurny8EwByq_n1HQ86BXP7zXa53O",
    ),
]


@router.get("/metrics", response_model=DashboardMetrics, summary="Get summary metrics for home dashboard")
async def get_dashboard_metrics():
    return DEFAULT_METRICS


@router.get("/tasks-breakdown", response_model=TasksBreakdown, summary="Get task breakdown by status")
async def get_tasks_breakdown():
    return DEFAULT_TASKS


@router.get("/tickets-severity", response_model=TicketsSeverity, summary="Get ticket counts by severity")
async def get_tickets_severity():
    return DEFAULT_SEVERITY


@router.get("/sla-performance", response_model=SlaPerformance, summary="Get SLA adherence velocity and rolling days")
async def get_sla_performance():
    return DEFAULT_SLA


@router.get("/project-progress", response_model=List[ProjectProgressItem], summary="Get active project progress metrics")
async def get_project_progress():
    return DEFAULT_PROJECTS


@router.get("/team-workload", response_model=List[TeamWorkloadItem], summary="Get team squad workload and capacity")
async def get_team_workload():
    return DEFAULT_WORKLOAD


@router.get("/priority-tickets", response_model=List[PriorityTicketItem], summary="Get priority tickets requiring attention")
async def get_priority_tickets():
    return DEFAULT_PRIORITY_TICKETS


@router.get("/activity-timeline", response_model=List[ActivityTimelineItem], summary="Get recent activity log events")
async def get_activity_timeline():
    return DEFAULT_TIMELINE


# Active WebSocket connections
active_connections: List[WebSocket] = []


@router.websocket("/ws")
async def dashboard_websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        # Send initial connection acknowledgment
        await websocket.send_text(
            json.dumps({"type": "CONNECTION_ESTABLISHED", "payload": {"status": "connected"}})
        )
        while True:
            # Keep connection alive; accept ping/pong or client messages
            data = await websocket.receive_text()
            # Echo or broadcast if necessary
            await websocket.send_text(
                json.dumps({"type": "PONG", "payload": {"received": data}})
            )
    except WebSocketDisconnect:
        if websocket in active_connections:
            active_connections.remove(websocket)
