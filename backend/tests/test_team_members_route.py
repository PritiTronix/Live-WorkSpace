"""
Backend Route Tests for GET /api/v1/users (Team Members List).
=============================================================
Asserts:
1. HTTP 200 and successful serialization against UserRead schema (no ResponseValidationError).
2. 'created_at' field is present and non-null on all members.
3. External avatar fallback (api.dicebear.com) is sanitized to None / null.
4. Response shape handles members in different states:
   - active + online
   - active + away (user-set status 'away' overriding online)
   - active + offline
   - inactive + offline
5. Status and presence filters work accurately.
"""

import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.dependencies import get_current_active_user, get_db
from backend.app.models import User, Membership
from backend.app.enums import PresenceStatus, AccountState


@pytest.fixture
def test_client():
    client = TestClient(app)
    return client


def test_list_team_members_route_shape_and_validation(test_client):
    now = datetime.now(timezone.utc)
    org_id = "org_test_members_validation"

    # Authenticated user
    auth_user = User(
        id="usr_auth",
        email="auth@example.com",
        full_name="Auth Manager",
        role="admin",
        is_active=True,
        organization_id=org_id,
        created_at=now,
    )

    # Mock members returned by workforce service
    mock_members = [
        {
            "id": "usr_active_online",
            "full_name": "Alice Online",
            "display_name": "Alice",
            "email": "alice@example.com",
            "role": "member",
            "title": "Senior Engineer",
            "avatar_url": "https://api.dicebear.com/7.x/initials/svg?seed=Alice",  # external avatar to sanitize
            "department": "Engineering",
            "department_key": "engineering",
            "is_active": True,
            "account_state": "active",
            "presence": "online",
            "user_set_status": None,
            "is_available": True,
            "last_active_at": now - timedelta(seconds=30),
            "timezone": "UTC",
            "phone": "+1234567890",
            "slack_handle": "@alice",
            "on_call_role": "Primary",
            "active_tasks_count": 2,
            "active_tickets_count": 1,
            "active_items_count": 3,
            "organization_id": org_id,
            "email_verified": True,
            "onboarding_completed": True,
            "created_at": now - timedelta(days=30),
            "memberships": [],
        },
        {
            "id": "usr_active_away",
            "full_name": "Bob Away",
            "display_name": "Bob",
            "email": "bob@example.com",
            "role": "member",
            "title": "DevOps Engineer",
            "avatar_url": None,
            "department": "Engineering",
            "department_key": "engineering",
            "is_active": True,
            "account_state": "active",
            "presence": "away",
            "user_set_status": "away",
            "is_available": False,  # away reduces availability
            "last_active_at": now - timedelta(seconds=10),
            "timezone": "UTC",
            "phone": None,
            "slack_handle": "@bob",
            "on_call_role": None,
            "active_tasks_count": 0,
            "active_tickets_count": 0,
            "active_items_count": 0,
            "organization_id": org_id,
            "email_verified": True,
            "onboarding_completed": True,
            "created_at": now - timedelta(days=20),
            "memberships": [],
        },
        {
            "id": "usr_active_offline",
            "full_name": "Charlie Offline",
            "display_name": "Charlie",
            "email": "charlie@example.com",
            "role": "developer",
            "title": "Backend Engineer",
            "avatar_url": "/api/v1/users/usr_active_offline/avatar",
            "department": "Engineering",
            "department_key": "engineering",
            "is_active": True,
            "account_state": "active",
            "presence": "offline",
            "user_set_status": None,
            "is_available": True,  # offline-but-not-away is available
            "last_active_at": now - timedelta(days=1),
            "timezone": "UTC",
            "phone": None,
            "slack_handle": None,
            "on_call_role": None,
            "active_tasks_count": 1,
            "active_tickets_count": 0,
            "active_items_count": 1,
            "organization_id": org_id,
            "email_verified": True,
            "onboarding_completed": True,
            "created_at": now - timedelta(days=60),
            "memberships": [],
        },
        {
            "id": "usr_inactive_deactivated",
            "full_name": "David Inactive",
            "display_name": "David",
            "email": "david@example.com",
            "role": "member",
            "title": "Former Engineer",
            "avatar_url": None,
            "department": "Engineering",
            "department_key": "engineering",
            "is_active": False,
            "account_state": "inactive",
            "presence": "offline",
            "user_set_status": None,
            "is_available": False,
            "last_active_at": None,
            "timezone": "UTC",
            "phone": None,
            "slack_handle": None,
            "on_call_role": None,
            "active_tasks_count": 0,
            "active_tickets_count": 0,
            "active_items_count": 0,
            "organization_id": org_id,
            "email_verified": False,
            "onboarding_completed": False,
            "created_at": now - timedelta(days=90),
            "memberships": [],
        },
    ]

    mock_wf_data = {
        "total_members": 4,
        "active_count": 3,
        "inactive_count": 1,
        "pending_count": 0,
        "pending_invitations_count": 0,
        "online_count": 1,
        "department_counts": {"Engineering": 4},
        "role_counts": {"member": 2, "developer": 1},
        "average_workload": 20.0,
        "workload_status": "Optimal",
        "departments": [],
        "members": mock_members,
        "invitations": [],
    }

    # Dependency overrides
    app.dependency_overrides[get_current_active_user] = lambda: auth_user
    mock_db = AsyncMock()
    app.dependency_overrides[get_db] = lambda: mock_db

    try:
        with patch("backend.app.routes.users.get_organization_workforce_data", new_callable=AsyncMock) as mock_get_wf:
            mock_get_wf.return_value = mock_wf_data

            # 1. Test GET /api/v1/users returns 200 without ResponseValidationError
            resp = test_client.get("/api/v1/users")
            assert resp.status_code == 200, f"Expected 200 but got {resp.status_code}: {resp.text}"

            members = resp.json()
            assert len(members) == 4

            # 2. Check created_at is present on all members (not null, ISO format)
            for m in members:
                assert "created_at" in m
                assert m["created_at"] is not None
                # Validate ISO format parseable
                dt = datetime.fromisoformat(m["created_at"].replace("Z", "+00:00"))
                assert isinstance(dt, datetime)

            # 3. Check avatar fallback: dicebear URL must be sanitized to None (null in JSON)
            alice = next(m for m in members if m["id"] == "usr_active_online")
            assert alice["avatar_url"] is None, "Dicebear avatar should be sanitized to null"
            assert alice["presence"] == "online"
            assert alice["account_state"] == "active"
            assert alice["is_available"] is True
            assert alice["active_items_count"] == 3

            # 4. Check Bob (away)
            bob = next(m for m in members if m["id"] == "usr_active_away")
            assert bob["presence"] == "away"
            assert bob["account_state"] == "active"
            assert bob["is_available"] is False
            assert bob["user_set_status"] == "away"

            # 5. Check Charlie (offline but available)
            charlie = next(m for m in members if m["id"] == "usr_active_offline")
            assert charlie["presence"] == "offline"
            assert charlie["account_state"] == "active"
            assert charlie["is_available"] is True
            assert charlie["avatar_url"] == "/api/v1/users/usr_active_offline/avatar"

            # 6. Check David (inactive)
            david = next(m for m in members if m["id"] == "usr_inactive_deactivated")
            assert david["is_active"] is False
            assert david["account_state"] == "inactive"
            assert david["is_available"] is False

            # 7. Test status filter: active
            resp_active = test_client.get("/api/v1/users?status=active")
            assert resp_active.status_code == 200
            active_list = resp_active.json()
            assert len(active_list) == 3
            assert all(m["account_state"] == "active" for m in active_list)

            # 8. Test status filter: inactive
            resp_inactive = test_client.get("/api/v1/users?status=inactive")
            assert resp_inactive.status_code == 200
            inactive_list = resp_inactive.json()
            assert len(inactive_list) == 1
            assert inactive_list[0]["id"] == "usr_inactive_deactivated"

            # 9. Test presence filter: online
            resp_online = test_client.get("/api/v1/users?presence=online")
            assert resp_online.status_code == 200
            online_list = resp_online.json()
            assert len(online_list) == 1
            assert online_list[0]["id"] == "usr_active_online"

            # 10. Test presence filter: away
            resp_away = test_client.get("/api/v1/users?presence=away")
            assert resp_away.status_code == 200
            away_list = resp_away.json()
            assert len(away_list) == 1
            assert away_list[0]["id"] == "usr_active_away"

    finally:
        app.dependency_overrides.clear()
