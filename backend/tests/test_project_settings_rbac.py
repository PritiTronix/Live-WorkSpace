"""
Backend Unit Tests: Project Settings RBAC and Organization Scoping.
Tests the permissions required to edit project settings:
- Only Project Lead, Organization Admin, or Organization Owner are permitted to update project settings.
- Regular organization members who are not the project lead receive 403 Forbidden.
- Cross-organization access is blocked by organization_id scoping.

These tests use in-memory mock sessions and dependency injection; they do NOT run against or touch the shared database.
"""
from datetime import datetime, timezone
import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException, status

from backend.app.models import Project, User, ProjectMember
from backend.app.schemas import ProjectUpdate
from backend.app.routes.projects import update_project


@pytest.fixture
def now_utc():
    return datetime.now(timezone.utc)


@pytest.fixture
def org_id():
    return "org-test-123"


@pytest.fixture
def project_lead_user(org_id, now_utc):
    return User(
        id="user-lead-001",
        email="lead@company.com",
        full_name="Project Lead User",
        organization_id=org_id,
        role="member",
        is_active=True,
        email_verified=True,
        onboarding_completed=True,
        created_at=now_utc,
    )


@pytest.fixture
def org_admin_user(org_id, now_utc):
    return User(
        id="user-admin-002",
        email="admin@company.com",
        full_name="Org Admin User",
        organization_id=org_id,
        role="admin",
        is_active=True,
        email_verified=True,
        onboarding_completed=True,
        created_at=now_utc,
    )


@pytest.fixture
def org_owner_user(org_id, now_utc):
    return User(
        id="user-owner-003",
        email="owner@company.com",
        full_name="Org Owner User",
        organization_id=org_id,
        role="owner",
        is_active=True,
        email_verified=True,
        onboarding_completed=True,
        created_at=now_utc,
    )


@pytest.fixture
def regular_member_user(org_id, now_utc):
    return User(
        id="user-member-004",
        email="member@company.com",
        full_name="Regular Member User",
        organization_id=org_id,
        role="member",
        is_active=True,
        email_verified=True,
        onboarding_completed=True,
        created_at=now_utc,
    )


@pytest.fixture
def other_org_user(now_utc):
    return User(
        id="user-other-005",
        email="outsider@other.com",
        full_name="Other Org User",
        organization_id="org-other-999",
        role="owner",
        is_active=True,
        email_verified=True,
        onboarding_completed=True,
        created_at=now_utc,
    )


@pytest.fixture
def sample_project(org_id, project_lead_user, now_utc):
    proj = Project(
        id="proj-uuid-101",
        key="TEST",
        name="Test Initiative",
        organization_id=org_id,
        lead_id=project_lead_user.id,
        status="active",
        visibility="organization",
        icon="folder",
        color="blue",
        is_archived=False,
        created_at=now_utc,
    )
    proj.lead = project_lead_user
    proj.members = []
    proj.invitations = []
    return proj


@pytest.mark.asyncio
async def test_regular_member_cannot_edit_project_settings(regular_member_user, sample_project):
    """A regular member who is not the project lead must receive 403 Forbidden."""
    db_mock = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = sample_project
    db_mock.execute.return_value = mock_result

    payload = ProjectUpdate(name="Unauthorized Rename Attempt")

    with pytest.raises(HTTPException) as exc_info:
        await update_project(
            project_id=sample_project.id,
            project_update=payload,
            current_user=regular_member_user,
            db=db_mock,
        )

    assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
    assert "project lead, organization admin, or owner" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_project_lead_can_edit_project_settings(project_lead_user, sample_project):
    """Project lead is explicitly authorized to edit project settings."""
    db_mock = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = sample_project
    db_mock.execute.return_value = mock_result

    payload = ProjectUpdate(name="Lead Updated Name")

    updated = await update_project(
        project_id=sample_project.id,
        project_update=payload,
        current_user=project_lead_user,
        db=db_mock,
    )

    assert sample_project.name == "Lead Updated Name"
    assert db_mock.commit.called


@pytest.mark.asyncio
async def test_org_admin_can_edit_project_settings(org_admin_user, sample_project):
    """Organization Admin is authorized to edit project settings."""
    db_mock = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = sample_project
    db_mock.execute.return_value = mock_result

    payload = ProjectUpdate(description="Admin updated description")

    updated = await update_project(
        project_id=sample_project.id,
        project_update=payload,
        current_user=org_admin_user,
        db=db_mock,
    )

    assert sample_project.description == "Admin updated description"
    assert db_mock.commit.called


@pytest.mark.asyncio
async def test_org_owner_can_edit_project_settings(org_owner_user, sample_project):
    """Organization Owner is authorized to edit project settings."""
    db_mock = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = sample_project
    db_mock.execute.return_value = mock_result

    payload = ProjectUpdate(status="Planning")

    updated = await update_project(
        project_id=sample_project.id,
        project_update=payload,
        current_user=org_owner_user,
        db=db_mock,
    )

    assert sample_project.status == "Planning"
    assert db_mock.commit.called


@pytest.mark.asyncio
async def test_project_scoped_to_caller_organization(other_org_user):
    """Accessing a project from another organization returns 404 because query filters by organization_id."""
    db_mock = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalars.return_value.first.return_value = None  # Scoped query returns nothing
    db_mock.execute.return_value = mock_result

    payload = ProjectUpdate(name="Cross Org Hack")

    with pytest.raises(HTTPException) as exc_info:
        await update_project(
            project_id="foreign-proj-id",
            project_update=payload,
            current_user=other_org_user,
            db=db_mock,
        )

    assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
