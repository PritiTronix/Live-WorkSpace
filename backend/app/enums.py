"""
Task-related enumerations — single source of truth for the backend.
All values are lowercase strings to match the frontend constants.
"""
from enum import Enum


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
