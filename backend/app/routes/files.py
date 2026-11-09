from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database import get_db
from backend.app.dependencies import get_current_user_id
from backend.app.models import ProjectFile, Project, ProjectActivity
from backend.app.schemas import ProjectFileCreate, ProjectFileRead

router = APIRouter()


@router.get("/", response_model=List[ProjectFileRead])
async def list_files(
    project_id: Optional[str] = Query(None, description="Filter files by project ID"),
    file_type: Optional[str] = Query(None, description="Filter by type (document, design, schema, media, archive)"),
    search: Optional[str] = Query(None, description="Search by file name"),
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """List central workspace or project files."""
    query = select(ProjectFile).options(selectinload(ProjectFile.uploader))

    if project_id:
        query = query.where(ProjectFile.project_id == project_id)
    if file_type and file_type.lower() != "all":
        query = query.where(ProjectFile.file_type == file_type.lower())
    if search:
        query = query.where(ProjectFile.name.ilike(f"%{search.strip()}%"))

    query = query.order_by(desc(ProjectFile.is_pinned), desc(ProjectFile.created_at))
    res = await db.execute(query)
    return res.scalars().all()


@router.post("/", response_model=ProjectFileRead, status_code=status.HTTP_201_CREATED)
async def create_project_file(
    file_in: ProjectFileCreate,
    project_id: str = Query(..., description="Project ID"),
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Register or upload file metadata linked to project."""
    p_res = await db.execute(select(Project).where(Project.id == project_id))
    if not p_res.scalars().first():
        raise HTTPException(status_code=404, detail="Project not found")

    now = datetime.now(timezone.utc)
    new_file = ProjectFile(
        project_id=project_id,
        uploader_id=current_user_id,
        name=file_in.name.strip(),
        file_type=(file_in.file_type or "document").lower(),
        size_bytes=file_in.size_bytes or 1024,
        file_url=file_in.file_url or f"/uploads/{file_in.name.strip()}",
        is_pinned=bool(file_in.is_pinned),
        linked_task_number=file_in.linked_task_number,
        created_at=now,
    )
    db.add(new_file)
    await db.flush()

    activity = ProjectActivity(
        project_id=project_id,
        actor_id=current_user_id,
        action="file_uploaded",
        category="files",
        target_type="file",
        target_id=new_file.id,
        target_title=new_file.name,
        details=f"File uploaded ({new_file.file_type})",
        created_at=now,
    )
    db.add(activity)
    await db.commit()

    res = await db.execute(
        select(ProjectFile).options(selectinload(ProjectFile.uploader)).where(ProjectFile.id == new_file.id)
    )
    return res.scalars().first()


@router.delete("/{file_id}", status_code=status.HTTP_200_OK)
async def delete_project_file(
    file_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Delete a project file."""
    res = await db.execute(select(ProjectFile).where(ProjectFile.id == file_id))
    f = res.scalars().first()
    if not f:
        raise HTTPException(status_code=404, detail="File not found")

    await db.delete(f)
    await db.commit()
    return {"success": True, "message": f"File '{f.name}' deleted", "id": file_id}
