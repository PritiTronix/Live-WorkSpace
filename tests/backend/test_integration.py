import uuid
import pytest
from fastapi.testclient import TestClient
from backend.app.main import create_application
from backend.app.models import Task, User, Project, Ticket, Discussion, ProjectMember


@pytest.fixture
def client():
    app = create_application()
    with TestClient(app) as c:
        yield c


@pytest.fixture
def auth_headers(client):
    res = client.post("/api/v1/auth/login", json={"email": "aarav@acmetech.io", "password": "workspace123"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"


def test_models_and_synonyms():
    # Verify Task has all fields and synonym works
    task = Task(
        id="test-task-1",
        task_number="TASK-TEST-001",
        title="Test Task Title",
        status="todo",
        priority="high",
        task_type="feature",
        assigned_to_id="usr_01",
    )
    assert task.assignee_id == "usr_01"
    assert task.assigned_to_id == "usr_01"

    # Set via assignee_id
    task.assignee_id = "usr_02"
    assert task.assigned_to_id == "usr_02"


def test_unauthenticated_requests_blocked(client):
    """P0 Security Requirement: All protected endpoints must reject unauthenticated requests with 401."""
    protected_endpoints = [
        ("GET", "/api/v1/tasks"),
        ("POST", "/api/v1/tasks"),
        ("GET", "/api/v1/projects"),
        ("GET", "/api/v1/tickets"),
        ("GET", "/api/v1/notifications"),
        ("GET", "/api/v1/sla/metrics"),
        ("GET", "/api/v1/analytics/summary"),
        ("GET", "/api/v1/settings/workspace"),
        ("GET", "/api/v1/users/me"),
        ("GET", "/api/v1/files"),
    ]
    for method, path in protected_endpoints:
        if method == "GET":
            res = client.get(path)
        elif method == "POST":
            res = client.post(path, json={})
        assert res.status_code == 401, f"Expected 401 for {method} {path}, got {res.status_code}"


def test_tasks_endpoints(client, auth_headers):
    # 1. List tasks
    res = client.get("/api/v1/tasks", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data

    # 2. Get meta enums (public metadata)
    res_enums = client.get("/api/v1/tasks/meta/enums")
    assert res_enums.status_code == 200
    enums_data = res_enums.json()
    assert "status" in enums_data
    assert "priority" in enums_data
    assert "task_type" in enums_data

    # 3. Create task (using assigned_to_id to test backward compatibility)
    create_payload = {
        "title": "Integration Test Task",
        "description": "Integration test description",
        "status": "to_do",  # Tests normalizer to "todo"
        "priority": "urgent",
        "task_type": "bug",
        "assigned_to_id": "usr_01",
    }
    res_create = client.post("/api/v1/tasks", json=create_payload, headers=auth_headers)
    assert res_create.status_code == 201
    created_task = res_create.json()
    task_id = created_task["id"]
    assert created_task["title"] == "Integration Test Task"
    assert created_task["status"] == "todo"
    assert created_task["assignee_id"] == "usr_01"
    assert created_task["assigned_to_id"] == "usr_01"

    # 4. Get task by ID
    res_get = client.get(f"/api/v1/tasks/{task_id}", headers=auth_headers)
    assert res_get.status_code == 200
    assert res_get.json()["id"] == task_id

    # 5. Patch task status
    res_status = client.patch(f"/api/v1/tasks/{task_id}/status", json={"status": "in_progress"}, headers=auth_headers)
    assert res_status.status_code == 200
    assert res_status.json()["status"] == "in_progress"

    # 6. Add comment
    res_comment = client.post(f"/api/v1/tasks/{task_id}/comments", json={"body": "Test comment body"}, headers=auth_headers)
    assert res_comment.status_code == 201
    assert res_comment.json()["body"] == "Test comment body"

    # 7. List comments
    res_list_comments = client.get(f"/api/v1/tasks/{task_id}/comments", headers=auth_headers)
    assert res_list_comments.status_code == 200
    assert len(res_list_comments.json()) >= 1

    # 8. Register attachment
    res_att = client.post(
        f"/api/v1/tasks/{task_id}/attachments",
        json={
            "filename": "screenshot.png",
            "file_size": 1024,
            "mime_type": "image/png",
            "storage_key": "uploads/tasks/screenshot.png",
        },
        headers=auth_headers,
    )
    assert res_att.status_code == 201
    assert res_att.json()["filename"] == "screenshot.png"

    # 9. List attachments
    res_list_att = client.get(f"/api/v1/tasks/{task_id}/attachments", headers=auth_headers)
    assert res_list_att.status_code == 200
    assert len(res_list_att.json()) >= 1

    # 10. Delete task
    res_del = client.delete(f"/api/v1/tasks/{task_id}", headers=auth_headers)
    assert res_del.status_code == 204


def test_notifications_endpoints(client, auth_headers):
    res = client.get("/api/v1/notifications", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "unread_count" in data

    res_unread = client.get("/api/v1/notifications/unread-count", headers=auth_headers)
    assert res_unread.status_code == 200
    assert "unread_count" in res_unread.json()

    res_read_all = client.patch("/api/v1/notifications/read-all", headers=auth_headers)
    assert res_read_all.status_code == 200
    assert "marked_count" in res_read_all.json()


def test_auth_and_user_endpoints(client):
    # 1. Login with seeded credentials
    login_res = client.post("/api/v1/auth/login", json={"email": "aarav@acmetech.io", "password": "workspace123"})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    assert token

    # 2. Get current user profile using bearer token
    me_res = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    user = me_res.json()
    assert user["email"] == "aarav@acmetech.io"
    assert user["role"] == "owner"


def test_sla_and_analytics_endpoints(client, auth_headers):
    # 1. SLA metrics
    sla_res = client.get("/api/v1/sla/metrics", headers=auth_headers)
    assert sla_res.status_code == 200
    assert "adherence_rate" in sla_res.json()

    # 2. SLA policies
    pol_res = client.get("/api/v1/sla/policies", headers=auth_headers)
    assert pol_res.status_code == 200
    assert len(pol_res.json()) >= 1

    # 3. Analytics summary
    ana_res = client.get("/api/v1/analytics/summary", headers=auth_headers)
    assert ana_res.status_code == 200
    assert "total_tasks" in ana_res.json()


def test_multi_tenant_isolation(client, auth_headers):
    """
    Critical SaaS requirement:
    User A from Org A cannot access or modify projects, tasks, or tickets belonging to Org B.
    """
    # 1. Register a new user and organization (Org B) with unique email
    email_b = f"bob_{uuid.uuid4().hex[:6]}@tenantb.io"
    org_name_b = f"Tenant B {uuid.uuid4().hex[:6]}"
    reg_res = client.post("/api/v1/auth/register", json={
        "full_name": "Bob Tenant",
        "email": email_b,
        "password": "Password123!",
        "organization_name": org_name_b,
    })
    assert reg_res.status_code == 201

    login_b = client.post("/api/v1/auth/login", json={"email": email_b, "password": "Password123!"})
    assert login_b.status_code == 200
    token_b = login_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 2. User B lists projects - should NOT see Acme Tech projects (prj_01, etc.)
    proj_b = client.get("/api/v1/projects", headers=headers_b)
    assert proj_b.status_code == 200
    assert len(proj_b.json()) == 0

    # 3. User B tries to directly fetch Org A's project by ID - must return 404
    proj_a_direct = client.get("/api/v1/projects/prj_01", headers=headers_b)
    assert proj_a_direct.status_code == 404

    # 4. User B lists tickets - should NOT see Acme Tech tickets (TKT-1025, etc.)
    tkt_b = client.get("/api/v1/tickets", headers=headers_b)
    assert tkt_b.status_code == 200
    assert len(tkt_b.json()) == 0

    # 5. User B tries to fetch Org A's ticket directly - must return 404
    tkt_a_direct = client.get("/api/v1/tickets/TKT-1025", headers=headers_b)
    assert tkt_a_direct.status_code == 404


def test_rbac_authorization(client, auth_headers):
    """
    RBAC verification:
    Admins/Owners can update workspace settings; regular members receive 403 Forbidden.
    """
    # 1. Login as member (usr_03: david.k@acmetech.io)
    login_member = client.post("/api/v1/auth/login", json={"email": "david.k@acmetech.io", "password": "workspace123"})
    assert login_member.status_code == 200
    member_headers = {"Authorization": f"Bearer {login_member.json()['access_token']}"}

    # 2. Member tries to update workspace settings - must receive 403 Forbidden
    patch_res = client.patch(
        "/api/v1/settings/workspace",
        json={"name": "Hacked Name"},
        headers=member_headers
    )
    assert patch_res.status_code == 403

    # 3. Owner (aarav) can update workspace settings - must succeed 200
    owner_patch = client.patch(
        "/api/v1/settings/workspace",
        json={"name": "Acme Tech Enterprise"},
        headers=auth_headers
    )
    assert owner_patch.status_code == 200
    assert owner_patch.json()["name"] == "Acme Tech Enterprise"
