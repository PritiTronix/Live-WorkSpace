"""
Task and Organization enumerations — single source of truth for the backend.
All values are lowercase strings.
"""
from enum import Enum


class OrganizationPlan(str, Enum):
    free = "free"
    starter = "starter"
    pro = "pro"
    enterprise = "enterprise"


class MembershipRole(str, Enum):
    owner = "owner"
    admin = "admin"
    member = "member"


class MembershipStatus(str, Enum):
    active = "active"
    suspended = "suspended"


class JoinRequestStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    cancelled = "cancelled"
    expired = "expired"


class TaskStatus(str, Enum):
    todo = "todo"
    in_progress = "in_progress"
    in_review = "in_review"
    done = "done"
    cancelled = "cancelled"


class TaskPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"


class TaskType(str, Enum):
    feature = "feature"
    bug = "bug"
    chore = "chore"
    spike = "spike"
    epic = "epic"


TASK_STATUS_DISPLAY = {
    TaskStatus.todo: "To Do",
    TaskStatus.in_progress: "In Progress",
    TaskStatus.in_review: "In Review",
    TaskStatus.done: "Done",
    TaskStatus.cancelled: "Cancelled",
}

TASK_PRIORITY_DISPLAY = {
    TaskPriority.low: "Low",
    TaskPriority.medium: "Medium",
    TaskPriority.high: "High",
    TaskPriority.urgent: "Urgent",
}


class TicketStatus(str, Enum):
    open = "open"
    wip = "wip"
    on_hold = "on_hold"
    resolved = "resolved"
    closed = "closed"


class TicketSeverity(str, Enum):
    blocker = "blocker"
    critical = "critical"
    major = "major"
    minor = "minor"


TICKET_STATUS_DISPLAY = {
    TicketStatus.open: "Open",
    TicketStatus.wip: "Work in Progress",
    TicketStatus.on_hold: "On Hold",
    TicketStatus.resolved: "Resolved",
    TicketStatus.closed: "Closed",
}

TICKET_SEVERITY_DISPLAY = {
    TicketSeverity.blocker: "Blocker",
    TicketSeverity.critical: "Critical",
    TicketSeverity.major: "Major",
    TicketSeverity.minor: "Minor",
}
