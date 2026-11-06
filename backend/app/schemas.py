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


class UserCreate(BaseSchema):
    email: EmailStr
    password: str
    full_name: str


class UserRead(UserBase):
    id: str
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


# --- Project Schemas ---
class ProjectBase(BaseSchema):
    name: str
    description: Optional[str] = None
    status: str = "active"


class ProjectRead(ProjectBase):
    id: str
    organization_id: str
    created_at: datetime


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
