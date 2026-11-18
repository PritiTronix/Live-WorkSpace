import os
import io
import uuid
import hmac
import hashlib
import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from jose import jwt

from backend.app.core.config import settings
from backend.app.database import get_db
from backend.app.dependencies import get_current_active_user, get_current_user_id, require_roles, oauth2_scheme
from backend.app.core.security import verify_password, get_password_hash
from backend.app.models import (
    User, Ticket, Task, ProjectMember, Project, UserInvitation,
    ProjectActivity, Organization, RCARecord
)
from backend.app.schemas import (
    UserRead, UserUpdateProfile, UserChangePassword, UserInviteRequest, UserUpdateRole,
    OperationalVelocity, ActiveOperationalQueue, QueueItem, OrganizationSummary
)

logger = logging.getLogger("tronix.users")

router = APIRouter()

AVATARS_DIR = os.path.abspath(os.path.join(settings.UPLOAD_DIR, "avatars"))
os.makedirs(AVATARS_DIR, exist_ok=True)


def validate_image_signature(content: bytes) -> str:
    """
    Validates file signature strictly by magic bytes.
    Returns format ('jpeg', 'png', 'webp').
    Rejects SVG and any disguised or unsupported formats.
    """
    if len(content) < 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image file: file too small or empty."
        )

    # Reject SVG: check magic bytes/content for <svg or <?xml
    head_1024 = content[:1024].lower()
    if b"<svg" in head_1024 or b"<?xml" in head_1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="SVG format is not permitted. Only JPG, PNG, and WebP images are allowed."
        )

    # JPEG: FF D8 FF
    if content.startswith(b"\xff\xd8\xff"):
        return "jpeg"

    # PNG: 89 50 4E 47 0D 0A 1A 0A
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"

    # WebP: RIFF....WEBP
    if content.startswith(b"RIFF") and content[8:12] == b"WEBP":
        return "webp"

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Unsupported or disguised image format. Only JPG, PNG, and WebP images are allowed."
    )


def delete_user_avatar_file(user_id: str) -> None:
    """Delete any avatar files on disk belonging to user_id."""
    if not os.path.isdir(AVATARS_DIR):
        return
    prefix = f"avatar_{user_id}_"
    try:
        for fname in os.listdir(AVATARS_DIR):
            if fname.startswith(prefix):
                fpath = os.path.join(AVATARS_DIR, fname)
                try:
                    os.remove(fpath)
                except Exception as e:
                    logger.warning("Failed to delete old avatar file %s: %s", fpath, e)
    except Exception as e:
        logger.warning("Error scanning avatar directory for user %s: %s", user_id, e)


def generate_avatar_signed_url(user_id: str) -> str:
    sig = hmac.new(settings.SECRET_KEY.encode(), f"avatar:{user_id}".encode(), hashlib.sha256).hexdigest()[:16]
    timestamp = int(datetime.now(timezone.utc).timestamp())
    return f"{settings.API_V1_PREFIX}/users/{user_id}/avatar?sig={sig}&v={timestamp}"


def verify_avatar_signature(user_id: str, sig: str) -> bool:
    expected_sig = hmac.new(settings.SECRET_KEY.encode(), f"avatar:{user_id}".encode(), hashlib.sha256).hexdigest()[:16]
    return hmac.compare_digest(sig, expected_sig)


async def build_user_profile_response(user: User, db: AsyncSession) -> UserRead:
    """Build complete user profile response with real scoped operational velocity and queue items."""
    now = datetime.now(timezone.utc)
    quarter = (now.month - 1) // 3 + 1
    quarter_label = f"Q{quarter} {now.year}"
    quarter_start = datetime(now.year, 3 * quarter - 2, 1, tzinfo=timezone.utc)

    # 1. Organization info
    org_summary = None
    if user.organization_id:
        org_res = await db.execute(select(Organization).where(Organization.id == user.organization_id))
        org = org_res.scalars().first()
        if org:
            org_summary = OrganizationSummary(
                id=org.id,
                name=org.name,
                plan=getattr(org, "plan", None) or "Standard"
            )

    # 2. Operational Velocity (assigned or resolved by user in current quarter)
    tk_res = await db.execute(
        select(Ticket)
        .join(Project, Ticket.project_id == Project.id)
        .where(
            Ticket.assignee_id == user.id,
            Project.organization_id == user.organization_id
        )
    )
    user_tickets = tk_res.scalars().all()

    # Resolved in current quarter
    resolved_in_q = [
        t for t in user_tickets
        if (t.status or "").lower() in ("resolved", "closed")
        and t.updated_at
        and (t.updated_at if t.updated_at.tzinfo else t.updated_at.replace(tzinfo=timezone.utc)) >= quarter_start
    ]

    # SLA adherence in current quarter
    tickets_with_deadline_in_q = [t for t in resolved_in_q if t.deadline]
    if tickets_with_deadline_in_q:
        met_count = 0
        for t in tickets_with_deadline_in_q:
            t_updated = t.updated_at if t.updated_at.tzinfo else t.updated_at.replace(tzinfo=timezone.utc)
            t_deadline = t.deadline if t.deadline.tzinfo else t.deadline.replace(tzinfo=timezone.utc)
            if t_updated <= t_deadline:
                met_count += 1
        sla_adherence = round((met_count / len(tickets_with_deadline_in_q)) * 100, 1)
    else:
        sla_adherence = None

    # MTTR in current quarter
    if resolved_in_q:
        total_seconds = 0
        valid_res_count = 0
        for t in resolved_in_q:
            t_created = t.created_at if t.created_at.tzinfo else t.created_at.replace(tzinfo=timezone.utc)
            t_updated = t.updated_at if t.updated_at.tzinfo else t.updated_at.replace(tzinfo=timezone.utc)
            dur = (t_updated - t_created).total_seconds()
            if dur >= 0:
                total_seconds += dur
                valid_res_count += 1
        if valid_res_count > 0:
            avg_minutes = int((total_seconds / valid_res_count) / 60)
            hrs = avg_minutes // 60
            mins = avg_minutes % 60
            mttr_formatted = f"{hrs}h {mins}m"
        else:
            mttr_formatted = None
            avg_minutes = None
    else:
        mttr_formatted = None
        avg_minutes = None

    # Incidents resolved (P1/P2)
    incidents_resolved_count = sum(
        1 for t in resolved_in_q
        if (t.severity or "").lower() in ("blocker", "critical")
    )

    op_velocity = OperationalVelocity(
        quarter_label=quarter_label,
        sla_adherence=sla_adherence,
        sla_adherence_trend=None,  # Never show fake trend without real previous period
        mttr_minutes=avg_minutes,
        mttr_formatted=mttr_formatted,
        mttr_trend=None,
        mttr_target="< 2h 00m",
        incidents_resolved_count=incidents_resolved_count,
        incidents_label="P1 / P2"
    )

    # 3. Active Operational Queue
    open_tickets = [t for t in user_tickets if (t.status or "").lower() not in ("resolved", "closed")]
    high_priority_tickets = [t for t in open_tickets if (t.severity or "").lower() in ("blocker", "critical")]

    # Tasks assigned to user
    task_res = await db.execute(
        select(Task).where(
            Task.assignee_id == user.id,
            Task.organization_id == user.organization_id
        )
    )
    user_tasks = task_res.scalars().all()
    open_tasks = [t for t in user_tasks if (t.status or "").lower() not in ("done", "cancelled")]

    # RCAs authored by user or in review
    rca_res = await db.execute(
        select(RCARecord).where(
            RCARecord.author_id == user.id,
            RCARecord.organization_id == user.organization_id
        )
    )
    user_rcas = rca_res.scalars().all()
    active_rcas = [r for r in user_rcas if (r.status or "").lower() in ("draft", "under_review")]

    # Top items across queue
    top_items: List[QueueItem] = []
    for t in open_tickets[:3]:
        top_items.append(QueueItem(
            id=t.id,
            item_number=t.ticket_number,
            title=t.title,
            item_type="ticket",
            severity=(t.severity or "major").upper(),
            status=(t.status or "open").replace("_", " ").title(),
            url=f"/workspace/tickets/{t.id}"
        ))
    for r in active_rcas[:2]:
        top_items.append(QueueItem(
            id=r.id,
            item_number=f"RCA-{r.id[:4].upper()}",
            title=r.title,
            item_type="rca",
            severity=(r.severity or "critical").upper(),
            status=(r.status or "under_review").replace("_", " ").title(),
            url="/workspace/rca"
        ))
    for tk in open_tasks[:2]:
        if len(top_items) >= 5:
            break
        top_items.append(QueueItem(
            id=tk.id,
            item_number=tk.task_number,
            title=tk.title,
            item_type="task",
            severity=(tk.priority or "medium").upper(),
            status=(tk.status or "todo").replace("_", " ").title(),
            url="/workspace/tasks"
        ))

    total_queue_items = len(open_tickets) + len(active_rcas) + len(open_tasks)
    active_queue = ActiveOperationalQueue(
        total_assigned=total_queue_items,
        open_tickets_count=len(open_tickets),
        high_priority_tickets_count=len(high_priority_tickets),
        rcas_count=len(active_rcas),
        tasks_count=len(open_tasks),
        top_items=top_items
    )

    return UserRead(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        display_name=user.display_name,
        is_active=user.is_active,
        role=user.role,
        title=user.title,
        avatar_url=user.avatar_url,
        department=user.department,
        phone=user.phone,
        slack_handle=user.slack_handle,
        email_verified=user.email_verified,
        onboarding_completed=user.onboarding_completed,
        timezone=user.timezone,
        last_active_at=user.last_active_at,
        on_call_role=user.on_call_role,
        organization_id=user.organization_id,
        created_at=user.created_at,
        operational_velocity=op_velocity,
        active_queue=active_queue,
        organization_summary=org_summary
    )


@router.get("/me", response_model=UserRead)
async def get_my_profile(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve profile of currently authenticated user with real operational velocity and active queue metrics."""
    return await build_user_profile_response(current_user, db)


@router.patch("/me", response_model=UserRead)
async def update_my_profile(
    payload: UserUpdateProfile,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Update profile details of currently authenticated user."""
    return await _process_user_profile_update(current_user, payload, db)


@router.patch("/{user_id}", response_model=UserRead)
async def update_user_by_id(
    user_id: str,
    payload: UserUpdateProfile,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update profile details for specified user ID.
    Enforces authorization: another user's id cannot be edited.
    """
    if user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to update another user's profile."
        )
    return await _process_user_profile_update(current_user, payload, db)


async def _process_user_profile_update(
    current_user: User,
    payload: UserUpdateProfile,
    db: AsyncSession
) -> UserRead:
    if payload.full_name is not None:
        clean_name = payload.full_name.strip()
        if clean_name:
            current_user.full_name = clean_name
    if payload.display_name is not None:
        current_user.display_name = payload.display_name.strip() or None
    if payload.title is not None:
        current_user.title = payload.title.strip() or None
    if payload.department is not None:
        current_user.department = payload.department.strip() or None
    if payload.phone is not None:
        current_user.phone = payload.phone.strip() or None
    if payload.slack_handle is not None:
        current_user.slack_handle = payload.slack_handle.strip().lstrip("@") or None
    if payload.avatar_url is not None:
        clean_avatar = payload.avatar_url.strip()
        if not clean_avatar:
            delete_user_avatar_file(current_user.id)
            current_user.avatar_url = None
        else:
            current_user.avatar_url = clean_avatar
    if payload.timezone is not None:
        current_user.timezone = payload.timezone.strip() or None
    if payload.on_call_role is not None:
        current_user.on_call_role = payload.on_call_role.strip() or None

    await db.commit()
    await db.refresh(current_user)
    return await build_user_profile_response(current_user, db)


@router.post("/me/avatar", response_model=UserRead)
async def upload_my_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload and re-encode avatar for currently authenticated user."""
    return await _process_avatar_upload(current_user, file, db)


@router.post("/{user_id}/avatar", response_model=UserRead)
async def upload_user_avatar_by_id(
    user_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload and re-encode avatar for specified user ID.
    Enforces authorization: another user's id cannot be edited.
    """
    if user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to update another user's avatar."
        )
    return await _process_avatar_upload(current_user, file, db)


async def _process_avatar_upload(current_user: User, file: UploadFile, db: AsyncSession) -> UserRead:
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds maximum allowed 5MB limit."
        )

    # Validate file signature by magic bytes (rejects SVG and disguised files)
    img_fmt = validate_image_signature(content)

    # Verify and process with Pillow
    try:
        from PIL import Image, ImageOps
        image = Image.open(io.BytesIO(content))
        image.verify()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Corrupted or invalid image data."
        )

    # Re-open after verify
    image = Image.open(io.BytesIO(content))
    try:
        image = ImageOps.exif_transpose(image)
    except Exception:
        pass

    # Bound size to 512x512
    image.thumbnail((512, 512), Image.Resampling.LANCZOS)

    out_buffer = io.BytesIO()
    ext = "jpg" if img_fmt == "jpeg" else ("png" if img_fmt == "png" else "webp")
    save_fmt = "JPEG" if img_fmt == "jpeg" else ("PNG" if img_fmt == "png" else "WEBP")

    if save_fmt == "JPEG":
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")
        image.save(out_buffer, format="JPEG", quality=85, optimize=True)
    elif save_fmt == "PNG":
        image.save(out_buffer, format="PNG", optimize=True)
    elif save_fmt == "WEBP":
        image.save(out_buffer, format="WEBP", quality=85)

    reencoded = out_buffer.getvalue()

    # Delete previous avatar file
    delete_user_avatar_file(current_user.id)

    # Save to disk with random filename
    random_hex = uuid.uuid4().hex
    filename = f"avatar_{current_user.id}_{random_hex}.{ext}"
    dest_path = os.path.abspath(os.path.join(AVATARS_DIR, filename))
    if not dest_path.startswith(AVATARS_DIR):
        raise HTTPException(status_code=400, detail="Invalid destination path.")

    with open(dest_path, "wb") as f_out:
        f_out.write(reencoded)

    current_user.avatar_url = generate_avatar_signed_url(current_user.id)
    await db.commit()
    await db.refresh(current_user)

    return await build_user_profile_response(current_user, db)


@router.delete("/me/avatar", response_model=UserRead)
async def delete_my_avatar(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove user avatar and reset to initials."""
    delete_user_avatar_file(current_user.id)
    current_user.avatar_url = None
    await db.commit()
    await db.refresh(current_user)
    return await build_user_profile_response(current_user, db)


@router.delete("/{user_id}/avatar", response_model=UserRead)
async def delete_user_avatar_by_id(
    user_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Remove avatar for specified user ID.
    Enforces authorization: another user's id cannot be edited.
    """
    if user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to delete another user's avatar."
        )
    delete_user_avatar_file(current_user.id)
    current_user.avatar_url = None
    await db.commit()
    await db.refresh(current_user)
    return await build_user_profile_response(current_user, db)


@router.get("/{user_id}/avatar")
async def get_user_avatar_file(
    user_id: str,
    sig: Optional[str] = None,
    token: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    bearer_token: Optional[str] = Depends(oauth2_scheme)
):
    """
    Serve user avatar through an authenticated or signed URL with Content-Type set and X-Content-Type-Options: nosniff.
    """
    authorized = False
    if sig and verify_avatar_signature(user_id, sig):
        authorized = True
    elif bearer_token or token:
        chk_token = bearer_token or token
        try:
            payload = jwt.decode(chk_token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
            if payload.get("sub"):
                authorized = True
        except Exception:
            authorized = False

    if not authorized:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication or valid signature required to access avatar",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Locate avatar file
    prefix = f"avatar_{user_id}_"
    found_file = None
    if os.path.isdir(AVATARS_DIR):
        for fname in os.listdir(AVATARS_DIR):
            if fname.startswith(prefix):
                found_file = os.path.join(AVATARS_DIR, fname)
                break

    if not found_file or not os.path.isfile(found_file):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Avatar image not found")

    ext = os.path.splitext(found_file)[1].lower()
    media_type = "image/jpeg" if ext in (".jpg", ".jpeg") else ("image/png" if ext == ".png" else "image/webp")

    return FileResponse(
        found_file,
        media_type=media_type,
        headers={
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, max-age=3600"
        }
    )


@router.post("/change-password")
async def change_password(
    payload: UserChangePassword,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Change authenticated user password."""
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password verification failed",
        )

    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters",
        )

    current_user.hashed_password = get_password_hash(payload.new_password)
    await db.commit()
    return {"success": True, "message": "Password credentials updated successfully"}


@router.post("/invite")
async def invite_member(
    payload: UserInviteRequest,
    current_user: User = Depends(require_roles(["owner", "admin"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Invite a new team member to the workspace.
    Protected by RBAC: only owner and admin can invite members.
    Generates single-use cryptographically secure invitation token and sets tenant organization.
    """
    email_clean = str(payload.email).lower().strip()
    u_res = await db.execute(
        select(User).where(User.email == email_clean, User.organization_id == current_user.organization_id)
    )
    existing_user = u_res.scalars().first()

    now = datetime.now(timezone.utc)
    invitation_token = secrets.token_urlsafe(32)
    expires_at = now + timedelta(days=7)

    # Record secure invitation in database
    invitation = UserInvitation(
        email=email_clean,
        organization_id=current_user.organization_id,
        role=payload.role.lower(),
        token=invitation_token,
        invited_by_id=current_user.id,
        status="pending",
        expires_at=expires_at,
        created_at=now,
    )
    db.add(invitation)

    if not existing_user:
        # Pre-provision inactive member account linked to current organization
        derived_name = email_clean.split("@")[0].replace(".", " ").title()
        temp_random_secret = secrets.token_urlsafe(24)
        new_user = User(
            email=email_clean,
            hashed_password=get_password_hash(temp_random_secret),
            full_name=derived_name,
            role=payload.role.lower(),
            department="Engineering",
            is_active=True,
            email_verified=False,
            organization_id=current_user.organization_id,
            created_at=now,
        )
        db.add(new_user)
        await db.flush()
        target_user = new_user
    else:
        target_user = existing_user

    if payload.project_id:
        # Verify project belongs to current organization
        p_res = await db.execute(
            select(Project).where(
                Project.id == payload.project_id,
                Project.organization_id == current_user.organization_id
            )
        )
        proj = p_res.scalars().first()
        if proj:
            m_res = await db.execute(
                select(ProjectMember).where(
                    ProjectMember.project_id == payload.project_id,
                    ProjectMember.user_id == target_user.id
                )
            )
            existing_m = m_res.scalars().first()
            if not existing_m:
                new_m = ProjectMember(
                    project_id=payload.project_id,
                    user_id=target_user.id,
                    role=payload.role.lower(),
                    access_scope="Full Repository Access",
                )
                db.add(new_m)

    await db.commit()

    return {
        "success": True,
        "message": f"Invitation successfully dispatched to {email_clean}",
        "invitation_token": invitation_token,
        "expires_at": expires_at.isoformat(),
        "user": {
            "id": target_user.id,
            "email": target_user.email,
            "full_name": target_user.full_name,
            "role": target_user.role,
        }
    }


@router.get("", response_model=List[UserRead])
@router.get("/", response_model=List[UserRead], include_in_schema=False)
async def list_team_members(
    department: Optional[str] = Query(None, description="Filter by department / team"),
    team: Optional[str] = Query(None, description="Alias for department filter"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """List team members strictly within the authenticated user's organization."""
    if not current_user.organization_id:
        return [current_user]

    query = select(User).where(User.organization_id == current_user.organization_id)
    eff_dept = department or team
    if eff_dept and eff_dept.lower().strip() != "all":
        query = query.where(User.department.ilike(f"%{eff_dept.strip()}%"))
    query = query.order_by(User.full_name)

    res = await db.execute(query)
    return res.scalars().all()


class TeamSummaryResponse(BaseModel):
    total_members: int
    active_count: int
    inactive_count: int
    pending_invitations_count: int
    department_counts: Dict[str, int]
    role_counts: Dict[str, int]
    average_workload: Optional[float] = None
    workload_status: Optional[str] = None


class UserInvitationItem(BaseModel):
    id: str
    email: str
    role: str
    status: str
    created_at: datetime
    expires_at: datetime


@router.get("/summary", response_model=TeamSummaryResponse)
async def get_team_members_summary(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Calculated workforce summary scoped to user's organization."""
    if not current_user.organization_id:
        return TeamSummaryResponse(
            total_members=1,
            active_count=1,
            inactive_count=0,
            pending_invitations_count=0,
            department_counts={current_user.department or "General": 1},
            role_counts={current_user.role or "member": 1},
            average_workload=None,
            workload_status=None,
        )

    # All users in org
    res = await db.execute(
        select(User).where(User.organization_id == current_user.organization_id)
    )
    users = res.scalars().all()

    total = len(users)
    active = sum(1 for u in users if u.is_active)
    inactive = total - active

    # Pending invitations
    inv_res = await db.execute(
        select(UserInvitation).where(
            UserInvitation.organization_id == current_user.organization_id,
            UserInvitation.status == "pending"
        )
    )
    invitations = inv_res.scalars().all()
    pending_invs = len(invitations)

    # Department breakdown
    dept_counts: Dict[str, int] = {}
    for u in users:
        dept = u.department or "Engineering"
        dept_counts[dept] = dept_counts.get(dept, 0) + 1

    # Role breakdown
    role_counts: Dict[str, int] = {}
    for u in users:
        r = u.role or "member"
        role_counts[r] = role_counts.get(r, 0) + 1

    # Real workload calculation across members from assigned active tickets and tasks
    # Active tickets per user
    tk_res = await db.execute(
        select(Ticket.assignee_id)
        .join(Project, Ticket.project_id == Project.id)
        .where(
            Project.organization_id == current_user.organization_id,
            Ticket.status.notin_(["closed", "resolved"]),
            Ticket.assignee_id.isnot(None)
        )
    )
    active_tk_assignees = tk_res.scalars().all()

    task_res = await db.execute(
        select(Task.assignee_id).where(
            Task.organization_id == current_user.organization_id,
            Task.status.notin_(["done", "cancelled"]),
            Task.assignee_id.isnot(None)
        )
    )
    active_task_assignees = task_res.scalars().all()

    total_active_items = len(active_tk_assignees) + len(active_task_assignees)
    if total > 0 and total_active_items > 0:
        avg_items_per_user = total_active_items / total
        avg_workload = min(100.0, max(15.0, round(avg_items_per_user * 18.0, 1)))
        status_label = "Optimal" if avg_workload < 80 else "High"
    else:
        avg_workload = None
        status_label = None

    return TeamSummaryResponse(
        total_members=total,
        active_count=active,
        inactive_count=inactive,
        pending_invitations_count=pending_invs,
        department_counts=dept_counts,
        role_counts=role_counts,
        average_workload=avg_workload,
        workload_status=status_label,
    )


@router.get("/invitations", response_model=List[UserInvitationItem])
async def list_pending_invitations(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """List pending invitations for the caller's organization."""
    if not current_user.organization_id:
        return []

    res = await db.execute(
        select(UserInvitation).where(
            UserInvitation.organization_id == current_user.organization_id,
            UserInvitation.status == "pending"
        ).order_by(UserInvitation.created_at.desc())
    )
    invs = res.scalars().all()
    return [
        UserInvitationItem(
            id=i.id,
            email=i.email,
            role=i.role,
            status=i.status,
            created_at=i.created_at,
            expires_at=i.expires_at,
        )
        for i in invs
    ]


DEFAULT_WORKLOAD_THRESHOLD = 80


def compute_member_workload(open_tickets_count: int, open_tasks_count: int, blockers_count: int = 0) -> Optional[int]:
    """
    Computes real member workload capacity percentage based on assigned active tickets and tasks:
    - 0 active items: 0% capacity allocated.
    - Each open task: 10 points.
    - Each open ticket: 15 points.
    - Each critical/blocker ticket: +10 points (incident severity penalty).
    Bounded between 5% and 100% when active items exist. Threshold for overloaded state is 80%.
    """
    total_items = open_tickets_count + open_tasks_count
    if total_items == 0:
        return 0
    raw_points = (open_tasks_count * 10) + (open_tickets_count * 15) + (blockers_count * 10)
    return min(100, max(5, raw_points))


def compute_ticket_sla_state(deadline: Optional[datetime], status: str, now: datetime) -> Dict[str, Any]:
    """
    Computes real-time SLA breach / time-remaining status from ticket deadline.
    Returns status ('breached', 'breaching_soon', 'healthy', or None) and human-readable label.
    """
    if not deadline or (status or "").lower() in ("closed", "resolved"):
        return {"status": None, "label": None, "remaining_minutes": None}

    d = deadline if deadline.tzinfo else deadline.replace(tzinfo=timezone.utc)
    n = now if now.tzinfo else now.replace(tzinfo=timezone.utc)

    diff_seconds = (d - n).total_seconds()
    diff_minutes = int(diff_seconds / 60)

    if diff_seconds < 0:
        return {
            "status": "breached",
            "label": "SLA Breached",
            "remaining_minutes": diff_minutes,
        }
    elif diff_seconds <= 2 * 3600:  # within 2 hours
        if diff_minutes < 60:
            time_str = f"{diff_minutes}m"
        else:
            time_str = f"{diff_minutes // 60}h {diff_minutes % 60}m"
        return {
            "status": "breaching_soon",
            "label": f"SLA Breaching in {time_str}",
            "remaining_minutes": diff_minutes,
        }
    else:
        return {
            "status": "healthy",
            "label": "SLA Healthy",
            "remaining_minutes": diff_minutes,
        }


@router.get("/{user_id}")
async def get_user_member_detail(
    user_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Retrieve full user profile with live workload and aggregations, strictly scoped to caller's organization."""
    u_res = await db.execute(
        select(User).where(
            User.id == user_id,
            User.organization_id == current_user.organization_id
        )
    )
    user = u_res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found in this organization")

    # Fetch assigned tickets scoped to current user's organization
    tk_res = await db.execute(
        select(Ticket)
        .join(Project, Ticket.project_id == Project.id)
        .where(
            Ticket.assignee_id == user_id,
            Project.organization_id == current_user.organization_id
        )
        .order_by(Ticket.updated_at.desc())
    )
    all_tickets = tk_res.scalars().all()

    # Fetch assigned tasks scoped to current user's organization
    ts_res = await db.execute(
        select(Task)
        .where(
            Task.assignee_id == user_id,
            Task.organization_id == current_user.organization_id
        )
        .order_by(Task.created_at.desc())
    )
    all_tasks = ts_res.scalars().all()

    # Fetch project memberships
    pm_res = await db.execute(
        select(ProjectMember)
        .join(Project, ProjectMember.project_id == Project.id)
        .options(selectinload(ProjectMember.project))
        .where(
            ProjectMember.user_id == user_id,
            Project.organization_id == current_user.organization_id
        )
    )
    memberships = pm_res.scalars().all()
    projects = [
        {
            "id": m.project.id,
            "name": m.project.name,
            "key": m.project.key,
            "role": m.role,
            "status": m.project.status,
        }
        for m in memberships if m.project
    ]

    now = datetime.now(timezone.utc)

    # Filter tickets
    open_tickets = [t for t in all_tickets if (t.status or "").lower() not in ("closed", "resolved")]
    blockers = [t for t in open_tickets if (t.severity or "").lower() in ("blocker", "critical")]

    # Tasks breakdown
    open_tasks = [t for t in all_tasks if (t.status or "").lower() not in ("done", "cancelled")]
    due_soon_cutoff = now + timedelta(days=2)
    due_soon_count = 0
    overdue_count = 0
    task_counts_by_status: Dict[str, int] = {}

    for t in open_tasks:
        s = (t.status or "todo").lower()
        task_counts_by_status[s] = task_counts_by_status.get(s, 0) + 1
        if t.due_date:
            due_dt = t.due_date if t.due_date.tzinfo else t.due_date.replace(tzinfo=timezone.utc)
            if due_dt < now:
                overdue_count += 1
            elif due_dt <= due_soon_cutoff:
                due_soon_count += 1

    workload_val = compute_member_workload(len(open_tickets), len(open_tasks), len(blockers))

    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "display_name": user.display_name,
        "phone": user.phone,
        "slack_handle": user.slack_handle,
        "role": user.role,
        "title": user.title,  # Real value or None, no demo fallbacks
        "department": user.department,  # Real value or None
        "avatar_url": user.avatar_url,
        "is_active": user.is_active,
        "timezone": user.timezone,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "joined_date": user.created_at.isoformat() if user.created_at else None,
        "last_active": user.last_active_at.isoformat() if user.last_active_at else None,
        "last_active_at": user.last_active_at.isoformat() if user.last_active_at else None,
        "on_call_role": user.on_call_role,
        "workload_percentage": workload_val,
        "workload": {
            "percentage": workload_val,
            "threshold": DEFAULT_WORKLOAD_THRESHOLD,
            "is_overloaded": (workload_val > DEFAULT_WORKLOAD_THRESHOLD) if workload_val is not None else False,
            "active_incidents": len(blockers),
        },
        "projects": projects,
        "active_tickets_count": len(open_tickets),
        "blockers_count": len(blockers),
        "tasks_count": len(open_tasks),
        "tasks_summary": {
            "total_open": len(open_tasks),
            "counts_by_status": task_counts_by_status,
            "due_soon": due_soon_count,
            "overdue": overdue_count,
        },
        "tickets": [
            {
                "id": t.id,
                "ticket_number": t.ticket_number,
                "title": t.title,
                "status": t.status,
                "severity": t.severity,
                "deadline": t.deadline.isoformat() if t.deadline else None,
                "updated_at": t.updated_at.isoformat() if t.updated_at else None,
                "sla_state": compute_ticket_sla_state(t.deadline, t.status, now),
            }
            for t in open_tickets[:10]
        ],
        "tasks": [
            {
                "id": tk.id,
                "task_number": tk.task_number,
                "title": tk.title,
                "status": tk.status,
                "priority": tk.priority,
                "due_date": tk.due_date.isoformat() if tk.due_date else None,
                "created_at": tk.created_at.isoformat() if tk.created_at else None,
            }
            for tk in open_tasks[:10]
        ],
    }


@router.patch("/{user_id}/role")
async def update_member_role(
    user_id: str,
    payload: UserUpdateRole,
    current_user: User = Depends(require_roles(["owner", "admin"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a team member's role with strict RBAC rules:
    - Caller must be 'owner' or 'admin'.
    - Self-escalation is blocked (admin cannot promote themselves to owner, nor change their own role to owner).
    - Only an 'owner' can assign the 'owner' role.
    - Demoting the last active owner of the organization is strictly forbidden.
    - An audit activity log entry is written.
    """
    new_role = (payload.role or "").strip().lower()
    valid_roles = {"owner", "admin", "manager", "lead", "developer", "member", "viewer", "employee"}
    if new_role not in valid_roles:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role '{payload.role}'. Must be one of: {', '.join(sorted(valid_roles))}"
        )

    # Fetch target user in same organization
    u_res = await db.execute(
        select(User).where(
            User.id == user_id,
            User.organization_id == current_user.organization_id
        )
    )
    target_user = u_res.scalars().first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found in this organization")

    caller_role = (current_user.role or "").lower()

    # Disallow non-owners from promoting anyone to owner
    if new_role == "owner" and caller_role != "owner":
        raise HTTPException(status_code=403, detail="Only workspace owners can promote members to owner")

    # Disallow self-escalation / self role changes by admin
    if current_user.id == target_user.id and caller_role != "owner":
        raise HTTPException(status_code=403, detail="Self-escalation of roles is forbidden")

    old_role = (target_user.role or "").lower()

    # Prevent demoting the last owner
    if old_role == "owner" and new_role != "owner":
        owner_count_res = await db.execute(
            select(func.count(User.id)).where(
                User.organization_id == current_user.organization_id,
                User.role == "owner",
                User.is_active.is_(True)
            )
        )
        owner_count = owner_count_res.scalar() or 0
        if owner_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot demote the last organization owner")

    target_user.role = new_role

    # Audit logging
    logger.info(
        "AUDIT: Member role changed. Target user: %s, Old role: %s, New role: %s, Actor: %s (%s)",
        target_user.id, old_role, new_role, current_user.id, current_user.email
    )

    # If there is a project in the organization, record ProjectActivity
    p_res = await db.execute(
        select(Project.id).where(Project.organization_id == current_user.organization_id).limit(1)
    )
    proj_id = p_res.scalars().first()
    if proj_id:
        act = ProjectActivity(
            project_id=proj_id,
            actor_id=current_user.id,
            action="role_change",
            category="members",
            target_type="member",
            target_id=target_user.id,
            target_title=target_user.full_name,
            details=f"Role changed from '{old_role}' to '{new_role}' by {current_user.full_name}",
        )
        db.add(act)

    await db.commit()
    await db.refresh(target_user)

    return {
        "success": True,
        "message": f"Updated role to {new_role}",
        "user": {
            "id": target_user.id,
            "full_name": target_user.full_name,
            "email": target_user.email,
            "role": target_user.role,
        }
    }
