from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, and_, desc, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database import get_db
from backend.app.dependencies import get_current_user_id
from backend.app.models import Task, Project, User, ProjectActivity
from backend.app.schemas import TaskCreate, TaskUpdate, TaskRead

router = APIRouter()


@router.get("/", response_model=List[TaskRead])
async def list_tasks(
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    status: Optional[str] = Query(None, description="Filter by status (to_do, in_progress, in_review, done)"),
    priority: Optional[str] = Query(None, description="Filter by priority (low, medium, high, blocker)"),
    assigned_to_id: Optional[str] = Query(None, description="Filter by assignee user ID"),
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """List all workspace tasks or filter by project, assignee, status, priority."""
    query = select(Task).options(selectinload(Task.assignee))

    if project_id:
        query = query.where(Task.project_id == project_id)
    if status and status.lower() != "all":
        query = query.where(Task.status == status.lower())
    if priority and priority.lower() != "all":
        query = query.where(Task.priority == priority.lower())
    if assigned_to_id and assigned_to_id.lower() != "all":
        query = query.where(Task.assigned_to_id == assigned_to_id)

    query = query.order_by(Task.created_at.asc())
    res = await db.execute(query)
    tasks = res.scalars().all()
    return tasks


@router.post("/", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_in: TaskCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Create a new task in a project."""
    # Verify project
    p_res = await db.execute(select(Project).where(Project.id == task_in.project_id))
    project = p_res.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Generate sequential task number
    count_res = await db.execute(
        select(func.count(Task.id)).where(Task.project_id == task_in.project_id)
    )
    count = count_res.scalar() or 0
    task_num = f"{project.key}-{101 + count}"

    now = datetime.now(timezone.utc)
    new_task = Task(
        task_number=task_num,
        title=task_in.title.strip(),
        description=task_in.description,
        status=(task_in.status or "to_do").lower(),
        priority=(task_in.priority or "medium").lower(),
        project_id=task_in.project_id,
        assigned_to_id=task_in.assigned_to_id or current_user_id,
        created_at=now,
        updated_at=now,
    )
    db.add(new_task)
    await db.flush()

    # Log project activity
    activity = ProjectActivity(
        project_id=project.id,
        actor_id=current_user_id,
        action="task_created",
        category="tasks",
        target_type="task",
        target_id=new_task.id,
        target_title=f"[{new_task.task_number}] {new_task.title}",
        details=f"Created task with priority {(new_task.priority or 'medium').lower()}",
        created_at=now,
    )
    db.add(activity)
    await db.commit()

    # Re-fetch with assignee
    res = await db.execute(
        select(Task).options(selectinload(Task.assignee)).where(Task.id == new_task.id)
    )
    return res.scalars().first()


@router.get("/{task_id}", response_model=TaskRead)
async def get_task(
    task_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Get single task details."""
    res = await db.execute(
        select(Task).options(selectinload(Task.assignee)).where(Task.id == task_id)
    )
    task = res.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.patch("/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: str,
    task_update: TaskUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Update task status, priority, title, description, or assignee."""
    res = await db.execute(
        select(Task).options(selectinload(Task.assignee)).where(Task.id == task_id)
    )
    task = res.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_dict = task_update.model_dump(exclude_unset=True)
    prev_status = task.status
    now = datetime.now(timezone.utc)

    for field, val in update_dict.items():
        if val is not None:
            if field in ("status", "priority") and isinstance(val, str):
                setattr(task, field, val.lower())
            else:
                setattr(task, field, val)

    task.updated_at = now

    # If status changed, record activity
    if "status" in update_dict and update_dict["status"].lower() != prev_status:
        activity = ProjectActivity(
            project_id=task.project_id,
            actor_id=current_user_id,
            action="status_change",
            category="tasks",
            target_type="task",
            target_id=task.id,
            target_title=f"[{task.task_number}] {task.title}",
            details=f"Status transitioned from {prev_status} to {task.status}",
            created_at=now,
        )
        db.add(activity)

    await db.commit()

    res = await db.execute(
        select(Task).options(selectinload(Task.assignee)).where(Task.id == task.id)
    )
    return res.scalars().first()


@router.delete("/{task_id}", status_code=status.HTTP_200_OK)
async def delete_task(
    task_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Delete a task."""
    res = await db.execute(select(Task).where(Task.id == task_id))
    task = res.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    await db.delete(task)
    await db.commit()
    return {"success": True, "message": "Task deleted", "id": task_id}
