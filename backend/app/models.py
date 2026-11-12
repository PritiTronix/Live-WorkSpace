import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Text, Boolean, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship, synonym
from backend.app.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    users: Mapped[list["User"]] = relationship(back_populates="organization", cascade="all, delete-orphan")
    projects: Mapped[list["Project"]] = relationship(back_populates="organization", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="member")  # owner, admin, manager, member
    title: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # Lead Architect, Project Manager, etc.
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    verification_token_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    verification_token_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    reset_token_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    reset_token_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    refresh_token_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    organization_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    organization: Mapped[Optional["Organization"]] = relationship(back_populates="users")
    project_memberships: Mapped[list["ProjectMember"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    led_projects: Mapped[list["Project"]] = relationship("Project", back_populates="lead", foreign_keys="[Project.lead_id]")


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    key: Mapped[str] = mapped_column(String(20), default="PROJ", index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="active")  # active, planning, on_hold, completed, archived
    icon: Mapped[str] = mapped_column(String(50), default="rocket_launch")
    color: Mapped[str] = mapped_column(String(50), default="bg-btn-primary")
    visibility: Mapped[str] = mapped_column(String(50), default="organization")  # organization, restricted
    sla_tier: Mapped[str] = mapped_column(String(100), default="Standard SaaS Tier 1")
    lead_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    start_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    target_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    organization: Mapped["Organization"] = relationship(back_populates="projects")
    lead: Mapped[Optional["User"]] = relationship("User", back_populates="led_projects", foreign_keys=[lead_id])
    members: Mapped[list["ProjectMember"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    invitations: Mapped[list["ProjectInvitation"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    tickets: Mapped[list["Ticket"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    tasks: Mapped[list["Task"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class ProjectMember(Base):
    __tablename__ = "project_members"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="developer")  # owner, lead, maintainer, developer, qa, viewer, admin
    access_scope: Mapped[str] = mapped_column(String(100), default="Full Repository Write Access")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    project: Mapped["Project"] = relationship(back_populates="members")
    user: Mapped["User"] = relationship(back_populates="project_memberships")


class ProjectInvitation(Base):
    __tablename__ = "project_invitations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="viewer")
    invited_by_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="pending")  # pending, accepted, revoked
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    project: Mapped["Project"] = relationship(back_populates="invitations")
    invited_by: Mapped[Optional["User"]] = relationship("User")


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    ticket_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    severity: Mapped[str] = mapped_column(String(50), default="major")  # blocker, critical, major, minor
    status: Mapped[str] = mapped_column(String(50), default="open")     # open, wip, on_hold, resolved, closed
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False)
    assignee_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    reporter_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    deadline: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    first_response_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    steps_to_reproduce: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    diagnostic_trace: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rca_trigger: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rca_mitigation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rca_action_items: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    project: Mapped["Project"] = relationship(back_populates="tickets")
    assignee: Mapped[Optional["User"]] = relationship("User", foreign_keys=[assignee_id])
    reporter: Mapped[Optional["User"]] = relationship("User", foreign_keys=[reporter_id])
    comments: Mapped[list["TicketComment"]] = relationship(back_populates="ticket", cascade="all, delete-orphan")
    attachments: Mapped[list["TicketAttachment"]] = relationship(back_populates="ticket", cascade="all, delete-orphan")
    activities: Mapped[list["TicketActivity"]] = relationship(back_populates="ticket", cascade="all, delete-orphan")


class TicketComment(Base):
    __tablename__ = "ticket_comments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    ticket_id: Mapped[str] = mapped_column(String(36), ForeignKey("tickets.id"), nullable=False)
    author_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    ticket: Mapped["Ticket"] = relationship(back_populates="comments")
    author: Mapped["User"] = relationship("User")


class TicketAttachment(Base):
    __tablename__ = "ticket_attachments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    ticket_id: Mapped[str] = mapped_column(String(36), ForeignKey("tickets.id"), nullable=False)
    uploader_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(100), default="log")
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    file_url: Mapped[str] = mapped_column(String(500), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    ticket: Mapped["Ticket"] = relationship(back_populates="attachments")
    uploader: Mapped["User"] = relationship("User")


class TicketActivity(Base):
    __tablename__ = "ticket_activities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    ticket_id: Mapped[str] = mapped_column(String(36), ForeignKey("tickets.id"), nullable=False)
    actor_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    old_value: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    new_value: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    ticket: Mapped["Ticket"] = relationship(back_populates="activities")
    actor: Mapped["User"] = relationship("User")


class Discussion(Base):
    __tablename__ = "discussions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False)
    author_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="general")  # announcement, rfc, question, general
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    reactions: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default="{}")  # JSON string of reactions: {"👍": 4, "🚀": 3}
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=utc_now)

    project: Mapped["Project"] = relationship("Project")
    author: Mapped["User"] = relationship("User")
    comments: Mapped[list["DiscussionComment"]] = relationship(back_populates="discussion", cascade="all, delete-orphan")


class DiscussionComment(Base):
    __tablename__ = "discussion_comments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    discussion_id: Mapped[str] = mapped_column(String(36), ForeignKey("discussions.id"), nullable=False)
    author_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    discussion: Mapped["Discussion"] = relationship(back_populates="comments")
    author: Mapped["User"] = relationship("User")


class ProjectFile(Base):
    __tablename__ = "project_files"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False)
    uploader_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), default="document")  # document, design, schema, media, archive
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    file_url: Mapped[str] = mapped_column(String(500), default="")
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    linked_task_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    project: Mapped["Project"] = relationship("Project")
    uploader: Mapped["User"] = relationship("User")


class ProjectActivity(Base):
    __tablename__ = "project_activities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False)
    actor_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    action: Mapped[str] = mapped_column(String(100), nullable=False)  # status_change, task_created, pr_merged, milestone_updated, etc.
    category: Mapped[str] = mapped_column(String(50), default="tasks")  # tasks, tickets, members, files, discussions
    target_type: Mapped[str] = mapped_column(String(50), default="task")  # task, ticket, file, member
    target_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    target_title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON or descriptive text
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    project: Mapped["Project"] = relationship("Project")
    actor: Mapped["User"] = relationship("User")


# ---------------------------------------------------------------------------
# Task models — Batch 3
# ---------------------------------------------------------------------------

class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    task_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False, default="TASK-101")
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # status: todo | in_progress | in_review | done | cancelled
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="todo")
    # priority: low | medium | high | urgent
    priority: Mapped[str] = mapped_column(String(50), nullable=False, default="medium")
    # type: feature | bug | chore | spike | epic
    task_type: Mapped[str] = mapped_column(String(50), nullable=False, default="feature")
    story_points: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    project_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("projects.id"), nullable=True)
    assignee_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    reporter_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False, default="org_01")

    # Synonym for backwards-compatibility with assigned_to_id
    assigned_to_id = synonym("assignee_id")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    project: Mapped[Optional["Project"]] = relationship(back_populates="tasks")
    assignee: Mapped[Optional["User"]] = relationship("User", foreign_keys=[assignee_id])
    reporter: Mapped[Optional["User"]] = relationship("User", foreign_keys=[reporter_id])
    comments: Mapped[list["TaskComment"]] = relationship(back_populates="task", cascade="all, delete-orphan")
    attachments: Mapped[list["TaskAttachment"]] = relationship(back_populates="task", cascade="all, delete-orphan")


class TaskComment(Base):
    __tablename__ = "task_comments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    task_id: Mapped[str] = mapped_column(String(36), ForeignKey("tasks.id"), nullable=False)
    author_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=utc_now)

    task: Mapped["Task"] = relationship(back_populates="comments")
    author: Mapped["User"] = relationship("User")


class TaskAttachment(Base):
    __tablename__ = "task_attachments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False, default="application/octet-stream")
    storage_key: Mapped[str] = mapped_column(String(512), nullable=False)   # S3 key / path
    task_id: Mapped[str] = mapped_column(String(36), ForeignKey("tasks.id"), nullable=False)
    uploader_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    task: Mapped["Task"] = relationship(back_populates="attachments")
    uploader: Mapped["User"] = relationship("User")


# ---------------------------------------------------------------------------
# SLA Management Models (Batch 5)
# ---------------------------------------------------------------------------

class SLAPolicy(Base):
    __tablename__ = "sla_policies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tier: Mapped[str] = mapped_column(String(100), default="standard")  # tier_1, tier_2, tier_3, standard
    business_hours_only: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=utc_now)

    rules: Mapped[list["SLARule"]] = relationship(back_populates="policy", cascade="all, delete-orphan")


class SLARule(Base):
    __tablename__ = "sla_rules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    policy_id: Mapped[str] = mapped_column(String(36), ForeignKey("sla_policies.id", ondelete="CASCADE"), nullable=False)
    priority: Mapped[str] = mapped_column(String(50), nullable=False)  # blocker, critical, major, minor
    response_time_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    resolution_time_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=240)
    escalation_tier: Mapped[str] = mapped_column(String(50), default="tier_1")  # tier_1, tier_2, executive
    organization_id: Mapped[str] = mapped_column(String(36), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    policy: Mapped["SLAPolicy"] = relationship(back_populates="rules")


class SLATimer(Base):
    __tablename__ = "sla_timers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    ticket_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    policy_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("sla_policies.id"), nullable=True)
    rule_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("sla_rules.id"), nullable=True)
    timer_type: Mapped[str] = mapped_column(String(50), default="first_response")  # first_response, resolution
    status: Mapped[str] = mapped_column(String(50), default="on_track")  # on_track, at_risk, breached, paused, met
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    target_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    breached_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    fulfilled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    paused_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    elapsed_seconds: Mapped[int] = mapped_column(Integer, default=0)
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    escalations: Mapped[list["SLAEscalation"]] = relationship(back_populates="timer", cascade="all, delete-orphan")


class SLAEscalation(Base):
    __tablename__ = "sla_escalations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    timer_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("sla_timers.id", ondelete="CASCADE"), nullable=True)
    ticket_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    escalation_tier: Mapped[str] = mapped_column(String(50), default="tier_1")  # tier_1, tier_2, executive
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)
    acknowledged_by_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    timer: Mapped[Optional["SLATimer"]] = relationship(back_populates="escalations")
    acknowledged_by: Mapped[Optional["User"]] = relationship("User")


# ---------------------------------------------------------------------------
# RCA (Root Cause Analysis) Models (Batch 5)
# ---------------------------------------------------------------------------

class RCA(Base):
    __tablename__ = "rcas"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    rca_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    incident_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    severity: Mapped[str] = mapped_column(String(50), default="major")  # blocker, critical, major
    service_affected: Mapped[str] = mapped_column(String(100), nullable=False)
    outage_duration_minutes: Mapped[int] = mapped_column(Integer, default=0)
    customer_impact: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    five_whys: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON-encoded array of whys
    timeline_events: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON-encoded array of chronological events
    status: Mapped[str] = mapped_column(String(50), default="draft")  # draft, under_review, approved, published
    version: Mapped[int] = mapped_column(Integer, default=1)
    ticket_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    lead_investigator_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=utc_now)

    lead_investigator: Mapped[Optional["User"]] = relationship("User")
    action_items: Mapped[list["RCAActionItem"]] = relationship(back_populates="rca", cascade="all, delete-orphan")
    versions: Mapped[list["RCAVersion"]] = relationship(back_populates="rca", cascade="all, delete-orphan")


class RCAVersion(Base):
    __tablename__ = "rca_versions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    rca_id: Mapped[str] = mapped_column(String(36), ForeignKey("rcas.id", ondelete="CASCADE"), nullable=False)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    snapshot_data: Mapped[str] = mapped_column(Text, nullable=False)  # JSON representation of complete RCA snapshot
    changelog: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    author_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    rca: Mapped["RCA"] = relationship(back_populates="versions")
    author: Mapped[Optional["User"]] = relationship("User")


class RCAActionItem(Base):
    __tablename__ = "rca_action_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    rca_id: Mapped[str] = mapped_column(String(36), ForeignKey("rcas.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    assignee_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    priority: Mapped[str] = mapped_column(String(50), default="medium")  # high, medium, low
    status: Mapped[str] = mapped_column(String(50), default="todo")  # todo, in_progress, done
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=utc_now)

    rca: Mapped["RCA"] = relationship(back_populates="action_items")
    assignee: Mapped[Optional["User"]] = relationship("User")
