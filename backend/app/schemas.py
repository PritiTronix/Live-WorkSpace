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
    role: str = "member"
    title: Optional[str] = None
    avatar_url: Optional[str] = None
    department: Optional[str] = None


class UserCreate(BaseSchema):
    email: EmailStr
    password: str
    full_name: str
    title: Optional[str] = None
    avatar_url: Optional[str] = None
    department: Optional[str] = None


class UserAdminCreate(UserCreate):
    role: str = "member"
    organization_id: Optional[str] = None


class UserRead(UserBase):
    id: str
    organization_id: Optional[str] = None
    created_at: datetime


class UserUpdateProfile(BaseSchema):
    full_name: Optional[str] = None
    title: Optional[str] = None
    department: Optional[str] = None
    avatar_url: Optional[str] = None


class UserChangePassword(BaseSchema):
    current_password: str
    new_password: str


class UserInviteRequest(BaseSchema):
    email: EmailStr
    role: str = "employee"
    project_id: Optional[str] = None
    note: Optional[str] = None


class ReactionRequest(BaseSchema):
    emoji: str


class Token(BaseSchema):
    access_token: str
    token_type: str = "bearer"


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


# --- Batch 05: Reports & Analytics Schemas (Screen 01) ---

class AnalyticsKPIMetrics(BaseSchema):
    total_tickets: int = 0
    total_tickets_delta_pct: Optional[float] = None
    resolved_tickets: int = 0
    completion_rate: float = 0.0
    open_backlog: int = 0
    high_priority_backlog: int = 0
    sla_adherence_pct: Optional[float] = None
    sla_target_pct: Optional[float] = None
    avg_response_time: Optional[str] = None
    avg_response_delta: Optional[str] = None
    avg_mttr: Optional[str] = None
    avg_mttr_delta: Optional[str] = None


class VelocityTrendItem(BaseSchema):
    period_label: str
    created_count: int = 0
    resolved_count: Optional[int] = None
    target_sla: Optional[int] = None


class VelocityTrendResponse(BaseSchema):
    items: List[VelocityTrendItem] = Field(default_factory=list)
    baseline_threshold: Optional[int] = None
    net_velocity_ratio: Optional[float] = None
    sprint_velocity_pct: Optional[float] = None


class SeverityDistributionItem(BaseSchema):
    key: str
    label: str
    count: int = 0
    percentage: float = 0.0


class StatusDistributionItem(BaseSchema):
    key: str
    label: str
    count: int = 0
    percentage: float = 0.0


class SquadSLAComplianceItem(BaseSchema):
    squad_name: str
    adherence_rate: Optional[float] = None
    status: str = "unavailable"
    diff_pct: Optional[float] = None


class EmployeeWorkloadItem(BaseSchema):
    user_id: str
    name: str
    role: str
    avatar_url: Optional[str] = None
    squad: str
    resolved_count: int = 0
    mean_mttr: Optional[str] = None
    sla_adherence: Optional[float] = None
    active_tickets: int = 0
    active_capacity: Optional[int] = None
    capacity_status: Optional[str] = None


class AnalyticsDashboardResponse(BaseSchema):
    window_label: str = "Last 30 Days"
    kpis: AnalyticsKPIMetrics
    velocity_trend: VelocityTrendResponse
    severity_distribution: List[SeverityDistributionItem] = Field(default_factory=list)
    status_distribution: List[StatusDistributionItem] = Field(default_factory=list)
    squad_sla: List[SquadSLAComplianceItem] = Field(default_factory=list)
    employees: List[EmployeeWorkloadItem] = Field(default_factory=list)
    total_employees: int = 0


class AnalyticsExportRequest(BaseSchema):
    format: str = "csv"  # Only csv is currently supported
    time_horizon: Optional[str] = "30d"
    project_id: Optional[str] = "all"
    severity: Optional[str] = "all"
    include_sla_audit: bool = True
    include_rca_breakdown: bool = True
    include_workload_charts: bool = True


# --- Batch 05: System Activity & Audit Log Schemas (Screens 02 & 03) ---

class AuditLogKPIMetrics(BaseSchema):
    event_volume_24h: int = 0
    event_volume_delta_pct: Optional[float] = None
    escalations_count: int = 0
    signoffs_count: int = 0
    automated_ingests_count: Optional[int] = None
    automated_ingests_pct: Optional[float] = None
    ledger_hash: Optional[str] = None


class AuditLogItemRead(BaseSchema):
    id: str
    log_ref: str
    created_at: datetime
    ticket_id: Optional[str] = None
    ticket_number: Optional[str] = None
    ticket_title: Optional[str] = None
    ticket_severity: Optional[str] = None
    ticket_status: Optional[str] = None
    actor: Optional[UserRead] = None
    event_type: str
    event_label: str
    description: str
    previous_value: Optional[str] = None
    new_value: Optional[str] = None
    immutable_hash: str  # Computed record fingerprint


class AuditLogsListResponse(BaseSchema):
    items: List[AuditLogItemRead] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 25
    total_pages: int = 1
    kpis: AuditLogKPIMetrics


class AuditLogDetailRead(AuditLogItemRead):
    originating_interface: str = "Not recorded"
    auth_host: str = "Not recorded"
    context_justification: Optional[str] = None
    target_entity_details: Optional[dict] = None


class AuditLogExportRequest(BaseSchema):
    format: str = "csv"  # csv, json
    time_horizon: Optional[str] = "7d"
    event_domains: Optional[List[str]] = Field(default_factory=list)
    severity: Optional[str] = "all"

