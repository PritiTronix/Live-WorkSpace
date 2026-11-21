import html
import re
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import (
    BaseModel, EmailStr, ConfigDict, Field,
    field_validator, model_validator, ValidationInfo, field_serializer
)
from backend.app.core.security import validate_password_strength
from backend.app.utils.address_builder import build_public_url


class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --- User & Auth Schemas ---
class UserBase(BaseSchema):
    email: EmailStr
    full_name: str
    display_name: Optional[str] = None
    is_active: bool = True
    role: str = "member"
    title: Optional[str] = None
    avatar_url: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    slack_handle: Optional[str] = None
    email_verified: bool = False
    onboarding_completed: bool = False
    timezone: Optional[str] = None
    last_active_at: Optional[datetime] = None
    on_call_role: Optional[str] = None
    presence: Optional[str] = "offline"
    account_state: Optional[str] = "active"
    is_available: Optional[bool] = True
    department_key: Optional[str] = None
    user_set_status: Optional[str] = None
    active_tasks_count: Optional[int] = 0
    active_tickets_count: Optional[int] = 0
    active_items_count: Optional[int] = 0

    @field_validator("avatar_url", mode="before")
    @classmethod
    def sanitize_avatar(cls, v: Optional[str]) -> Optional[str]:
        if v and isinstance(v, str):
            if "dicebear.com" in v.lower():
                return None
            return build_public_url(v)
        return v


class UserUpdateRole(BaseSchema):
    role: str


class UserCreate(BaseSchema):
    email: EmailStr
    password: str
    full_name: str
    display_name: Optional[str] = None
    organization_name: Optional[str] = None
    title: Optional[str] = None
    avatar_url: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    slack_handle: Optional[str] = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        validate_password_strength(v)
        return v


class UserAdminCreate(UserCreate):
    role: str = "member"
    organization_id: Optional[str] = None


class OperationalVelocity(BaseSchema):
    quarter_label: str
    sla_adherence: Optional[float] = None
    sla_adherence_trend: Optional[str] = None
    mttr_minutes: Optional[int] = None
    mttr_formatted: Optional[str] = None
    mttr_trend: Optional[str] = None
    mttr_target: str = "< 2h 00m"
    incidents_resolved_count: int = 0
    incidents_label: str = "P1 / P2"


class QueueItem(BaseSchema):
    id: str
    item_number: str
    title: str
    item_type: str
    severity: str
    status: str
    url: str


class ActiveOperationalQueue(BaseSchema):
    total_assigned: int = 0
    open_tickets_count: int = 0
    high_priority_tickets_count: int = 0
    rcas_count: int = 0
    tasks_count: int = 0
    top_items: List[QueueItem] = []


class OrganizationSummary(BaseSchema):
    id: str
    name: str
    plan: Optional[str] = None
    industry: Optional[str] = None
    industry_other: Optional[str] = None

    @field_serializer("industry_other", when_used="json-unless-none")
    def serialize_industry_other(self, v: Optional[str]) -> Optional[str]:
        if v:
            return html.escape(v)
        return v


class UserMembershipRead(BaseSchema):
    id: str
    name: str = ""
    role: str = "member"
    plan: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def handle_orm_membership(cls, data: Any) -> Any:
        if hasattr(data, "__table__") and getattr(data, "__tablename__", None) == "memberships":
            org = getattr(data, "__dict__", {}).get("organization") or getattr(data, "organization", None)
            return {
                "id": getattr(data, "organization_id", getattr(data, "id", "")),
                "name": getattr(org, "name", "") if org else "",
                "role": getattr(data, "role", "member"),
                "plan": getattr(org, "plan", None) if org else None,
            }
        return data


class UserRead(UserBase):
    id: str
    organization_id: Optional[str] = None
    organization_required: bool = False
    memberships: List[UserMembershipRead] = []
    created_at: datetime
    operational_velocity: Optional[OperationalVelocity] = None
    active_queue: Optional[ActiveOperationalQueue] = None
    organization_summary: Optional[OrganizationSummary] = Field(default=None, serialization_alias="organization")

    @model_validator(mode="before")
    @classmethod
    def handle_orm_user(cls, data: Any) -> Any:
        if hasattr(data, "__table__") and getattr(data, "__tablename__", None) == "users":
            raw_dict = {}
            for col in data.__table__.columns.keys():
                raw_dict[col] = getattr(data, col, None)
            raw_dict["organization_required"] = getattr(data, "organization_required", False)
            raw_dict["operational_velocity"] = getattr(data, "operational_velocity", None)
            raw_dict["active_queue"] = getattr(data, "active_queue", None)
            raw_dict["organization_summary"] = getattr(data, "organization_summary", None)
            mems = getattr(data, "__dict__", {}).get("memberships")
            if isinstance(mems, list):
                converted = []
                for m in mems:
                    if hasattr(m, "__table__") and getattr(m, "__tablename__", None) == "memberships":
                        org = getattr(m, "__dict__", {}).get("organization") or getattr(m, "organization", None)
                        converted.append(
                            UserMembershipRead(
                                id=getattr(m, "organization_id", getattr(m, "id", "")),
                                name=getattr(org, "name", "") if org else "",
                                role=getattr(m, "role", "member"),
                                plan=getattr(org, "plan", None) if org else None,
                            )
                        )
                    else:
                        converted.append(m)
                raw_dict["memberships"] = converted
            else:
                raw_dict["memberships"] = []
            return raw_dict
        elif isinstance(data, dict):
            if "memberships" not in data or data["memberships"] is None:
                data["memberships"] = []
        return data


class UserUpdateProfile(BaseSchema):
    full_name: Optional[str] = None
    display_name: Optional[str] = None
    title: Optional[str] = None
    department: Optional[str] = None
    avatar_url: Optional[str] = None
    timezone: Optional[str] = None
    on_call_role: Optional[str] = None
    phone: Optional[str] = None
    slack_handle: Optional[str] = None

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v_clean = v.strip()
            if not v_clean:
                raise ValueError("Full legal name cannot be empty")
            return v_clean
        return None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v_clean = v.strip()
        if not v_clean:
            return None
        # E.164 phone format validation
        if not re.match(r"^\+[1-9]\d{1,14}$", v_clean):
            raise ValueError("Phone number must be in valid E.164 format (e.g. +14155552671)")
        return v_clean

    @field_validator("display_name", "title", "department", "avatar_url", "timezone", "on_call_role", "slack_handle")
    @classmethod
    def empty_str_to_none(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v_clean = v.strip()
        return v_clean if v_clean else None


class UserChangePassword(BaseSchema):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        validate_password_strength(v)
        return v


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
    refresh_token: Optional[str] = None


class TokenRefreshRequest(BaseSchema):
    refresh_token: str


class OnboardingCompleteResponse(BaseSchema):
    success: bool = True
    message: str = "Onboarding marked as completed"
    onboarding_completed: bool = True
    user: UserRead


# --- Organization Schemas ---
class OrganizationBase(BaseSchema):
    name: str
    slug: Optional[str] = None
    plan: Optional[str] = None
    industry: Optional[str] = None
    industry_other: Optional[str] = None
    size_range: Optional[str] = None
    logo_path: Optional[str] = None

    @field_validator("logo_path", mode="before")
    @classmethod
    def sanitize_logo_path(cls, v: Optional[str]) -> Optional[str]:
        return build_public_url(v)

    @field_serializer("industry_other", when_used="json-unless-none")
    def serialize_industry_other(self, v: Optional[str]) -> Optional[str]:
        if v:
            return html.escape(v)
        return v


class OrganizationCreateRequest(BaseSchema):
    name: str = Field(..., min_length=2, max_length=100)
    industry: Optional[str] = Field(None, max_length=100)
    industry_other: Optional[str] = Field(None, validate_default=True, max_length=60)
    size_range: Optional[str] = Field(None, max_length=50)
    logo_path: Optional[str] = Field(None, max_length=500)
    plan: Optional[str] = None

    @field_validator("industry_other", mode="after")
    @classmethod
    def validate_industry_other(cls, v: Optional[str], info: ValidationInfo) -> Optional[str]:
        industry_val = (info.data.get("industry") or "").strip().lower()
        if industry_val != "other":
            return None

        if not v or not v.strip():
            raise ValueError("Specify your industry is required when 'Other' is selected.")

        # Reject control characters
        for ch in v:
            code = ord(ch)
            if code < 32 or (127 <= code <= 159):
                raise ValueError("Control characters are not allowed.")

        # Reject leading or trailing spaces
        if v.startswith(" ") or v.endswith(" "):
            raise ValueError("Industry cannot have leading or trailing spaces.")

        # Normalize internal whitespace
        normalized = re.sub(r"[ \t]+", " ", v)

        # Allowed characters: letters, numbers, spaces and basic punctuation (&, -, /, ', .) only
        # No emoji or control characters
        if not re.match(r"^[A-Za-z0-9 &/'\.\-]+$", normalized):
            raise ValueError("Industry can only contain letters, numbers, spaces, and basic punctuation (&, -, /, ', .).")

        if len(normalized) < 2 or len(normalized) > 60:
            raise ValueError("Industry must be between 2 and 60 characters.")

        return normalized


class OrganizationRead(OrganizationBase):
    id: str
    slug: str
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class JoinCodeLookupRequest(BaseSchema):
    code: str = Field(..., min_length=1, max_length=100)


class JoinCodeLookupResponse(BaseSchema):
    name: str
    logo_path: Optional[str] = None

    @field_validator("logo_path", mode="before")
    @classmethod
    def sanitize_logo_path(cls, v: Optional[str]) -> Optional[str]:
        return build_public_url(v)


class JoinRequestCreate(BaseSchema):
    code: str = Field(..., min_length=1, max_length=100)
    message: Optional[str] = Field(None, max_length=500)


class JoinRequestUser(BaseSchema):
    id: str
    full_name: str
    email: EmailStr
    avatar_url: Optional[str] = None

    @field_validator("avatar_url", mode="before")
    @classmethod
    def sanitize_avatar(cls, v: Optional[str]) -> Optional[str]:
        if v and isinstance(v, str):
            if "dicebear.com" in v.lower():
                return None
            return build_public_url(v)
        return v


class JoinRequestRead(BaseSchema):
    id: str
    user_id: str
    organization_id: str
    status: str
    message: Optional[str] = None
    created_at: datetime
    decided_by: Optional[str] = None
    decided_at: Optional[datetime] = None
    decision_reason: Optional[str] = None
    organization_name: Optional[str] = None
    organization_logo: Optional[str] = None
    requester_name: Optional[str] = None
    requester_email: Optional[str] = None
    user: Optional[JoinRequestUser] = None

    @field_validator("organization_logo", mode="before")
    @classmethod
    def sanitize_org_logo(cls, v: Optional[str]) -> Optional[str]:
        return build_public_url(v)


class JoinRequestDecision(BaseSchema):
    decision_reason: Optional[str] = Field(None, max_length=500)


class JoinCodeCreate(BaseSchema):
    expires_in_days: Optional[int] = Field(None, ge=1, le=365)
    max_uses: Optional[int] = Field(None, ge=1, le=10000)


class JoinCodeRead(BaseSchema):
    code: str
    expires_at: Optional[datetime] = None
    max_uses: Optional[int] = None
    created_at: datetime


class JoinRequestPaginatedResponse(BaseSchema):
    items: List[JoinRequestRead]
    total: int
    page: int
    page_size: int


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
    total_discussions: int = 0
    total_files: int = 0
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
    sla_tier: Optional[str] = None
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
    sla_tier: Optional[str] = None
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
    project_id: Optional[str] = None
    assigned_to_id: Optional[str] = None
    assignee_id: Optional[str] = None
    reporter_id: Optional[str] = None
    assigner_id: Optional[str] = None


class TaskUpdate(BaseSchema):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to_id: Optional[str] = None
    assignee_id: Optional[str] = None
    reporter_id: Optional[str] = None
    assigner_id: Optional[str] = None


class TaskRead(TaskBase):
    id: str
    task_number: str
    project_id: Optional[str] = None
    assigned_to_id: Optional[str] = None
    assignee_id: Optional[str] = None
    reporter_id: Optional[str] = None
    assigner_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    assignee: Optional[UserRead] = None
    reporter: Optional[UserRead] = None
    assigner: Optional[UserRead] = None


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

    @field_validator("file_url", mode="before")
    @classmethod
    def sanitize_file_url(cls, v: Optional[str]) -> str:
        return build_public_url(v) or ""


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
    is_breached: bool = False
    breached_at: Optional[datetime] = None
    overrun_duration: Optional[str] = None
    overrun_seconds: Optional[int] = None


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

    @field_validator("file_url", mode="before")
    @classmethod
    def sanitize_file_url(cls, v: Optional[str]) -> str:
        return build_public_url(v) or ""


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
    burndown: Optional[dict] = None
    milestones: List[dict] = []
    team_workload: List[dict] = []
    urgent_tickets: List[TicketRead] = []
    recent_activity: List[ProjectActivityRead] = []


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

    @field_validator("avatar_url", mode="before")
    @classmethod
    def sanitize_avatar(cls, v: Optional[str]) -> Optional[str]:
        if v and isinstance(v, str):
            if "dicebear.com" in v.lower():
                return None
            return build_public_url(v)
        return v


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


# --- Support Request Schemas ---
class SupportRequestCreate(BaseSchema):
    subject: str = Field(..., min_length=1, max_length=200, description="Summary of the support issue or problem")
    category: str = Field(..., min_length=1, max_length=50, description="Support category or domain")
    message: str = Field(..., min_length=1, max_length=5000, description="Detailed problem description or steps to reproduce")

    @field_validator("subject", "category", "message")
    @classmethod
    def strip_and_validate_non_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Field cannot be empty or contain only whitespace")
        return stripped


class SupportRequestResponse(BaseSchema):
    id: str
    user_id: str
    organization_id: str
    subject: str
    category: str
    message: str
    status: str
    created_at: datetime


