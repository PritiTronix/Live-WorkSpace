"""
Task schemas — Pydantic v2 models for request/response validation.
Enum values are lowercase strings matching backend/app/enums.py and
frontend/src/modules/tasks/constants/taskEnums.js.
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, model_validator


class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Actor (minimal user representation for responses)
# ---------------------------------------------------------------------------

class ActorSchema(BaseSchema):
    id: str
    full_name: str
    avatar_url: Optional[str] = None


# ---------------------------------------------------------------------------
# Task Attachment
# ---------------------------------------------------------------------------

class TaskAttachmentCreate(BaseSchema):
    filename: str
    file_size: int
    mime_type: str
    storage_key: str


class TaskAttachmentRead(BaseSchema):
    id: str
    filename: str
    file_size: int
    mime_type: str
    storage_key: str
    uploader_id: str
    task_id: str
    created_at: datetime


# ---------------------------------------------------------------------------
# Task Comment
# ---------------------------------------------------------------------------

class TaskCommentCreate(BaseSchema):
    body: str


class TaskCommentRead(BaseSchema):
    id: str
    body: str
    task_id: str
    author_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Task
# ---------------------------------------------------------------------------

class TaskCreate(BaseSchema):
    title: str
    description: Optional[str] = None
    status: str = "todo"            # TaskStatus enum value
    priority: str = "medium"        # TaskPriority enum value
    task_type: str = "feature"      # TaskType enum value
    story_points: Optional[int] = None
    due_date: Optional[datetime] = None
    project_id: Optional[str] = None
    assignee_id: Optional[str] = None
    assigned_to_id: Optional[str] = None

    @model_validator(mode="after")
    def sync_assignee(self):
        if not self.assignee_id and self.assigned_to_id:
            self.assignee_id = self.assigned_to_id
        elif not self.assigned_to_id and self.assignee_id:
            self.assigned_to_id = self.assignee_id
        return self


class TaskUpdate(BaseSchema):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    task_type: Optional[str] = None
    story_points: Optional[int] = None
    due_date: Optional[datetime] = None
    project_id: Optional[str] = None
    assignee_id: Optional[str] = None
    assigned_to_id: Optional[str] = None

    @model_validator(mode="after")
    def sync_assignee(self):
        if not self.assignee_id and self.assigned_to_id:
            self.assignee_id = self.assigned_to_id
        elif not self.assigned_to_id and self.assignee_id:
            self.assigned_to_id = self.assignee_id
        return self


class TaskStatusChange(BaseSchema):
    status: str    # must be a valid TaskStatus value


class TaskRead(BaseSchema):
    id: str
    task_number: str
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    task_type: str = "feature"
    story_points: Optional[int] = None
    due_date: Optional[datetime] = None
    project_id: Optional[str] = None
    assignee_id: Optional[str] = None
    assigned_to_id: Optional[str] = None
    reporter_id: Optional[str] = None
    organization_id: Optional[str] = "org_01"
    created_at: datetime
    updated_at: Optional[datetime] = None
    comment_count: int = 0
    attachment_count: int = 0
    assignee: Optional[ActorSchema] = None

    @model_validator(mode="after")
    def sync_assignee(self):
        if not self.assignee_id and self.assigned_to_id:
            self.assignee_id = self.assigned_to_id
        elif not self.assigned_to_id and self.assignee_id:
            self.assigned_to_id = self.assignee_id
        return self


class TaskListResponse(BaseSchema):
    items: List[TaskRead]
    total: int
    page: int
    page_size: int
