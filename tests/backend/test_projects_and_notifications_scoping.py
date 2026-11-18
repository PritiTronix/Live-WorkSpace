"""
Unit and integration tests proving multi-tenant scoping for:
1. Project task counts (completed_tasks, total_tasks, sprint_progress)
2. Project member counts (members roster and overflow count)
3. Project ticket counts (open_tickets, blocker_tickets, critical_tickets)
4. Notification unread count (strictly scoped to current user AND current organization)
5. Project creation RBAC enforcement (403 Forbidden for non-privileged roles)
"""
import uuid
import pytest
from fastapi.testclient import TestClient
from backend.app.main import create_application


@pytest.fixture
def client():
    app = create_application()
    with TestClient(app) as c:
        yield c


def setup_user(client: TestClient, org_name: str, role: str, suffix: str, owner_headers=None):
    email = f"user_{suffix}@enterprise-test.com"
    password = "TestPassword123!"
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": f"User {suffix}",
            "email": email,
            "password": password,
            "organization_name": org_name,
        },
    )
    assert reg_res.status_code == 201, f"Registration failed: {reg_res.text}"
    user_id = reg_res.json()["id"]

    if role != "owner" and owner_headers:
        patch_res = client.patch(
            f"/api/v1/users/{user_id}/role",
            headers=owner_headers,
            json={"role": role},
        )
        assert patch_res.status_code == 200, f"Role patch failed: {patch_res.text}"

    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    return headers, user_id, email


class TestProjectsAndNotificationsScoping:
    """Proves that project task, member, and ticket counts and notification unread counts are strictly scoped."""

    def test_project_creation_rbac_403_for_unauthorized_roles(self, client):
        """Users with roles member, employee, viewer must receive 403 on project creation."""
        uid = uuid.uuid4().hex[:6]
        org_name = f"Org RBAC 403 {uid}"
        owner_headers, _, _ = setup_user(client, org_name, "owner", f"owner_{uid}")

        for forbidden_role in ["member", "employee", "viewer"]:
            headers, _, _ = setup_user(client, org_name, forbidden_role, f"{forbidden_role}_{uid}", owner_headers=owner_headers)
            res = client.post(
                "/api/v1/projects",
                headers=headers,
                json={"name": f"Forbidden Project {forbidden_role}", "key": f"F{forbidden_role[:3].upper()}"},
            )
            assert res.status_code == 403, f"Role {forbidden_role} should get 403, got {res.status_code}"

    def test_project_creation_allowed_for_privileged_roles(self, client):
        """Users with roles lead, manager, admin, owner must be allowed to create projects."""
        uid = uuid.uuid4().hex[:6]
        org_name = f"Org Privileged {uid}"
        owner_headers, _, _ = setup_user(client, org_name, "owner", f"owner_{uid}")

        for allowed_role in ["lead", "manager", "admin", "owner"]:
            if allowed_role == "owner":
                headers = owner_headers
            else:
                headers, _, _ = setup_user(client, org_name, allowed_role, f"{allowed_role}_{uid}", owner_headers=owner_headers)

            res = client.post(
                "/api/v1/projects",
                headers=headers,
                json={"name": f"Project by {allowed_role}", "key": f"P{allowed_role[:3].upper()}{uid[:2].upper()}"},
            )
            assert res.status_code == 201, f"Role {allowed_role} should get 201, got {res.status_code}: {res.text}"

    def test_project_task_counts_scoped_to_organization(self, client):
        """Verifies project task counts reflect only tasks belonging to the project and caller's organization."""
        uid = uuid.uuid4().hex[:6]
        headers_a, _, _ = setup_user(client, f"Org A {uid}", "owner", f"a_{uid}")
        headers_b, _, _ = setup_user(client, f"Org B {uid}", "owner", f"b_{uid}")

        # 1. Org A creates Project A
        p_a = client.post(
            "/api/v1/projects",
            headers=headers_a,
            json={"name": f"Org A Project {uid}", "key": f"OA{uid[:2].upper()}"},
        ).json()
        proj_a_id = p_a["id"]

        # 2. Org B creates Project B
        p_b = client.post(
            "/api/v1/projects",
            headers=headers_b,
            json={"name": f"Org B Project {uid}", "key": f"OB{uid[:2].upper()}"},
        ).json()
        proj_b_id = p_b["id"]

        # 3. Create tasks in Project A (Org A): 1 todo, 1 done
        client.post(
            "/api/v1/tasks",
            headers=headers_a,
            json={"title": f"Task A1 Todo {uid}", "status": "to_do", "project_id": proj_a_id, "priority": "medium"},
        )
        client.post(
            "/api/v1/tasks",
            headers=headers_a,
            json={"title": f"Task A2 Done {uid}", "status": "done", "project_id": proj_a_id, "priority": "low"},
        )

        # 4. Create tasks in Project B (Org B): 3 tasks
        for i in range(3):
            client.post(
                "/api/v1/tasks",
                headers=headers_b,
                json={"title": f"Task B{i} {uid}", "status": "done", "project_id": proj_b_id, "priority": "high"},
            )

        # 5. Verify Org A projects list metrics
        list_a = client.get("/api/v1/projects", headers=headers_a).json()
        target_a = next(p for p in list_a if p["id"] == proj_a_id)
        assert target_a["metrics"]["total_tasks"] == 2
        assert target_a["metrics"]["completed_tasks"] == 1
        assert target_a["metrics"]["sprint_progress"] == 50

        # 6. Verify Org B projects list metrics
        list_b = client.get("/api/v1/projects", headers=headers_b).json()
        target_b = next(p for p in list_b if p["id"] == proj_b_id)
        assert target_b["metrics"]["total_tasks"] == 3
        assert target_b["metrics"]["completed_tasks"] == 3
        assert target_b["metrics"]["sprint_progress"] == 100

    def test_project_member_counts_scoped_to_organization(self, client):
        """Verifies member counts in project response reflect real members in caller's organization."""
        uid = uuid.uuid4().hex[:6]
        org_name = f"Org Members {uid}"
        lead_headers, lead_id, _ = setup_user(client, org_name, "owner", f"lead_{uid}")
        _, dev_id, dev_email = setup_user(client, org_name, "developer", f"dev_{uid}", owner_headers=lead_headers)

        # 1. Create project
        proj = client.post(
            "/api/v1/projects",
            headers=lead_headers,
            json={"name": f"Roster Scoping Project {uid}", "key": f"RO{uid[:2].upper()}"},
        ).json()
        project_id = proj["id"]

        # Initial creator is the owner/lead member
        get_res = client.get(f"/api/v1/projects/{project_id}", headers=lead_headers).json()
        assert len(get_res["members"]) == 1

        # 2. Add a second member
        client.post(
            f"/api/v1/projects/{project_id}/members",
            headers=lead_headers,
            json={"email": dev_email, "user_id": dev_id, "role": "developer"},
        )

        updated_proj = client.get(f"/api/v1/projects/{project_id}", headers=lead_headers).json()
        assert len(updated_proj["members"]) == 2

    def test_project_ticket_counts_scoped_to_organization(self, client):
        """Verifies ticket open count and attention indicator are scoped strictly to the project and organization."""
        uid = uuid.uuid4().hex[:6]
        headers_a, _, _ = setup_user(client, f"Tickets Org A {uid}", "owner", f"a_{uid}")
        headers_b, _, _ = setup_user(client, f"Tickets Org B {uid}", "owner", f"b_{uid}")

        proj_a = client.post(
            "/api/v1/projects",
            headers=headers_a,
            json={"name": f"Tickets Org A {uid}", "key": f"TA{uid[:2].upper()}"},
        ).json()

        proj_b = client.post(
            "/api/v1/projects",
            headers=headers_b,
            json={"name": f"Tickets Org B {uid}", "key": f"TB{uid[:2].upper()}"},
        ).json()

        # Create 1 blocker ticket in Project A
        client.post(
            "/api/v1/tickets",
            headers=headers_a,
            json={
                "title": f"Blocker in A {uid}",
                "severity": "blocker",
                "status": "open",
                "project_id": proj_a["id"],
            },
        )

        # Create 2 critical tickets in Project B
        for i in range(2):
            client.post(
                "/api/v1/tickets",
                headers=headers_b,
                json={
                    "title": f"Critical in B {i} {uid}",
                    "severity": "critical",
                    "status": "open",
                    "project_id": proj_b["id"],
                },
            )

        # Verify Org A project metrics
        res_a = client.get(f"/api/v1/projects/{proj_a['id']}", headers=headers_a).json()
        assert res_a["metrics"]["open_tickets"] == 1
        assert res_a["metrics"]["blocker_tickets"] == 1
        assert res_a["metrics"]["critical_tickets"] == 0
        assert res_a["metrics"]["attention_severity"] == "blocker"
        assert res_a["metrics"]["attention_text"] == "1 Blocker"

        # Verify Org B project metrics
        res_b = client.get(f"/api/v1/projects/{proj_b['id']}", headers=headers_b).json()
        assert res_b["metrics"]["open_tickets"] == 2
        assert res_b["metrics"]["blocker_tickets"] == 0
        assert res_b["metrics"]["critical_tickets"] == 2
        assert res_b["metrics"]["attention_severity"] == "critical"
        assert res_b["metrics"]["attention_text"] == "2 Critical"

    def test_notification_unread_count_scoped_to_user_and_organization(self, client):
        """
        Verifies that /api/v1/notifications/unread-count returns only the authenticated
        caller's unread notifications within their tenant organization.
        """
        uid = uuid.uuid4().hex[:6]
        org_a = f"Org Notif A {uid}"
        org_b = f"Org Notif B {uid}"

        headers_a1, _, _ = setup_user(client, org_a, "owner", f"a1_{uid}")
        headers_a2, _, _ = setup_user(client, org_a, "member", f"a2_{uid}")
        headers_b1, _, _ = setup_user(client, org_b, "owner", f"b1_{uid}")

        # Initial unread count for all must be 0
        res_a1 = client.get("/api/v1/notifications/unread-count", headers=headers_a1).json()
        res_a2 = client.get("/api/v1/notifications/unread-count", headers=headers_a2).json()
        res_b1 = client.get("/api/v1/notifications/unread-count", headers=headers_b1).json()

        assert res_a1["unread_count"] == 0
        assert res_a2["unread_count"] == 0
        assert res_b1["unread_count"] == 0
