"""
Tests for Team Member Detail & Profile Drawer Endpoints:
- GET /api/v1/users/{id} and /api/v1/members/{id}
- PATCH /api/v1/users/{id}/role and /api/v1/members/{id}/role
- Organization isolation, RBAC, self-escalation blocks, last-owner demotion protection,
  workload calculations, and prevention of credential/private field leakage.
"""
import uuid
import pytest
from fastapi.testclient import TestClient
from backend.app.main import create_application
from backend.app.routes.users import compute_member_workload, compute_ticket_sla_state
from datetime import datetime, timezone, timedelta


@pytest.fixture
def client():
    app = create_application()
    with TestClient(app) as c:
        yield c


@pytest.fixture
def auth_headers(client):
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "bhaveshburad729@gmail.com", "password": "bhavesh729"},
    )
    assert res.status_code == 200, f"Login failed: {res.text}"
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_unauthenticated_member_endpoints_blocked(client):
    """Unauthenticated requests to member detail or role update must return 401."""
    res = client.get("/api/v1/users/usr_dummy")
    assert res.status_code == 401

    res_alias = client.get("/api/v1/members/usr_dummy")
    assert res_alias.status_code == 401

    res_role = client.patch("/api/v1/users/usr_dummy/role", json={"role": "developer"})
    assert res_role.status_code == 401


def test_get_member_detail_success_and_no_leakage(client, auth_headers):
    """Member detail endpoint returns real data schema without leaking password hash or private keys."""
    # First get current user profile to have a valid ID
    me_res = client.get("/api/v1/users/me", headers=auth_headers)
    assert me_res.status_code == 200
    my_id = me_res.json()["id"]

    # Test /users/{id}
    res = client.get(f"/api/v1/users/{my_id}", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()

    # Core required fields
    assert data["id"] == my_id
    assert data["email"] == "bhaveshburad729@gmail.com"
    assert "full_name" in data
    assert "role" in data
    assert "projects" in data and isinstance(data["projects"], list)
    assert "tickets" in data and isinstance(data["tickets"], list)
    assert "tasks" in data and isinstance(data["tasks"], list)
    assert "workload" in data
    assert data["workload"]["threshold"] == 80

    # Ensure sensitive credentials are NOT leaked
    assert "hashed_password" not in data
    assert "password" not in data
    assert "access_token" not in data

    # Test alias /members/{id}
    alias_res = client.get(f"/api/v1/members/{my_id}", headers=auth_headers)
    assert alias_res.status_code == 200
    alias_data = alias_res.json()
    assert alias_data["id"] == my_id


def test_organization_isolation(client, auth_headers):
    """A member of another organization or non-existent user returns 404, never 200 or data."""
    fake_foreign_id = f"usr_{uuid.uuid4().hex[:12]}"
    res = client.get(f"/api/v1/users/{fake_foreign_id}", headers=auth_headers)
    assert res.status_code == 404
    assert "not found in this organization" in res.json().get("detail", "").lower()

    res_alias = client.get(f"/api/v1/members/{fake_foreign_id}", headers=auth_headers)
    assert res_alias.status_code == 404


def test_workload_formula_unit():
    """Verify compute_member_workload formula logic."""
    # 0 items -> 0%
    assert compute_member_workload(0, 0, 0) == 0

    # 1 task (10) + 1 ticket (15) = 25%
    assert compute_member_workload(1, 1, 0) == 25

    # 2 tasks (20) + 2 tickets (30) + 1 blocker (10) = 60%
    assert compute_member_workload(2, 2, 1) == 60

    # Overload cap at 100%
    assert compute_member_workload(10, 10, 5) == 100


def test_sla_state_computation_unit():
    """Verify compute_ticket_sla_state returns truthful statuses."""
    now = datetime.now(timezone.utc)

    # Closed or resolved -> None
    assert compute_ticket_sla_state(now + timedelta(hours=1), "resolved", now)["status"] is None
    assert compute_ticket_sla_state(None, "open", now)["status"] is None

    # Breached (deadline passed)
    breached = compute_ticket_sla_state(now - timedelta(minutes=15), "open", now)
    assert breached["status"] == "breached"
    assert breached["label"] == "SLA Breached"

    # Breaching soon (within 2 hours)
    soon = compute_ticket_sla_state(now + timedelta(minutes=45), "open", now)
    assert soon["status"] == "breaching_soon"
    assert "Breaching in" in soon["label"]

    # Healthy (> 2 hours)
    healthy = compute_ticket_sla_state(now + timedelta(hours=24), "open", now)
    assert healthy["status"] == "healthy"
    assert healthy["label"] == "SLA Healthy"


def test_role_update_invalid_role_rejected(client, auth_headers):
    """Submitting an invalid role string returns 400 Bad Request."""
    me_res = client.get("/api/v1/users/me", headers=auth_headers)
    my_id = me_res.json()["id"]

    res = client.patch(
        f"/api/v1/users/{my_id}/role",
        json={"role": "super_mega_admin"},
        headers=auth_headers,
    )
    assert res.status_code == 400
    assert "Invalid role" in res.json().get("detail", "")


def test_last_owner_demotion_rejected(client, auth_headers):
    """Attempting to demote the sole organization owner returns 400."""
    me_res = client.get("/api/v1/users/me", headers=auth_headers)
    my_id = me_res.json()["id"]
    current_role = me_res.json()["role"]

    if current_role == "owner":
        # Trying to demote sole owner to developer
        res = client.patch(
            f"/api/v1/users/{my_id}/role",
            json={"role": "developer"},
            headers=auth_headers,
        )
        assert res.status_code == 400
        assert "Cannot demote the last organization owner" in res.json().get("detail", "")
