from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, ConfigDict, Field


class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --- User & Auth Schemas ---
class UserBase(BaseSchema):
    email: EmailStr
    full_name: str
    is_active: bool = True
    email_verified: bool = False
    onboarding_completed: bool = False
    role: str = "member"
    title: Optional[str] = None
    avatar_url: Optional[str] = None
    department: Optional[str] = None


class UserCreate(BaseSchema):
    email: EmailStr
    password: str
    full_name: str
    organization_name: Optional[str] = None
    role: Optional[str] = "member"
    title: Optional[str] = None
    avatar_url: Optional[str] = None
    department: Optional[str] = None


class UserRead(UserBase):
    id: str
    organization_id: Optional[str] = None
    created_at: datetime


class Token(BaseSchema):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"


class AuthResponse(BaseSchema):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserRead


class RefreshTokenRequest(BaseSchema):
    refresh_token: str


class VerifyEmailRequest(BaseSchema):
    token: str
    email: Optional[EmailStr] = None


class ResendVerificationRequest(BaseSchema):
    email: EmailStr


class ForgotPasswordRequest(BaseSchema):
    email: EmailStr


class ResetPasswordRequest(BaseSchema):
    token: str
    new_password: str
    email: Optional[EmailStr] = None


class MessageResponse(BaseSchema):
    message: str
    status: str = "success"


# --- Organization Schemas ---
class OrganizationBase(BaseSchema):
    name: str
    slug: str


class OrganizationRead(OrganizationBase):
    id: str
    created_at: datetime


# --- Project Member & Invitation Schemas ---
class ProjectMemberBase(BaseSchema):
    role: str = "developer"
    access_scope: str = "Full Repository Write Access"


class ProjectMemberCreate(BaseSchema):
    user_id: Optional[str] = None
    email: Optional[EmailStr] = None
    role: str = "developer"
    access_scope: Optional[str] = "Full Repository Write Access"


class ProjectMemberUpdate(BaseSchema):
    role: Optional[str] = None
    access_scope: Optional[str] = None


class ProjectMemberRead(ProjectMemberBase):
    id: str
    project_id: str
    user_id: str
    created_at: datetime
    user: Optional[UserRead] = None


class ProjectInvitationBase(BaseSchema):
    email: EmailStr
    role: str = "viewer"


class ProjectInvitationCreate(ProjectInvitationBase):
    pass


class ProjectInvitationRead(ProjectInvitationBase):
    id: str
    project_id: str
    status: str = "pending"
    created_at: datetime
    invited_by: Optional[UserRead] = None


# --- Project Schemas ---
class ProjectMetrics(BaseSchema):
    total_tasks: int = 0
    completed_tasks: int = 0
    open_tickets: int = 0
    blocker_tickets: int = 0
    critical_tickets: int = 0
    sprint_progress: int = 0
    attention_severity: Optional[str] = None
    attention_text: Optional[str] = None


class ProjectBase(BaseSchema):
    name: str
    key: str = "PROJ"
    description: Optional[str] = None
    status: str = "active"
    icon: str = "rocket_launch"
    color: str = "bg-btn-primary"
    visibility: str = "organization"
    sla_tier: str = "Standard SaaS Tier 1"
    lead_id: Optional[str] = None
    start_date: Optional[datetime] = None
    target_date: Optional[datetime] = None
    is_archived: bool = False


class ProjectCreate(BaseSchema):
    name: str
    key: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = "active"
    icon: Optional[str] = "rocket_launch"
    color: Optional[str] = "bg-btn-primary"
    visibility: Optional[str] = "organization"
    sla_tier: Optional[str] = "Standard SaaS Tier 1"
    lead_id: Optional[str] = None
    start_date: Optional[datetime] = None
    target_date: Optional[datetime] = None
    contributor_ids: Optional[List[str]] = None


class ProjectUpdate(BaseSchema):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    visibility: Optional[str] = None
    sla_tier: Optional[str] = None
    lead_id: Optional[str] = None
    start_date: Optional[datetime] = None
    target_date: Optional[datetime] = None
    is_archived: Optional[bool] = None
    contributor_ids: Optional[List[str]] = None


class ProjectRead(ProjectBase):
    id: str
    organization_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    lead: Optional[UserRead] = None
    members: List[ProjectMemberRead] = []
    invitations: List[ProjectInvitationRead] = []
    metrics: Optional[ProjectMetrics] = None


# --- Ticket & Task Schemas ---
class TaskBase(BaseSchema):
    title: str
    description: Optional[str] = None
    status: str = "to_do"  # to_do, in_progress, in_review, done
    priority: str = "medium"  # low, medium, high, blocker


class TaskCreate(BaseSchema):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "to_do"
    priority: Optional[str] = "medium"
    project_id: str
    assigned_to_id: Optional[str] = None


class TaskUpdate(BaseSchema):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to_id: Optional[str] = None


class TaskRead(TaskBase):
    id: str
    task_number: str
    project_id: str
    assigned_to_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    assignee: Optional[UserRead] = None


class TicketBase(BaseSchema):
    title: str
    description: Optional[str] = None
    severity: str = "major"  # blocker, critical, major, minor
    status: str = "open"     # open, wip, on_hold, resolved, closed
    deadline: Optional[datetime] = None
    first_response_at: Optional[datetime] = None
    steps_to_reproduce: Optional[str] = None
    diagnostic_trace: Optional[str] = None
    rca_trigger: Optional[str] = None
    rca_mitigation: Optional[str] = None
    rca_action_items: Optional[str] = None


class TicketCreate(BaseSchema):
    title: str
    description: Optional[str] = None
    severity: Optional[str] = "major"
    status: Optional[str] = "open"
    project_id: str
    assignee_id: Optional[str] = None
    reporter_id: Optional[str] = None
    deadline: Optional[datetime] = None
    first_response_at: Optional[datetime] = None
    steps_to_reproduce: Optional[str] = None
    diagnostic_trace: Optional[str] = None
    rca_trigger: Optional[str] = None
    rca_mitigation: Optional[str] = None
    rca_action_items: Optional[str] = None
    initial_comment: Optional[str] = None


class TicketUpdate(BaseSchema):
    title: Optional[str] = None
    description: Optional[str] = None
    project_id: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    assignee_id: Optional[str] = None
    deadline: Optional[datetime] = None
    first_response_at: Optional[datetime] = None
    steps_to_reproduce: Optional[str] = None
    diagnostic_trace: Optional[str] = None
    rca_trigger: Optional[str] = None
    rca_mitigation: Optional[str] = None
    rca_action_items: Optional[str] = None


class TicketStatusChangeRequest(BaseSchema):
    status: str
    reason: Optional[str] = None
    follow_up_date: Optional[str] = None
    remarks: Optional[str] = None


class TicketSeverityChangeRequest(BaseSchema):
    severity: str
    reason: str
    operational_notes: Optional[str] = None


class TicketReassignRequest(BaseSchema):
    assignee_id: str
    reason: Optional[str] = None
    handover_note: Optional[str] = None


class TicketDeadlineChangeRequest(BaseSchema):
    deadline: datetime
    reason: str
    operational_remarks: Optional[str] = None


class TicketReopenRequest(BaseSchema):
    classification: str
    telemetry_notes: Optional[str] = None


class TicketCloseRequest(BaseSchema):
    resolution_summary: str
    commit_sha: Optional[str] = None
    pr_reference: Optional[str] = None
    verified_in_staging: bool = False



class TicketCommentCreate(BaseSchema):
    content: str
    is_internal: bool = False


class TicketCommentRead(BaseSchema):
    id: str
    ticket_id: str
    author_id: str
    content: str
    is_internal: bool = False
    created_at: datetime
    author: Optional[UserRead] = None


class TicketAttachmentCreate(BaseSchema):
    name: str
    size_bytes: int = 0
    file_url: str = ""


class TicketAttachmentRead(BaseSchema):
    id: str
    ticket_id: str
    uploader_id: str
    name: str
    size_bytes: int = 0
    file_url: str = ""
    created_at: datetime
    uploader: Optional[UserRead] = None


class TicketActivityRead(BaseSchema):
    id: str
    ticket_id: str
    actor_id: str
    action: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    created_at: datetime
    actor: Optional[UserRead] = None


class TicketRead(TicketBase):
    id: str
    ticket_number: str
    project_id: str
    assignee_id: Optional[str] = None
    reporter_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    assignee: Optional[UserRead] = None
    reporter: Optional[UserRead] = None
    comments: List[TicketCommentRead] = Field(default_factory=list)
    attachments: List[TicketAttachmentRead] = Field(default_factory=list)
    activities: List[TicketActivityRead] = Field(default_factory=list)


class TicketStats(BaseSchema):
    total: int = 0
    open: int = 0
    wip: int = 0
    on_hold: int = 0
    resolved: int = 0
    closed: int = 0
    sla_breached: int = 0


class CriticalIssuesKPI(BaseSchema):
    blockers_active: int = 0
    critical_incidents: int = 0
    major_issues: int = 0
    sla_breached: int = 0
    sync_interval_sec: int = 5


class CriticalIssuesResponse(BaseSchema):
    kpi: CriticalIssuesKPI
    blockers: List[TicketRead] = Field(default_factory=list)
    critical: List[TicketRead] = Field(default_factory=list)
    major: List[TicketRead] = Field(default_factory=list)




# --- Discussions Schemas ---
class DiscussionCommentBase(BaseSchema):
    content: str


class DiscussionCommentCreate(BaseSchema):
    content: str


class DiscussionCommentRead(DiscussionCommentBase):
    id: str
    discussion_id: str
    author_id: str
    created_at: datetime
    author: Optional[UserRead] = None


class DiscussionBase(BaseSchema):
    title: str
    content: str
    category: str = "general"
    is_pinned: bool = False
    is_resolved: bool = False
    reactions: Optional[str] = "{}"


class DiscussionCreate(BaseSchema):
    title: str
    content: str
    category: Optional[str] = "general"
    is_pinned: Optional[bool] = False
    reactions: Optional[str] = "{}"


class DiscussionRead(DiscussionBase):
    id: str
    project_id: str
    author_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    author: Optional[UserRead] = None
    comments: List[DiscussionCommentRead] = Field(default_factory=list)


# --- Project Files Schemas ---
class ProjectFileBase(BaseSchema):
    name: str
    file_type: str = "document"
    size_bytes: int = 0
    file_url: str = ""
    is_pinned: bool = False
    linked_task_number: Optional[str] = None


class ProjectFileCreate(BaseSchema):
    name: str
    file_type: Optional[str] = "document"
    size_bytes: Optional[int] = 0
    file_url: Optional[str] = ""
    is_pinned: Optional[bool] = False
    linked_task_number: Optional[str] = None


class ProjectFileRead(ProjectFileBase):
    id: str
    project_id: str
    uploader_id: str
    created_at: datetime
    uploader: Optional[UserRead] = None


# --- Project Activity Schemas ---
class ProjectActivityBase(BaseSchema):
    action: str
    category: str = "tasks"
    target_type: str = "task"
    target_id: Optional[str] = None
    target_title: Optional[str] = None
    details: Optional[str] = None


class ProjectActivityCreate(ProjectActivityBase):
    pass


class ProjectActivityRead(ProjectActivityBase):
    id: str
    project_id: str
    actor_id: str
    created_at: datetime
    actor: Optional[UserRead] = None


# --- Project Workspace Summary (Overview Tab) ---
class ProjectOverviewSummary(BaseSchema):
    project: ProjectRead
    burndown: dict
    milestones: List[dict]
    team_workload: List[dict]
    urgent_tickets: List[TicketRead]
    recent_activity: List[ProjectActivityRead]


# --- SLA Schemas ---
class SLABase(BaseSchema):
    name: str
    response_time_minutes: int
    resolution_time_minutes: int


class SLARead(SLABase):
    id: str
    created_at: datetime


# ==============================================================================
# Batch 5: SLA Management Schemas
# ==============================================================================

class SLARuleBase(BaseSchema):
    priority: str = "medium"  # blocker, critical, major, minor
    response_time_minutes: int = 30
    resolution_time_minutes: int = 240
    escalation_tier: str = "tier_1"  # tier_1, tier_2, executive


class SLARuleCreate(SLARuleBase):
    pass


class SLARuleUpdate(BaseSchema):
    priority: Optional[str] = None
    response_time_minutes: Optional[int] = None
    resolution_time_minutes: Optional[int] = None
    escalation_tier: Optional[str] = None


class SLARuleRead(SLARuleBase):
    id: str
    policy_id: str
    organization_id: str
    created_at: datetime


class SLAPolicyBase(BaseSchema):
    name: str
    description: Optional[str] = None
    tier: str = "standard"  # tier_1, tier_2, tier_3, standard
    business_hours_only: bool = False
    is_active: bool = True


class SLAPolicyCreate(SLAPolicyBase):
    rules: Optional[List[SLARuleCreate]] = None


class SLAPolicyUpdate(BaseSchema):
    name: Optional[str] = None
    description: Optional[str] = None
    tier: Optional[str] = None
    business_hours_only: Optional[bool] = None
    is_active: Optional[bool] = None


class SLAPolicyRead(SLAPolicyBase):
    id: str
    organization_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    rules: List[SLARuleRead] = []


class SLATimerRead(BaseSchema):
    id: str
    ticket_id: Optional[str] = None
    ticket_number: Optional[str] = None
    ticket_title: Optional[str] = None
    ticket_severity: Optional[str] = None
    policy_id: Optional[str] = None
    policy_name: Optional[str] = None
    rule_id: Optional[str] = None
    timer_type: str = "first_response"  # first_response, resolution
    status: str = "on_track"  # on_track, at_risk, breached, paused, met
    started_at: datetime
    target_at: datetime
    breached_at: Optional[datetime] = None
    fulfilled_at: Optional[datetime] = None
    paused_at: Optional[datetime] = None
    elapsed_seconds: int = 0
    organization_id: str
    created_at: datetime


class SLAEscalationRead(BaseSchema):
    id: str
    timer_id: Optional[str] = None
    ticket_id: Optional[str] = None
    ticket_number: Optional[str] = None
    ticket_title: Optional[str] = None
    escalation_tier: str = "tier_1"
    reason: str
    acknowledged: bool = False
    acknowledged_by_id: Optional[str] = None
    acknowledged_by_name: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    created_at: datetime


class SLAOverviewMetrics(BaseSchema):
    compliance_rate: float = 100.0
    active_timers: int = 0
    at_risk_count: int = 0
    breached_count: int = 0
    timers: List[SLATimerRead] = []
    escalations: List[SLAEscalationRead] = []


class AcknowledgeBreachRequest(BaseSchema):
    notes: Optional[str] = None


# ==============================================================================
# Batch 5: RCA (Root Cause Analysis) Schemas
# ==============================================================================

class RCAActionItemBase(BaseSchema):
    title: str
    priority: str = "medium"  # high, medium, low
    status: str = "todo"  # todo, in_progress, done
    due_date: Optional[datetime] = None
    assignee_id: Optional[str] = None


class RCAActionItemCreate(RCAActionItemBase):
    pass


class RCAActionItemUpdate(BaseSchema):
    title: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[datetime] = None
    assignee_id: Optional[str] = None


class RCAActionItemRead(RCAActionItemBase):
    id: str
    rca_id: str
    assignee_name: Optional[str] = None
    assignee_avatar: Optional[str] = None
    organization_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None


class RCAVersionRead(BaseSchema):
    id: str
    rca_id: str
    version_number: int
    snapshot_data: str
    changelog: Optional[str] = None
    author_id: Optional[str] = None
    author_name: Optional[str] = None
    created_at: datetime


class RCACreate(BaseSchema):
    title: str
    incident_date: Optional[datetime] = None
    severity: str = "major"  # blocker, critical, major
    service_affected: str
    outage_duration_minutes: int = 0
    customer_impact: Optional[str] = None
    summary: Optional[str] = None
    five_whys: Optional[List[str]] = None
    timeline_events: Optional[List[dict]] = None
    ticket_id: Optional[str] = None
    action_items: Optional[List[RCAActionItemCreate]] = None


class RCAUpdate(BaseSchema):
    title: Optional[str] = None
    incident_date: Optional[datetime] = None
    severity: Optional[str] = None
    service_affected: Optional[str] = None
    outage_duration_minutes: Optional[int] = None
    customer_impact: Optional[str] = None
    summary: Optional[str] = None
    five_whys: Optional[List[str]] = None
    timeline_events: Optional[List[dict]] = None
    ticket_id: Optional[str] = None
    status: Optional[str] = None
    changelog: Optional[str] = None


class RCARead(BaseSchema):
    id: str
    rca_number: str
    title: str
    incident_date: datetime
    severity: str
    service_affected: str
    outage_duration_minutes: int
    customer_impact: Optional[str] = None
    summary: Optional[str] = None
    five_whys: Optional[List[str]] = None
    timeline_events: Optional[List[dict]] = None
    status: str
    version: int
    ticket_id: Optional[str] = None
    ticket_number: Optional[str] = None
    lead_investigator_id: Optional[str] = None
    lead_investigator_name: Optional[str] = None
    organization_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    action_items: List[RCAActionItemRead] = []
    versions: List[RCAVersionRead] = []


class RCAPaginatedResponse(BaseSchema):
    items: List[RCARead]
    total: int
    page: int
    page_size: int
    pages: int
