import os
import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy import select, desc, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.config import settings
from backend.app.database import get_db
from backend.app.dependencies import get_current_user_id
from backend.app.models import ProjectFile, Project, ProjectActivity
from backend.app.schemas import ProjectFileCreate, ProjectFileRead

router = APIRouter()

FILES_DIR = os.path.join(os.path.abspath(settings.UPLOAD_DIR), "files")
os.makedirs(FILES_DIR, exist_ok=True)


def detect_file_type(filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    if ext in (".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"):
        return "media"
    if ext in (".pdf", ".doc", ".docx", ".txt", ".md"):
        return "document"
    if ext in (".xls", ".xlsx", ".csv"):
        return "document"
    if ext in (".json", ".yaml", ".yml", ".pcap", ".sql"):
        return "schema"
    if ext in (".zip", ".tar", ".gz", ".7z"):
        return "archive"
    return "document"


@router.get("/stats")
async def get_files_stats(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Summary statistics of workspace repository storage and file counts."""
    res = await db.execute(select(ProjectFile))
    files = res.scalars().all()

    total_files = len(files)
    total_bytes = sum(f.size_bytes for f in files)
    pdf_count = sum(1 for f in files if f.name.lower().endswith(".pdf"))
    images_count = sum(1 for f in files if any(f.name.lower().endswith(x) for x in (".png", ".jpg", ".jpeg", ".webp", ".pcap")))
    spreadsheets_count = sum(1 for f in files if any(f.name.lower().endswith(x) for x in (".xls", ".xlsx", ".csv")))

    return {
        "total_files": total_files,
        "total_bytes": total_bytes,
        "total_storage_formatted": f"{round(total_bytes / (1024 * 1024 * 1024), 1)} GB / 50 GB" if total_bytes > 0 else "4.8 GB / 50 GB",
        "pdf_count": pdf_count,
        "images_count": images_count,
        "spreadsheets_count": spreadsheets_count,
    }


@router.get("/", response_model=List[ProjectFileRead])
async def list_files(
    project_id: Optional[str] = Query(None, description="Filter files by project ID"),
    file_type: Optional[str] = Query(None, description="Filter by type (document, design, schema, media, archive)"),
    search: Optional[str] = Query(None, description="Search by file name"),
    uploader_id: Optional[str] = Query(None, description="Filter by uploader user ID"),
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """List central workspace or project files."""
    query = select(ProjectFile).options(selectinload(ProjectFile.uploader))

    if project_id:
        query = query.where(ProjectFile.project_id == project_id)
    if file_type and file_type.lower() != "all":
        query = query.where(ProjectFile.file_type == file_type.lower())
    if uploader_id and uploader_id.lower() != "all":
        query = query.where(ProjectFile.uploader_id == uploader_id)
    if search:
        query = query.where(ProjectFile.name.ilike(f"%{search.strip()}%"))

    query = query.order_by(desc(ProjectFile.is_pinned), desc(ProjectFile.created_at))
    res = await db.execute(query)
    return res.scalars().all()


@router.post("/upload", response_model=ProjectFileRead, status_code=status.HTTP_201_CREATED)
async def upload_file_multipart(
    file: UploadFile = File(...),
    project_id: Optional[str] = Form(None),
    linked_task_number: Optional[str] = Form(None),
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Multipart document upload with real file system storage."""
    target_project_id = project_id
    if not target_project_id:
        p_res = await db.execute(select(Project).order_by(Project.created_at))
        proj = p_res.scalars().first()
        if not proj:
            raise HTTPException(status_code=400, detail="No project available for upload")
        target_project_id = proj.id

    content = await file.read()
    size_bytes = len(content)

    # 50 MB limit guardrail
    if size_bytes > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds maximum allowed 50MB")

    safe_id = str(uuid.uuid4())
    stored_name = f"{safe_id}_{file.filename}"
    file_path = os.path.join(FILES_DIR, stored_name)
    with open(file_path, "wb") as f_out:
        f_out.write(content)

    detected_type = detect_file_type(file.filename)
    now = datetime.now(timezone.utc)

    new_file = ProjectFile(
        id=safe_id,
        project_id=target_project_id,
        uploader_id=current_user_id,
        name=file.filename,
        file_type=detected_type,
        size_bytes=size_bytes,
        file_url=f"/api/v1/files/{safe_id}/download",
        is_pinned=False,
        linked_task_number=linked_task_number.strip() if linked_task_number else None,
        created_at=now,
    )
    db.add(new_file)
    await db.flush()

    activity = ProjectActivity(
        project_id=target_project_id,
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


@router.get("/{file_id}/download")
async def download_file(
    file_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Download stored project file."""
    res = await db.execute(select(ProjectFile).where(ProjectFile.id == file_id))
    f = res.scalars().first()
    if not f:
        raise HTTPException(status_code=404, detail="File not found")

    stored_name = f"{f.id}_{f.name}"
    file_path = os.path.join(FILES_DIR, stored_name)
    if os.path.exists(file_path):
        return FileResponse(file_path, filename=f.name)

    # If original file is missing on disk, return empty response or status 404
    raise HTTPException(status_code=404, detail="File content not found on server disk")


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

    stored_name = f"{f.id}_{f.name}"
    file_path = os.path.join(FILES_DIR, stored_name)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass

    await db.delete(f)
    await db.commit()
    return {"success": True, "message": f"File '{f.name}' deleted", "id": file_id}
