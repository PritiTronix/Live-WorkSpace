"""
Tasks router — Unified Batch 3 + Project Workspace Tasks Implementation
Combines:
- Priti's tasks module: All Tasks, My Tasks, real-time WebSocket, in-memory responsive cache,
  task status changes, task comments, task attachments, task enum endpoints.
- Ashlesha's database integration: SQLAlchemy async session queries, ProjectActivity logging,
  sequential project task numbering, and assignee joins.
"""
from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.database import AsyncSessionLocal
async def get_optional_db():
    try:
        async with AsyncSessionLocal() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                try:
                    await session.rollback()
                except Exception:
                    pass
            finally:
                try:
                    await session.close()
                except Exception:
                    pass
    except Exception:
        yield None

from backend.app.dependencies import get_current_user_id
from backend.app.models import Task, Project, User, ProjectActivity
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
    ActorSchema,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# WebSocket and In-memory caching/fallback
# ---------------------------------------------------------------------------

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


_ws_clients: list[WebSocket] = []


async def _broadcast(payload: dict) -> None:
    msg = json.dumps(payload, default=str)
    dead: list[WebSocket] = []
    for ws in list(_ws_clients):
        try:
            await ws.send_text(msg)
        except Exception:
            dead.append(ws)
    for ws in dead:
        if ws in _ws_clients:
            _ws_clients.remove(ws)


_TASK_COUNTER: list[int] = [103]


def _next_task_number(prefix: str = "TASK") -> str:
    _TASK_COUNTER[0] += 1
    return f"{prefix}-{_TASK_COUNTER[0]}"


_TASKS: list[dict] = [
    {
        "id": "task_01",
        "task_number": "PROJ-101",
        "title": "Set up OAuth2 multi-tenant authentication pipeline",
        "description": "Implement token validation and session management with JWT.",
        "status": "in_progress",
        "priority": "high",
        "task_type": "feature",
        "story_points": 5,
        "due_date": None,
        "project_id": "proj_01",
        "assignee_id": "usr_01",
        "assigned_to_id": "usr_01",
        "reporter_id": "usr_01",
        "organization_id": "org_01",
        "created_at": _now_iso(),
        "updated_at": None,
        "comment_count": 0,
        "attachment_count": 0,
    },
    {
        "id": "task_02",
        "task_number": "PROJ-102",
        "title": "Design real-time task sync WebSocket gateway",
        "description": "Ensure instant state broadcast across client workspaces.",
        "status": "todo",
        "priority": "medium",
        "task_type": "feature",
        "story_points": 3,
        "due_date": None,
        "project_id": "proj_01",
        "assignee_id": "usr_02",
        "assigned_to_id": "usr_02",
        "reporter_id": "usr_01",
        "organization_id": "org_01",
        "created_at": _now_iso(),
        "updated_at": None,
        "comment_count": 0,
        "attachment_count": 0,
    },
    {
        "id": "task_03",
        "task_number": "PROJ-103",
        "title": "Audit SLA breach counter and priority ticket rules",
        "description": "Verify threshold calculations and escalation triggers.",
        "status": "done",
        "priority": "urgent",
        "task_type": "bug",
        "story_points": 2,
        "due_date": None,
        "project_id": "proj_01",
        "assignee_id": "usr_01",
        "assigned_to_id": "usr_01",
        "reporter_id": "usr_02",
        "organization_id": "org_01",
        "created_at": _now_iso(),
        "updated_at": None,
        "comment_count": 0,
        "attachment_count": 0,
    },
]

_COMMENTS: list[dict] = []
_ATTACHMENTS: list[dict] = []


def _task_as_read(task: dict) -> dict:
    comment_count = sum(1 for c in _COMMENTS if c.get("task_id") == task.get("id"))
    attachment_count = sum(1 for a in _ATTACHMENTS if a.get("task_id") == task.get("id"))
    assignee_id = task.get("assignee_id") or task.get("assigned_to_id")
    return {
        **task,
        "assignee_id": assignee_id,
        "assigned_to_id": assignee_id,
        "comment_count": comment_count,
        "attachment_count": attachment_count,
    }


# ---------------------------------------------------------------------------
# Task List / Filter
# ---------------------------------------------------------------------------

@router.get("", response_model=TaskListResponse, summary="List tasks (paginated + filtered)")
@router.get("/", response_model=TaskListResponse, include_in_schema=False)
async def list_tasks(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    task_type: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
    assignee_id: Optional[str] = Query(None),
    assigned_to_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_optional_db),
):
    """
    Return all workspace tasks matching the specified criteria.
    Tries live database first; falls back to responsive in-memory cache if DB is offline.
    """
    target_assignee = assignee_id or assigned_to_id
    if target_assignee and target_assignee.lower() == "all":
        target_assignee = None

    try:
        query = select(Task).options(
            selectinload(Task.assignee),
            selectinload(Task.comments),
            selectinload(Task.attachments),
        )

        if project_id:
            query = query.where(Task.project_id == project_id)
        if status and status.lower() != "all":
            stat_val = status.lower()
            query = query.where(
                func.lower(Task.status).in_([
                    stat_val,
                    stat_val.replace("to_do", "todo"),
                    stat_val.replace("todo", "to_do"),
                ])
            )
        if priority and priority.lower() != "all":
            query = query.where(func.lower(Task.priority) == priority.lower())
        if task_type and task_type.lower() != "all":
            query = query.where(func.lower(Task.task_type) == task_type.lower())
        if target_assignee:
            query = query.where(Task.assignee_id == target_assignee)
        if search:
            q = f"%{search.lower()}%"
            query = query.where(func.lower(Task.title).like(q) | func.lower(Task.task_number).like(q))

        query = query.order_by(Task.created_at.asc())
        res = await db.execute(query)
        db_tasks = res.scalars().all()

        if db_tasks:
            total = len(db_tasks)
            start = (page - 1) * page_size
            page_tasks = db_tasks[start : start + page_size]
            items = []
            for t in page_tasks:
                items.append(
                    TaskRead(
                        id=t.id,
                        task_number=t.task_number,
                        title=t.title,
                        description=t.description,
                        status=t.status,
                        priority=t.priority,
                        task_type=getattr(t, "task_type", "feature") or "feature",
                        story_points=t.story_points,
                        due_date=t.due_date,
                        project_id=t.project_id,
                        assignee_id=t.assignee_id,
                        assigned_to_id=t.assignee_id,
                        reporter_id=t.reporter_id,
                        organization_id=t.organization_id or "org_01",
                        created_at=t.created_at,
                        updated_at=t.updated_at,
                        comment_count=len(t.comments) if t.comments else 0,
                        attachment_count=len(t.attachments) if t.attachments else 0,
                        assignee=(
                            ActorSchema(id=t.assignee.id, full_name=t.assignee.full_name, avatar_url=t.assignee.avatar_url)
                            if t.assignee
                            else None
                        ),
                    )
                )
            return TaskListResponse(items=items, total=total, page=page, page_size=page_size)
    except Exception:
        try:
            await db.rollback()
        except Exception:
            pass

    # In-memory store fallback
    items = list(_TASKS)
    if status and status.lower() != "all":
        clean_status = status.lower().replace("_", "")
        items = [t for t in items if t.get("status", "").lower().replace("_", "") == clean_status]
    if priority and priority.lower() != "all":
        items = [t for t in items if t.get("priority", "").lower() == priority.lower()]
    if task_type and task_type.lower() != "all":
        items = [t for t in items if t.get("task_type", "").lower() == task_type.lower()]
    if project_id:
        items = [t for t in items if t.get("project_id") == project_id]
    if target_assignee:
        items = [t for t in items if (t.get("assignee_id") == target_assignee or t.get("assigned_to_id") == target_assignee)]
    if search:
        q = search.lower()
        items = [t for t in items if q in t["title"].lower() or q in t.get("task_number", "").lower()]

    total = len(items)
    start = (page - 1) * page_size
    page_items = [_task_as_read(t) for t in items[start : start + page_size]]
    return TaskListResponse(items=page_items, total=total, page=page, page_size=page_size)


@router.get("/my", response_model=TaskListResponse, summary="My tasks (assigned to current user)")
async def list_my_tasks(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_optional_db),
):
    """Return tasks assigned to current user (default usr_01)."""
    my_user_id = "usr_01"
    return await list_tasks(
        page=page,
        page_size=page_size,
        status=status,
        priority=priority,
        task_type=None,
        project_id=None,
        assignee_id=my_user_id,
        assigned_to_id=None,
        search=None,
        db=db,
    )


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
# Single Task CRUD
# ---------------------------------------------------------------------------

@router.get("/{task_id}", response_model=TaskRead, summary="Get task by ID")
async def get_task(task_id: str, db: AsyncSession = Depends(get_optional_db)):
    """Fetch single task by ID."""
    try:
        res = await db.execute(
            select(Task)
            .options(
                selectinload(Task.assignee),
                selectinload(Task.comments),
                selectinload(Task.attachments),
            )
            .where(Task.id == task_id)
        )
        t = res.scalars().first()
        if t:
            return TaskRead(
                id=t.id,
                task_number=t.task_number,
                title=t.title,
                description=t.description,
                status=t.status,
                priority=t.priority,
                task_type=getattr(t, "task_type", "feature") or "feature",
                story_points=t.story_points,
                due_date=t.due_date,
                project_id=t.project_id,
                assignee_id=t.assignee_id,
                assigned_to_id=t.assignee_id,
                reporter_id=t.reporter_id,
                organization_id=t.organization_id or "org_01",
                created_at=t.created_at,
                updated_at=t.updated_at,
                comment_count=len(t.comments) if t.comments else 0,
                attachment_count=len(t.attachments) if t.attachments else 0,
                assignee=(
                    ActorSchema(id=t.assignee.id, full_name=t.assignee.full_name, avatar_url=t.assignee.avatar_url)
                    if t.assignee
                    else None
                ),
            )
    except Exception:
        pass

    task = next((t for t in _TASKS if t["id"] == task_id), None)
    if not task:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found")
    return _task_as_read(task)


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED, summary="Create task")
@router.post("/", response_model=TaskRead, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_task(
    payload: TaskCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_optional_db),
):
    """Create a new task and broadcast to real-time subscribers."""
    assignee_id = payload.assignee_id or payload.assigned_to_id or current_user_id
    task_id = str(uuid4())
    task_number = None

    try:
        project = None
        if payload.project_id:
            p_res = await db.execute(select(Project).where(Project.id == payload.project_id))
            project = p_res.scalars().first()

        if project:
            count_res = await db.execute(select(func.count(Task.id)).where(Task.project_id == payload.project_id))
            count = count_res.scalar() or 0
            task_number = f"{project.key}-{101 + count}"
        else:
            task_number = _next_task_number()

        now = datetime.now(timezone.utc)
        new_task = Task(
            id=task_id,
            task_number=task_number,
            title=payload.title.strip(),
            description=payload.description,
            status=payload.status or "todo",
            priority=payload.priority or "medium",
            task_type=payload.task_type or "feature",
            story_points=payload.story_points,
            due_date=payload.due_date,
            project_id=payload.project_id,
            assignee_id=assignee_id,
            reporter_id=current_user_id,
            organization_id="org_01",
            created_at=now,
            updated_at=now,
        )
        db.add(new_task)
        await db.flush()

        if project:
            activity = ProjectActivity(
                project_id=project.id,
                actor_id=current_user_id,
                action="task_created",
                category="tasks",
                target_type="task",
                target_id=new_task.id,
                target_title=new_task.title,
                details=f"Created task {new_task.task_number}",
                created_at=now,
            )
            db.add(activity)

        await db.commit()
    except Exception:
        try:
            await db.rollback()
        except Exception:
            pass
        if not task_number:
            task_number = _next_task_number()

    # Record in-memory for instant UI reactivity
    now_iso = _now_iso()
    task_dict = {
        "id": task_id,
        "task_number": task_number,
        "title": payload.title.strip(),
        "description": payload.description,
        "status": payload.status or "todo",
        "priority": payload.priority or "medium",
        "task_type": payload.task_type or "feature",
        "story_points": payload.story_points,
        "due_date": payload.due_date.isoformat() if payload.due_date else None,
        "project_id": payload.project_id,
        "assignee_id": assignee_id,
        "assigned_to_id": assignee_id,
        "reporter_id": current_user_id,
        "organization_id": "org_01",
        "created_at": now_iso,
        "updated_at": None,
        "comment_count": 0,
        "attachment_count": 0,
    }
    _TASKS.append(task_dict)
    await _broadcast({"event": "task_created", "task": _task_as_read(task_dict)})
    return _task_as_read(task_dict)


@router.patch("/{task_id}", response_model=TaskRead, summary="Update task")
async def update_task(
    task_id: str,
    payload: TaskUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_optional_db),
):
    """Update task fields and log activity if modified."""
    target_assignee = payload.assignee_id or payload.assigned_to_id
    now = datetime.now(timezone.utc)
    t = None

    try:
        res = await db.execute(
            select(Task)
            .options(
                selectinload(Task.assignee),
                selectinload(Task.comments),
                selectinload(Task.attachments),
            )
            .where(Task.id == task_id)
        )
        t = res.scalars().first()
        if t:
            if payload.title is not None:
                t.title = payload.title.strip()
            if payload.description is not None:
                t.description = payload.description
            if payload.status is not None:
                old_status = t.status
                t.status = payload.status
                if old_status != t.status and t.project_id:
                    activity = ProjectActivity(
                        project_id=t.project_id,
                        actor_id=current_user_id,
                        action="task_status_changed",
                        category="tasks",
                        target_type="task",
                        target_id=t.id,
                        target_title=t.title,
                        details=f"Status changed from {old_status} to {t.status}",
                        created_at=now,
                    )
                    db.add(activity)
            if payload.priority is not None:
                t.priority = payload.priority
            if payload.task_type is not None:
                t.task_type = payload.task_type
            if payload.story_points is not None:
                t.story_points = payload.story_points
            if payload.due_date is not None:
                t.due_date = payload.due_date
            if target_assignee is not None:
                t.assignee_id = target_assignee
            t.updated_at = now
            await db.commit()
    except Exception:
        try:
            await db.rollback()
        except Exception:
            pass

    task = next((item for item in _TASKS if item["id"] == task_id), None)
    if task:
        if payload.title is not None:
            task["title"] = payload.title
        if payload.description is not None:
            task["description"] = payload.description
        if payload.status is not None:
            task["status"] = payload.status
        if payload.priority is not None:
            task["priority"] = payload.priority
        if payload.task_type is not None:
            task["task_type"] = payload.task_type
        if payload.story_points is not None:
            task["story_points"] = payload.story_points
        if payload.due_date is not None:
            task["due_date"] = payload.due_date.isoformat() if payload.due_date else None
        if target_assignee is not None:
            task["assignee_id"] = target_assignee
            task["assigned_to_id"] = target_assignee
        task["updated_at"] = _now_iso()
        updated_dict = _task_as_read(task)
    elif t:
        updated_dict = TaskRead(
            id=t.id,
            task_number=t.task_number,
            title=t.title,
            description=t.description,
            status=t.status,
            priority=t.priority,
            task_type=getattr(t, "task_type", "feature") or "feature",
            story_points=t.story_points,
            due_date=t.due_date,
            project_id=t.project_id,
            assignee_id=t.assignee_id,
            assigned_to_id=t.assignee_id,
            reporter_id=t.reporter_id,
            organization_id=t.organization_id or "org_01",
            created_at=t.created_at,
            updated_at=t.updated_at,
            comment_count=len(t.comments) if t.comments else 0,
            attachment_count=len(t.attachments) if t.attachments else 0,
            assignee=(
                ActorSchema(id=t.assignee.id, full_name=t.assignee.full_name, avatar_url=t.assignee.avatar_url)
                if t.assignee
                else None
            ),
        )
    else:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found")

    await _broadcast({"event": "task_updated", "task": updated_dict})
    return updated_dict


@router.patch("/{task_id}/status", response_model=TaskRead, summary="Change task status")
async def change_task_status(
    task_id: str,
    payload: TaskStatusChange,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_optional_db),
):
    """Change status of a task and broadcast event."""
    res = await update_task(task_id, TaskUpdate(status=payload.status), current_user_id=current_user_id, db=db)
    await _broadcast({"event": "task_status_changed", "task_id": task_id, "status": payload.status})
    return res


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete task")
async def delete_task(
    task_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_optional_db),
):
    """Delete task and broadcast deletion event."""
    try:
        res = await db.execute(select(Task).where(Task.id == task_id))
        t = res.scalars().first()
        if t:
            if t.project_id:
                activity = ProjectActivity(
                    project_id=t.project_id,
                    actor_id=current_user_id,
                    action="task_deleted",
                    category="tasks",
                    target_type="task",
                    target_id=t.id,
                    target_title=t.title,
                    details=f"Deleted task {t.task_number}",
                    created_at=datetime.now(timezone.utc),
                )
                db.add(activity)
            await db.delete(t)
            await db.commit()
    except Exception:
        try:
            await db.rollback()
        except Exception:
            pass

    task = next((item for item in _TASKS if item["id"] == task_id), None)
    if task:
        _TASKS.remove(task)
    await _broadcast({"event": "task_deleted", "task_id": task_id})


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------

@router.get("/{task_id}/comments", response_model=List[TaskCommentRead], summary="List task comments")
async def list_comments(task_id: str, db: AsyncSession = Depends(get_optional_db)):
    """List comments for a task."""
    try:
        from backend.app.models import TaskComment
        res = await db.execute(select(TaskComment).where(TaskComment.task_id == task_id))
        comments = res.scalars().all()
        if comments:
            return [
                TaskCommentRead(
                    id=c.id,
                    body=c.body,
                    task_id=c.task_id,
                    author_id=c.author_id,
                    created_at=c.created_at,
                    updated_at=c.updated_at,
                )
                for c in comments
            ]
    except Exception:
        pass
    return [c for c in _COMMENTS if c["task_id"] == task_id]


@router.post("/{task_id}/comments", response_model=TaskCommentRead, status_code=status.HTTP_201_CREATED, summary="Add comment")
async def add_comment(
    task_id: str,
    payload: TaskCommentCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_optional_db),
):
    """Add a new comment to a task."""
    cid = str(uuid4())
    now = datetime.now(timezone.utc)
    try:
        from backend.app.models import TaskComment
        c_obj = TaskComment(
            id=cid,
            task_id=task_id,
            author_id=current_user_id,
            body=payload.body,
            created_at=now,
        )
        db.add(c_obj)
        await db.commit()
    except Exception:
        try:
            await db.rollback()
        except Exception:
            pass

    comment = {
        "id": cid,
        "body": payload.body,
        "task_id": task_id,
        "author_id": current_user_id,
        "created_at": now.isoformat(),
        "updated_at": None,
    }
    _COMMENTS.append(comment)
    await _broadcast({"event": "comment_added", "task_id": task_id, "comment": comment})
    return comment


# ---------------------------------------------------------------------------
# Attachments
# ---------------------------------------------------------------------------

@router.get("/{task_id}/attachments", response_model=List[TaskAttachmentRead], summary="List task attachments")
async def list_attachments(task_id: str, db: AsyncSession = Depends(get_optional_db)):
    """List file attachment metadata for a task."""
    try:
        from backend.app.models import TaskAttachment
        res = await db.execute(select(TaskAttachment).where(TaskAttachment.task_id == task_id))
        attachments = res.scalars().all()
        if attachments:
            return [
                TaskAttachmentRead(
                    id=a.id,
                    filename=a.filename,
                    file_size=a.file_size,
                    mime_type=a.mime_type,
                    storage_key=a.storage_key,
                    uploader_id=a.uploader_id,
                    task_id=a.task_id,
                    created_at=a.created_at,
                )
                for a in attachments
            ]
    except Exception:
        pass
    return [a for a in _ATTACHMENTS if a["task_id"] == task_id]


@router.post("/{task_id}/attachments", response_model=TaskAttachmentRead, status_code=status.HTTP_201_CREATED, summary="Register attachment metadata")
async def register_attachment(
    task_id: str,
    payload: TaskAttachmentCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_optional_db),
):
    """Register attachment metadata after upload."""
    aid = str(uuid4())
    now = datetime.now(timezone.utc)
    try:
        from backend.app.models import TaskAttachment
        a_obj = TaskAttachment(
            id=aid,
            filename=payload.filename,
            file_size=payload.file_size,
            mime_type=payload.mime_type,
            storage_key=payload.storage_key,
            task_id=task_id,
            uploader_id=current_user_id,
            created_at=now,
        )
        db.add(a_obj)
        await db.commit()
    except Exception:
        try:
            await db.rollback()
        except Exception:
            pass

    attachment = {
        "id": aid,
        "filename": payload.filename,
        "file_size": payload.file_size,
        "mime_type": payload.mime_type,
        "storage_key": payload.storage_key,
        "task_id": task_id,
        "uploader_id": current_user_id,
        "created_at": now.isoformat(),
    }
    _ATTACHMENTS.append(attachment)
    return attachment


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
