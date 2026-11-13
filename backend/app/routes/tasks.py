"""
Tasks router — Enterprise Grade, Multi-Tenant Database Driven Implementation.
Enforces strict organization isolation, active JWT authentication, and real-time WebSocket broadcasting.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select, func, desc, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.database import get_db
from backend.app.dependencies import get_current_active_user
from backend.app.models import Task, Project, User, ProjectActivity, TaskComment, TaskAttachment
from backend.app.enums import TaskStatus, TaskPriority, TaskType
from backend.app.core.websockets import ws_manager, authenticate_ws
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


def _format_task_read(t: Task) -> TaskRead:
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
        organization_id=t.organization_id,
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


# ---------------------------------------------------------------------------
# Enum reference endpoint (public / meta for frontend dropdowns)
# ---------------------------------------------------------------------------

@router.get("/meta/enums", summary="Task enum values and display labels")
async def task_enums():
    return {
        "status": [{"value": e.value, "label": e.value.replace("_", " ").title()} for e in TaskStatus],
        "priority": [{"value": e.value, "label": e.value.capitalize()} for e in TaskPriority],
        "task_type": [{"value": e.value, "label": e.value.capitalize()} for e in TaskType],
    }


# ---------------------------------------------------------------------------
# Task List / Filter (Multi-Tenant Scoped)
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
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Return all workspace tasks matching criteria, strictly scoped to current user's organization.
    """
    target_assignee = assignee_id or assigned_to_id
    if target_assignee and target_assignee.lower() == "all":
        target_assignee = None

    base_filter = [Task.organization_id == current_user.organization_id]

    if project_id and project_id.lower() != "all":
        base_filter.append(Task.project_id == project_id)
    if status and status.lower() != "all":
        stat_val = status.lower()
        base_filter.append(
            func.lower(Task.status).in_([
                stat_val,
                stat_val.replace("to_do", "todo"),
                stat_val.replace("todo", "to_do"),
            ])
        )
    if priority and priority.lower() != "all":
        base_filter.append(func.lower(Task.priority) == priority.lower())
    if task_type and task_type.lower() != "all":
        base_filter.append(func.lower(Task.task_type) == task_type.lower())
    if target_assignee:
        base_filter.append(Task.assignee_id == target_assignee)
    if search:
        q = f"%{search.strip().lower()}%"
        base_filter.append(or_(func.lower(Task.title).like(q), func.lower(Task.task_number).like(q)))

    # Count total
    count_query = select(func.count(Task.id)).where(*base_filter)
    count_res = await db.execute(count_query)
    total = count_res.scalar() or 0

    # Paginate query
    query = (
        select(Task)
        .options(
            selectinload(Task.assignee),
            selectinload(Task.comments),
            selectinload(Task.attachments),
        )
        .where(*base_filter)
        .order_by(desc(Task.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    res = await db.execute(query)
    tasks = res.scalars().all()

    items = [_format_task_read(t) for t in tasks]
    return TaskListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/my", response_model=TaskListResponse, summary="My tasks (assigned to current user)")
async def list_my_tasks(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Return tasks assigned to current authenticated user within their organization."""
    return await list_tasks(
        page=page,
        page_size=page_size,
        status=status,
        priority=priority,
        task_type=None,
        project_id=None,
        assignee_id=current_user.id,
        assigned_to_id=None,
        search=None,
        current_user=current_user,
        db=db,
    )


# ---------------------------------------------------------------------------
# Single Task CRUD
# ---------------------------------------------------------------------------

@router.get("/{task_id}", response_model=TaskRead, summary="Get task by ID")
async def get_task(
    task_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch single task by ID, scoped to user's organization."""
    res = await db.execute(
        select(Task)
        .options(
            selectinload(Task.assignee),
            selectinload(Task.comments),
            selectinload(Task.attachments),
        )
        .where(Task.id == task_id, Task.organization_id == current_user.organization_id)
    )
    t = res.scalars().first()
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return _format_task_read(t)


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED, summary="Create task")
@router.post("/", response_model=TaskRead, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_task(
    payload: TaskCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new task scoped to current tenant and broadcast to real-time subscribers."""
    assignee_id = payload.assignee_id or payload.assigned_to_id or current_user.id
    task_id = str(uuid4())

    # Validate project belongs to user's organization
    project = None
    if payload.project_id:
        p_res = await db.execute(
            select(Project).where(
                Project.id == payload.project_id,
                Project.organization_id == current_user.organization_id
            )
        )
        project = p_res.scalars().first()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Referenced project does not exist or does not belong to your organization"
            )

    # Validate assignee belongs to organization
    if assignee_id and assignee_id != current_user.id:
        u_res = await db.execute(
            select(User).where(
                User.id == assignee_id,
                User.organization_id == current_user.organization_id
            )
        )
        if not u_res.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assignee does not belong to your organization"
            )

    # Generate sequential project-specific task number or org-level task number
    if project:
        count_res = await db.execute(select(func.count(Task.id)).where(Task.project_id == payload.project_id))
        count = count_res.scalar() or 0
        task_number = f"{project.key}-{101 + count}"
    else:
        count_res = await db.execute(select(func.count(Task.id)).where(Task.organization_id == current_user.organization_id))
        count = count_res.scalar() or 0
        task_number = f"TASK-{101 + count}"

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
        reporter_id=current_user.id,
        organization_id=current_user.organization_id,
        created_at=now,
        updated_at=now,
    )
    db.add(new_task)
    await db.flush()

    if project:
        activity = ProjectActivity(
            project_id=project.id,
            actor_id=current_user.id,
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

    # Re-fetch with relationships loaded
    res = await db.execute(
        select(Task)
        .options(
            selectinload(Task.assignee),
            selectinload(Task.comments),
            selectinload(Task.attachments),
        )
        .where(Task.id == task_id)
    )
    saved_task = res.scalars().first()
    task_read = _format_task_read(saved_task)

    # Real-time broadcast to organization workspace
    await ws_manager.broadcast_to_workspace(
        current_user.organization_id,
        {"event": "task_created", "task": task_read.model_dump(mode="json")}
    )

    return task_read


@router.patch("/{task_id}", response_model=TaskRead, summary="Update task")
async def update_task(
    task_id: str,
    payload: TaskUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Update task fields and log activity if modified, scoped to current organization."""
    target_assignee = payload.assignee_id or payload.assigned_to_id
    now = datetime.now(timezone.utc)

    res = await db.execute(
        select(Task)
        .options(
            selectinload(Task.assignee),
            selectinload(Task.comments),
            selectinload(Task.attachments),
        )
        .where(Task.id == task_id, Task.organization_id == current_user.organization_id)
    )
    t = res.scalars().first()
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

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
                actor_id=current_user.id,
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
        # Validate assignee belongs to organization
        if target_assignee != current_user.id:
            u_res = await db.execute(
                select(User).where(
                    User.id == target_assignee,
                    User.organization_id == current_user.organization_id
                )
            )
            if not u_res.scalars().first():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Assignee does not belong to your organization"
                )
        t.assignee_id = target_assignee

    t.updated_at = now
    await db.commit()

    # Re-fetch with relationships loaded
    refetch = await db.execute(
        select(Task)
        .options(
            selectinload(Task.assignee),
            selectinload(Task.comments),
            selectinload(Task.attachments),
        )
        .where(Task.id == task_id)
    )
    updated_task = refetch.scalars().first()
    task_read = _format_task_read(updated_task)

    await ws_manager.broadcast_to_workspace(
        current_user.organization_id,
        {"event": "task_updated", "task": task_read.model_dump(mode="json")}
    )
    return task_read


@router.patch("/{task_id}/status", response_model=TaskRead, summary="Change task status")
async def change_task_status(
    task_id: str,
    payload: TaskStatusChange,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Change status of a task and broadcast event."""
    res = await update_task(task_id, TaskUpdate(status=payload.status), current_user=current_user, db=db)
    await ws_manager.broadcast_to_workspace(
        current_user.organization_id,
        {"event": "task_status_changed", "task_id": task_id, "status": payload.status}
    )
    return res


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete task")
async def delete_task(
    task_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete task and broadcast deletion event."""
    res = await db.execute(
        select(Task).where(Task.id == task_id, Task.organization_id == current_user.organization_id)
    )
    t = res.scalars().first()
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    if t.project_id:
        activity = ProjectActivity(
            project_id=t.project_id,
            actor_id=current_user.id,
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

    await ws_manager.broadcast_to_workspace(
        current_user.organization_id,
        {"event": "task_deleted", "task_id": task_id}
    )


# ---------------------------------------------------------------------------
# Comments (Scoped to Organization)
# ---------------------------------------------------------------------------

@router.get("/{task_id}/comments", response_model=List[TaskCommentRead], summary="List task comments")
async def list_comments(
    task_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """List comments for a task in user's organization."""
    # Verify task ownership
    t_res = await db.execute(
        select(Task).where(Task.id == task_id, Task.organization_id == current_user.organization_id)
    )
    if not t_res.scalars().first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    res = await db.execute(
        select(TaskComment).where(TaskComment.task_id == task_id).order_by(TaskComment.created_at.asc())
    )
    comments = res.scalars().all()
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


@router.post("/{task_id}/comments", response_model=TaskCommentRead, status_code=status.HTTP_201_CREATED, summary="Add comment")
async def add_comment(
    task_id: str,
    payload: TaskCommentCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a new comment to a task."""
    t_res = await db.execute(
        select(Task).where(Task.id == task_id, Task.organization_id == current_user.organization_id)
    )
    if not t_res.scalars().first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    cid = str(uuid4())
    now = datetime.now(timezone.utc)
    c_obj = TaskComment(
        id=cid,
        task_id=task_id,
        author_id=current_user.id,
        body=payload.body,
        created_at=now,
    )
    db.add(c_obj)
    await db.commit()

    comment_read = TaskCommentRead(
        id=cid,
        body=payload.body,
        task_id=task_id,
        author_id=current_user.id,
        created_at=now,
        updated_at=None,
    )
    await ws_manager.broadcast_to_workspace(
        current_user.organization_id,
        {"event": "comment_added", "task_id": task_id, "comment": comment_read.model_dump(mode="json")}
    )
    return comment_read


# ---------------------------------------------------------------------------
# Attachments (Scoped to Organization)
# ---------------------------------------------------------------------------

@router.get("/{task_id}/attachments", response_model=List[TaskAttachmentRead], summary="List task attachments")
async def list_attachments(
    task_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """List file attachment metadata for a task."""
    t_res = await db.execute(
        select(Task).where(Task.id == task_id, Task.organization_id == current_user.organization_id)
    )
    if not t_res.scalars().first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    res = await db.execute(
        select(TaskAttachment).where(TaskAttachment.task_id == task_id).order_by(TaskAttachment.created_at.asc())
    )
    attachments = res.scalars().all()
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


@router.post("/{task_id}/attachments", response_model=TaskAttachmentRead, status_code=status.HTTP_201_CREATED, summary="Register attachment metadata")
async def register_attachment(
    task_id: str,
    payload: TaskAttachmentCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Register attachment metadata after upload."""
    t_res = await db.execute(
        select(Task).where(Task.id == task_id, Task.organization_id == current_user.organization_id)
    )
    if not t_res.scalars().first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    aid = str(uuid4())
    now = datetime.now(timezone.utc)
    a_obj = TaskAttachment(
        id=aid,
        filename=payload.filename,
        file_size=payload.file_size,
        mime_type=payload.mime_type,
        storage_key=payload.storage_key,
        task_id=task_id,
        uploader_id=current_user.id,
        created_at=now,
    )
    db.add(a_obj)
    await db.commit()

    return TaskAttachmentRead(
        id=aid,
        filename=payload.filename,
        file_size=payload.file_size,
        mime_type=payload.mime_type,
        storage_key=payload.storage_key,
        task_id=task_id,
        uploader_id=current_user.id,
        created_at=now,
    )


# ---------------------------------------------------------------------------
# WebSocket Endpoint (Authenticated and Scoped)
# ---------------------------------------------------------------------------

@router.websocket("/ws")
@router.websocket("/ws/{workspace_id}")
async def tasks_ws(
    websocket: WebSocket,
    workspace_id: Optional[str] = None,
    token: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticated real-time task event stream scoped to user's organization workspace.
    """
    user = await authenticate_ws(websocket, token, db, required_workspace_id=workspace_id)
    if not user:
        return

    target_ws = workspace_id or user.organization_id
    await ws_manager.connect(websocket, target_ws)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, target_ws)
    except Exception:
        ws_manager.disconnect(websocket, target_ws)
