import json
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database import get_db
from backend.app.dependencies import get_current_user_id
from backend.app.models import Discussion, DiscussionComment, Project, ProjectActivity
from backend.app.schemas import (
    DiscussionCreate,
    DiscussionRead,
    DiscussionCommentCreate,
    DiscussionCommentRead,
    ReactionRequest,
)

router = APIRouter()


@router.get("/", response_model=List[DiscussionRead])
async def list_discussions(
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    category: Optional[str] = Query(None, description="Filter by category (announcement, rfc, question, general)"),
    search: Optional[str] = Query(None, description="Search in title or content"),
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """List discussions with authors and comments."""
    query = (
        select(Discussion)
        .options(
            selectinload(Discussion.author),
            selectinload(Discussion.comments).selectinload(DiscussionComment.author),
        )
    )

    if project_id:
        query = query.where(Discussion.project_id == project_id)
    if category and category.lower() != "all":
        query = query.where(Discussion.category == category.lower())
    if search:
        query = query.where(
            Discussion.title.ilike(f"%{search.strip()}%") | Discussion.content.ilike(f"%{search.strip()}%")
        )

    query = query.order_by(desc(Discussion.is_pinned), desc(Discussion.created_at))
    res = await db.execute(query)
    return res.scalars().all()


@router.get("/{discussion_id}", response_model=DiscussionRead)
async def get_discussion(
    discussion_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve a single discussion thread with comments and authors."""
    res = await db.execute(
        select(Discussion)
        .options(
            selectinload(Discussion.author),
            selectinload(Discussion.comments).selectinload(DiscussionComment.author),
        )
        .where(Discussion.id == discussion_id)
    )
    disc = res.scalars().first()
    if not disc:
        raise HTTPException(status_code=404, detail="Discussion not found")
    return disc


@router.post("/", response_model=DiscussionRead, status_code=status.HTTP_201_CREATED)
async def create_discussion(
    disc_in: DiscussionCreate,
    project_id: Optional[str] = Query(None, description="Project ID"),
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Create a new discussion topic or announcement in project."""
    target_project_id = project_id
    if not target_project_id:
        p_res = await db.execute(select(Project).order_by(Project.created_at))
        proj = p_res.scalars().first()
        if not proj:
            raise HTTPException(status_code=400, detail="No workspace project available")
        target_project_id = proj.id
    else:
        p_res = await db.execute(select(Project).where(Project.id == target_project_id))
        if not p_res.scalars().first():
            raise HTTPException(status_code=404, detail="Project not found")

    now = datetime.now(timezone.utc)
    new_disc = Discussion(
        project_id=target_project_id,
        author_id=current_user_id,
        title=disc_in.title.strip(),
        content=disc_in.content.strip(),
        category=(disc_in.category or "general").lower(),
        is_pinned=bool(disc_in.is_pinned),
        reactions=disc_in.reactions or "{}",
        created_at=now,
        updated_at=now,
    )
    db.add(new_disc)
    await db.flush()

    activity = ProjectActivity(
        project_id=target_project_id,
        actor_id=current_user_id,
        action="discussion_created",
        category="discussions",
        target_type="discussion",
        target_id=new_disc.id,
        target_title=new_disc.title,
        details=f"Category: {new_disc.category}",
        created_at=now,
    )
    db.add(activity)
    await db.commit()

    res = await db.execute(
        select(Discussion)
        .options(
            selectinload(Discussion.author),
            selectinload(Discussion.comments).selectinload(DiscussionComment.author),
        )
        .where(Discussion.id == new_disc.id)
    )
    return res.scalars().first()


@router.post("/{discussion_id}/reactions")
async def toggle_discussion_reaction(
    discussion_id: str,
    payload: ReactionRequest,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Toggle an emoji reaction on a discussion."""
    res = await db.execute(select(Discussion).where(Discussion.id == discussion_id))
    disc = res.scalars().first()
    if not disc:
        raise HTTPException(status_code=404, detail="Discussion not found")

    emoji = payload.emoji.strip()
    try:
        reactions_dict = json.loads(disc.reactions or "{}")
    except Exception:
        reactions_dict = {}

    current_val = reactions_dict.get(emoji, 0)
    reactions_dict[emoji] = current_val + 1

    disc.reactions = json.dumps(reactions_dict)
    await db.commit()
    return {"reactions": reactions_dict}


@router.post("/{discussion_id}/comments", response_model=DiscussionCommentRead, status_code=status.HTTP_201_CREATED)
async def add_comment_to_discussion(
    discussion_id: str,
    comment_in: DiscussionCommentCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Reply or comment on a discussion thread."""
    d_res = await db.execute(select(Discussion).where(Discussion.id == discussion_id))
    disc = d_res.scalars().first()
    if not disc:
        raise HTTPException(status_code=404, detail="Discussion not found")

    now = datetime.now(timezone.utc)
    new_comment = DiscussionComment(
        discussion_id=discussion_id,
        author_id=current_user_id,
        content=comment_in.content.strip(),
        created_at=now,
    )
    db.add(new_comment)
    disc.updated_at = now

    activity = ProjectActivity(
        project_id=disc.project_id,
        actor_id=current_user_id,
        action="discussion_comment_added",
        category="discussions",
        target_type="discussion",
        target_id=disc.id,
        target_title=disc.title,
        details="Added reply",
        created_at=now,
    )
    db.add(activity)
    await db.commit()

    res = await db.execute(
        select(DiscussionComment)
        .options(selectinload(DiscussionComment.author))
        .where(DiscussionComment.id == new_comment.id)
    )
    return res.scalars().first()

