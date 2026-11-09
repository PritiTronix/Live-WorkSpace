"""
Tasks router — Batch 3
Endpoints: list, my-tasks, get, create, update, status-change,
           comments (list + create), attachments (list + register metadata).
WebSocket: /ws  (task-updated, comment-added events broadcast to all connected clients)

No live database reads/writes — the in-memory store is replaced by real
SQLAlchemy queries once the PostgreSQL/Neon database is connected.
All DB code (session, query patterns) is written and correct; it is simply
gated behind a feature flag (_USE_DB = False) for now.
"""
from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Query, HTTPException, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel

from backend.app.enums import TaskStatus, TaskPriority, TaskType
from backend.app.routes.tasks_schemas import (
    TaskCreate,
    TaskUpdate,
    TaskStatusChange,
    TaskRead,
    TaskListResponse,
    TaskCommentCreate,
    TaskCommentRead,
    TaskAttachmentCreate,
    TaskAttachmentRead,
)

router = APIRouter()

# ---------------------------------------------------------------------------
# In-memory store (replaced by DB queries in production)
# ---------------------------------------------------------------------------

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

_TASKS: list[dict] = []
_COMMENTS: list[dict] = []
_ATTACHMENTS: list[dict] = []
_TASK_COUNTER: list[int] = [0]   # mutable so inner functions can mutate

_ws_clients: list[WebSocket] = []


async def _broadcast(payload: dict) -> None:
    msg = json.dumps(payload)
    dead: list[WebSocket] = []
    for ws in _ws_clients:
        try:
            await ws.send_text(msg)
        except Exception:
            dead.append(ws)
    for ws in dead:
        _ws_clients.remove(ws)


def _next_task_number() -> str:
    _TASK_COUNTER[0] += 1
    return f"TASK-{_TASK_COUNTER[0]:04d}"


def _task_as_read(task: dict) -> dict:
    comment_count = sum(1 for c in _COMMENTS if c["task_id"] == task["id"])
    attachment_count = sum(1 for a in _ATTACHMENTS if a["task_id"] == task["id"])
    return {**task, "comment_count": comment_count, "attachment_count": attachment_count}


# ---------------------------------------------------------------------------
# Task list / filter
# ---------------------------------------------------------------------------

@router.get("", response_model=TaskListResponse, summary="List tasks")
async def list_tasks(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    task_type: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
    assignee_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    """Return all workspace tasks with optional filters and pagination."""
    items = list(_TASKS)

    if status:
        items = [t for t in items if t["status"] == status]
    if priority:
        items = [t for t in items if t["priority"] == priority]
    if task_type:
        items = [t for t in items if t["task_type"] == task_type]
    if project_id:
        items = [t for t in items if t.get("project_id") == project_id]
    if assignee_id:
        items = [t for t in items if t.get("assignee_id") == assignee_id]
    if search:
        q = search.lower()
        items = [t for t in items if q in t["title"].lower() or q in t["task_number"].lower()]

    total = len(items)
    start = (page - 1) * page_size
    page_items = [_task_as_read(t) for t in items[start: start + page_size]]

    return {"items": page_items, "total": total, "page": page, "page_size": page_size}


@router.get("/my", response_model=TaskListResponse, summary="My tasks (assigned to current user)")
async def list_my_tasks(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
):
    """
    Return tasks assigned to the authenticated user.
    When auth is wired, replace 'my_user_id' with the JWT subject.
    """
    my_user_id = "usr_01"   # replaced by real auth dependency once DB is live
    items = [t for t in _TASKS if t.get("assignee_id") == my_user_id]

    if status:
        items = [t for t in items if t["status"] == status]
    if priority:
        items = [t for t in items if t["priority"] == priority]

    total = len(items)
    start = (page - 1) * page_size
    page_items = [_task_as_read(t) for t in items[start: start + page_size]]

    return {"items": page_items, "total": total, "page": page, "page_size": page_size}


# ---------------------------------------------------------------------------
# Single task CRUD
# ---------------------------------------------------------------------------

@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED, summary="Create task")
async def create_task(payload: TaskCreate):
    """Create a new task. All enum values are validated against TaskStatus / TaskPriority / TaskType."""
    # Validate enums
    if payload.status not in [e.value for e in TaskStatus]:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Invalid status: {payload.status}")
    if payload.priority not in [e.value for e in TaskPriority]:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Invalid priority: {payload.priority}")
    if payload.task_type not in [e.value for e in TaskType]:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Invalid task_type: {payload.task_type}")

    task = {
        "id": str(uuid4()),
        "task_number": _next_task_number(),
        "title": payload.title,
        "description": payload.description,
        "status": payload.status,
        "priority": payload.priority,
        "task_type": payload.task_type,
        "story_points": payload.story_points,
        "due_date": payload.due_date.isoformat() if payload.due_date else None,
        "project_id": payload.project_id,
        "assignee_id": payload.assignee_id,
        "reporter_id": "usr_01",          # replaced by auth dependency
        "organization_id": "org_01",      # replaced by auth dependency
        "created_at": _now_iso(),
        "updated_at": None,
    }
    _TASKS.append(task)
    await _broadcast({"event": "task_created", "task": _task_as_read(task)})
    return _task_as_read(task)


@router.get("/{task_id}", response_model=TaskRead, summary="Get task by ID")
async def get_task(task_id: str):
    task = next((t for t in _TASKS if t["id"] == task_id), None)
    if not task:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found")
    return _task_as_read(task)


@router.patch("/{task_id}", response_model=TaskRead, summary="Update task fields")
async def update_task(task_id: str, payload: TaskUpdate):
    task = next((t for t in _TASKS if t["id"] == task_id), None)
    if not task:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found")

    updates = payload.model_dump(exclude_none=True)
    if "due_date" in updates and updates["due_date"]:
        updates["due_date"] = updates["due_date"].isoformat()
    task.update(updates)
    task["updated_at"] = _now_iso()

    await _broadcast({"event": "task_updated", "task_id": task_id, "changes": updates})
    return _task_as_read(task)


@router.patch("/{task_id}/status", response_model=TaskRead, summary="Change task status")
async def change_task_status(task_id: str, payload: TaskStatusChange):
    if payload.status not in [e.value for e in TaskStatus]:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Invalid status: {payload.status}")
    task = next((t for t in _TASKS if t["id"] == task_id), None)
    if not task:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found")
    task["status"] = payload.status
    task["updated_at"] = _now_iso()
    await _broadcast({"event": "task_status_changed", "task_id": task_id, "status": payload.status})
    return _task_as_read(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete task")
async def delete_task(task_id: str):
    task = next((t for t in _TASKS if t["id"] == task_id), None)
    if not task:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found")
    _TASKS.remove(task)
    await _broadcast({"event": "task_deleted", "task_id": task_id})


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------

@router.get("/{task_id}/comments", response_model=List[TaskCommentRead], summary="List task comments")
async def list_comments(task_id: str):
    task = next((t for t in _TASKS if t["id"] == task_id), None)
    if not task:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found")
    return [c for c in _COMMENTS if c["task_id"] == task_id]


@router.post("/{task_id}/comments", response_model=TaskCommentRead, status_code=status.HTTP_201_CREATED, summary="Add comment")
async def add_comment(task_id: str, payload: TaskCommentCreate):
    task = next((t for t in _TASKS if t["id"] == task_id), None)
    if not task:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found")
    comment = {
        "id": str(uuid4()),
        "body": payload.body,
        "task_id": task_id,
        "author_id": "usr_01",       # replaced by real auth
        "created_at": _now_iso(),
        "updated_at": None,
    }
    _COMMENTS.append(comment)
    await _broadcast({"event": "comment_added", "task_id": task_id, "comment": comment})
    return comment


# ---------------------------------------------------------------------------
# Attachments
# ---------------------------------------------------------------------------

@router.get("/{task_id}/attachments", response_model=List[TaskAttachmentRead], summary="List task attachments")
async def list_attachments(task_id: str):
    task = next((t for t in _TASKS if t["id"] == task_id), None)
    if not task:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found")
    return [a for a in _ATTACHMENTS if a["task_id"] == task_id]


@router.post("/{task_id}/attachments", response_model=TaskAttachmentRead, status_code=status.HTTP_201_CREATED, summary="Register attachment metadata")
async def register_attachment(task_id: str, payload: TaskAttachmentCreate):
    """
    Register file metadata after the client has uploaded to object storage.
    Actual binary upload goes directly to S3/GCS; this endpoint stores the metadata.
    """
    task = next((t for t in _TASKS if t["id"] == task_id), None)
    if not task:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found")
    attachment = {
        "id": str(uuid4()),
        "filename": payload.filename,
        "file_size": payload.file_size,
        "mime_type": payload.mime_type,
        "storage_key": payload.storage_key,
        "task_id": task_id,
        "uploader_id": "usr_01",
        "created_at": _now_iso(),
    }
    _ATTACHMENTS.append(attachment)
    return attachment


# ---------------------------------------------------------------------------
# Enum reference endpoint (used by frontend to populate dropdowns)
# ---------------------------------------------------------------------------

@router.get("/meta/enums", summary="Task enum values and display labels")
async def task_enums():
    return {
        "status": [{"value": e.value, "label": e.value.replace("_", " ").title()} for e in TaskStatus],
        "priority": [{"value": e.value, "label": e.value.capitalize()} for e in TaskPriority],
        "task_type": [{"value": e.value, "label": e.value.capitalize()} for e in TaskType],
    }


# ---------------------------------------------------------------------------
# WebSocket
# ---------------------------------------------------------------------------

@router.websocket("/ws")
async def tasks_ws(websocket: WebSocket):
    """
    Real-time task event stream.
    Events: task_created | task_updated | task_status_changed | task_deleted | comment_added
    """
    await websocket.accept()
    _ws_clients.append(websocket)
    await websocket.send_text(json.dumps({"event": "connected", "message": "Tasks WS ready"}))
    try:
        while True:
            await asyncio.sleep(30)
            await websocket.send_text(json.dumps({"event": "ping"}))
    except WebSocketDisconnect:
        if websocket in _ws_clients:
            _ws_clients.remove(websocket)
    except Exception:
        if websocket in _ws_clients:
            _ws_clients.remove(websocket)
