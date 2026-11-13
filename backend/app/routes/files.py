import os
import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy import select, desc, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.config import settings
from backend.app.database import get_db
from backend.app.dependencies import get_current_active_user
from backend.app.models import ProjectFile, Project, ProjectActivity, User
from backend.app.schemas import ProjectFileCreate, ProjectFileRead

router = APIRouter()

FILES_DIR = os.path.abspath(os.path.join(settings.UPLOAD_DIR, "files"))
os.makedirs(FILES_DIR, exist_ok=True)

ALLOWED_FILE_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg",
    ".pdf", ".doc", ".docx", ".txt", ".md",
    ".xls", ".xlsx", ".csv",
    ".json", ".yaml", ".yml", ".pcap", ".sql",
    ".zip", ".tar", ".gz", ".7z"
}


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
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Summary statistics of workspace repository storage and file counts scoped to user organization."""
    res = await db.execute(
        select(ProjectFile)
        .join(ProjectFile.project)
        .where(Project.organization_id == current_user.organization_id)
    )
    files = res.scalars().all()

    total_files = len(files)
    total_bytes = sum(f.size_bytes for f in files)
    pdf_count = sum(1 for f in files if f.name.lower().endswith(".pdf"))
    images_count = sum(1 for f in files if any(f.name.lower().endswith(x) for x in (".png", ".jpg", ".jpeg", ".webp", ".pcap", ".svg", ".gif")))
    spreadsheets_count = sum(1 for f in files if any(f.name.lower().endswith(x) for x in (".xls", ".xlsx", ".csv")))

    return {
        "total_files": total_files,
        "total_bytes": total_bytes,
        "total_storage_formatted": f"{round(total_bytes / (1024 * 1024 * 1024), 1)} GB / 50 GB" if total_bytes > 0 else "0.0 GB / 50 GB",
        "pdf_count": pdf_count,
        "images_count": images_count,
        "spreadsheets_count": spreadsheets_count,
    }


@router.get("", response_model=List[ProjectFileRead])
@router.get("/", response_model=List[ProjectFileRead], include_in_schema=False)
async def list_files(
    project_id: Optional[str] = Query(None, description="Filter files by project ID"),
    file_type: Optional[str] = Query(None, description="Filter by type (document, design, schema, media, archive)"),
    search: Optional[str] = Query(None, description="Search by file name"),
    uploader_id: Optional[str] = Query(None, description="Filter by uploader user ID"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """List central workspace or project files scoped to authenticated tenant."""
    query = (
        select(ProjectFile)
        .options(selectinload(ProjectFile.uploader))
        .join(ProjectFile.project)
        .where(Project.organization_id == current_user.organization_id)
    )

    if project_id and project_id.lower() != "all":
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
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Multipart document upload with real file system storage and strict security validation."""
    target_project_id = project_id
    if not target_project_id:
        p_res = await db.execute(
            select(Project)
            .where(Project.organization_id == current_user.organization_id)
            .order_by(Project.created_at)
        )
        proj = p_res.scalars().first()
        if not proj:
            raise HTTPException(status_code=400, detail="No project available in your organization for upload")
        target_project_id = proj.id
    else:
        p_res = await db.execute(
            select(Project).where(
                Project.id == target_project_id,
                Project.organization_id == current_user.organization_id
            )
        )
        if not p_res.scalars().first():
            raise HTTPException(status_code=404, detail="Project not found or not in your organization")

    # Sanitize filename and prevent directory traversal
    raw_filename = file.filename or "uploaded_file.bin"
    safe_name = os.path.basename(raw_filename).replace("..", "").strip()
    if not safe_name:
        safe_name = "uploaded_file.bin"

    # Extension validation
    ext = Path(safe_name).suffix.lower()
    if ext not in ALLOWED_FILE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File extension '{ext}' is not permitted."
        )

    content = await file.read()
    size_bytes = len(content)

    # 50 MB limit guardrail
    if size_bytes > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds maximum allowed 50MB")

    safe_id = str(uuid.uuid4())
    stored_name = f"{safe_id}_{safe_name}"
    file_path = os.path.abspath(os.path.join(FILES_DIR, stored_name))

    # Path traversal validation
    if not file_path.startswith(FILES_DIR):
        raise HTTPException(status_code=400, detail="Invalid file destination path")

    with open(file_path, "wb") as f_out:
        f_out.write(content)

    detected_type = detect_file_type(safe_name)
    now = datetime.now(timezone.utc)

    new_file = ProjectFile(
        id=safe_id,
        project_id=target_project_id,
        uploader_id=current_user.id,
        name=safe_name,
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
        actor_id=current_user.id,
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
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Download stored project file, ensuring tenant ownership."""
    res = await db.execute(
        select(ProjectFile)
        .options(selectinload(ProjectFile.project))
        .where(ProjectFile.id == file_id)
    )
    f = res.scalars().first()
    if not f or not f.project or f.project.organization_id != current_user.organization_id:
        raise HTTPException(status_code=404, detail="File not found")

    stored_name = f"{f.id}_{f.name}"
    file_path = os.path.abspath(os.path.join(FILES_DIR, stored_name))

    if not file_path.startswith(FILES_DIR):
        raise HTTPException(status_code=400, detail="Invalid file path")

    if os.path.exists(file_path):
        return FileResponse(file_path, filename=f.name)

    raise HTTPException(status_code=404, detail="File content not found on server disk")


@router.post("", response_model=ProjectFileRead, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=ProjectFileRead, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_project_file(
    file_in: ProjectFileCreate,
    project_id: str = Query(..., description="Project ID"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Register file metadata linked to project within tenant."""
    p_res = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.organization_id == current_user.organization_id
        )
    )
    if not p_res.scalars().first():
        raise HTTPException(status_code=404, detail="Project not found or does not belong to your organization")

    safe_name = os.path.basename(file_in.name.strip()).replace("..", "")
    now = datetime.now(timezone.utc)
    new_file = ProjectFile(
        project_id=project_id,
        uploader_id=current_user.id,
        name=safe_name,
        file_type=(file_in.file_type or "document").lower(),
        size_bytes=file_in.size_bytes or 1024,
        file_url=file_in.file_url or f"/uploads/{safe_name}",
        is_pinned=bool(file_in.is_pinned),
        linked_task_number=file_in.linked_task_number,
        created_at=now,
    )
    db.add(new_file)
    await db.flush()

    activity = ProjectActivity(
        project_id=project_id,
        actor_id=current_user.id,
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
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a project file."""
    res = await db.execute(
        select(ProjectFile)
        .options(selectinload(ProjectFile.project))
        .where(ProjectFile.id == file_id)
    )
    f = res.scalars().first()
    if not f or not f.project or f.project.organization_id != current_user.organization_id:
        raise HTTPException(status_code=404, detail="File not found")

    stored_name = f"{f.id}_{f.name}"
    file_path = os.path.abspath(os.path.join(FILES_DIR, stored_name))
    if file_path.startswith(FILES_DIR) and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass

    await db.delete(f)
    await db.commit()
    return {"success": True, "message": f"File '{f.name}' deleted", "id": file_id}
