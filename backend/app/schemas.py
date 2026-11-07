from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, ConfigDict


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
class TicketBase(BaseSchema):
    title: str
    description: Optional[str] = None
    severity: str  # blocker, critical, major, minor
    status: str    # open, wip, on-hold, resolved, closed


class TicketRead(TicketBase):
    id: str
    project_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None


# --- SLA Schemas ---
class SLABase(BaseSchema):
    name: str
    response_time_minutes: int
    resolution_time_minutes: int


class SLARead(SLABase):
    id: str
    created_at: datetime
