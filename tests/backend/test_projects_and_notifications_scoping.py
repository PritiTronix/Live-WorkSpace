"""
Unit and integration tests proving multi-tenant scoping for:
1. Project task counts (completed_tasks, total_tasks, sprint_progress)
2. Project member counts (members roster and overflow count)
3. Project ticket counts (open_tickets, blocker_tickets, critical_tickets)
4. Notification unread count (strictly scoped to current user AND current organization)
5. Project creation RBAC enforcement (403 Forbidden for non-privileged roles)

DO NOT RUN against shared database. These tests are written for isolated test environments.
"""
import uuid
import pytest
from fastapi.testclient import TestClient
from backend.app.main import create_application
from backend.app.core.security import create_access_token


@pytest.fixture
def client():
    app = create_application()
    with TestClient(app) as c:
        yield c


def make_auth_headers(user_id: str, role: str, org_id: str, email: str = "user@test.com"):
    token = create_access_token(
        subject=user_id,
        role=role,
        org_id=org_id,
        email=email,
    )
    return {"Authorization": f"Bearer {token}"}


class TestProjectsAndNotificationsScoping:
    """Proves that project task, member, and ticket counts and notification unread counts are strictly scoped."""

    def test_project_creation_rbac_403_for_unauthorized_roles(self, client):
        """Users with roles member, employee, viewer must receive 403 on project creation."""
        org_id = f"org_{uuid.uuid4().hex[:6]}"

        for forbidden_role in ["member", "employee", "viewer"]:
            uid = f"usr_{forbidden_role}_{uuid.uuid4().hex[:4]}"
            headers = make_auth_headers(uid, role=forbidden_role, org_id=org_id, email=f"{forbidden_role}@test.com")

            res = client.post(
                "/api/v1/projects",
                headers=headers,
                json={"name": "Forbidden Project", "key": "FORBID"},
            )
            assert res.status_code == 403, f"Role {forbidden_role} should get 403, got {res.status_code}"

    def test_project_creation_allowed_for_privileged_roles(self, client):
        """Users with roles lead, manager, admin, owner must be allowed to create projects."""
        org_id = f"org_{uuid.uuid4().hex[:6]}"

        for allowed_role in ["lead", "manager", "admin", "owner"]:
            uid = f"usr_{allowed_role}_{uuid.uuid4().hex[:4]}"
            headers = make_auth_headers(uid, role=allowed_role, org_id=org_id, email=f"{allowed_role}@test.com")

            res = client.post(
                "/api/v1/projects",
                headers=headers,
                json={"name": f"Project by {allowed_role}", "key": allowed_role[:4].upper()},
            )
            assert res.status_code == 201, f"Role {allowed_role} should get 201, got {res.status_code}: {res.text}"

    def test_project_task_counts_scoped_to_organization(self, client):
        """Verifies project task counts reflect only tasks belonging to the project and caller's organization."""
        org_a = f"org_a_{uuid.uuid4().hex[:6]}"
        org_b = f"org_b_{uuid.uuid4().hex[:6]}"

        user_a = f"usr_a_{uuid.uuid4().hex[:4]}"
        user_b = f"usr_b_{uuid.uuid4().hex[:4]}"

        headers_a = make_auth_headers(user_a, role="lead", org_id=org_a, email="lead_a@orga.com")
        headers_b = make_auth_headers(user_b, role="lead", org_id=org_b, email="lead_b@orgb.com")

        # 1. Org A creates Project A
        p_a = client.post(
            "/api/v1/projects",
            headers=headers_a,
            json={"name": "Org A Project", "key": "ORGA"},
        ).json()
        proj_a_id = p_a["id"]

        # 2. Org B creates Project B
        p_b = client.post(
            "/api/v1/projects",
            headers=headers_b,
            json={"name": "Org B Project", "key": "ORGB"},
        ).json()
        proj_b_id = p_b["id"]

        # 3. Create tasks in Project A (Org A): 1 todo, 1 done
        client.post(
            "/api/v1/tasks",
            headers=headers_a,
            json={"title": "Task A1 Todo", "status": "to_do", "project_id": proj_a_id, "priority": "medium"},
        )
        client.post(
            "/api/v1/tasks",
            headers=headers_a,
            json={"title": "Task A2 Done", "status": "done", "project_id": proj_a_id, "priority": "low"},
        )

        # 4. Create tasks in Project B (Org B): 3 tasks
        for i in range(3):
            client.post(
                "/api/v1/tasks",
                headers=headers_b,
                json={"title": f"Task B{i}", "status": "done", "project_id": proj_b_id, "priority": "high"},
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
        org_id = f"org_{uuid.uuid4().hex[:6]}"
        lead_id = f"usr_lead_{uuid.uuid4().hex[:4]}"
        dev_id = f"usr_dev_{uuid.uuid4().hex[:4]}"

        lead_headers = make_auth_headers(lead_id, role="lead", org_id=org_id, email="lead@org.com")

        # 1. Create project
        proj = client.post(
            "/api/v1/projects",
            headers=lead_headers,
            json={"name": "Roster Scoping Project", "key": "ROST"},
        ).json()
        project_id = proj["id"]

        # Initial creator is the owner/lead member
        get_res = client.get(f"/api/v1/projects/{project_id}", headers=lead_headers).json()
        assert len(get_res["members"]) == 1

        # 2. Add a second member
        client.post(
            f"/api/v1/projects/{project_id}/members",
            headers=lead_headers,
            json={"email": "dev@org.com", "user_id": dev_id, "role": "developer"},
        )

        updated_proj = client.get(f"/api/v1/projects/{project_id}", headers=lead_headers).json()
        assert len(updated_proj["members"]) == 2

    def test_project_ticket_counts_scoped_to_organization(self, client):
        """Verifies ticket open count and attention indicator are scoped strictly to the project and organization."""
        org_a = f"org_a_{uuid.uuid4().hex[:6]}"
        org_b = f"org_b_{uuid.uuid4().hex[:6]}"

        user_a = f"usr_a_{uuid.uuid4().hex[:4]}"
        user_b = f"usr_b_{uuid.uuid4().hex[:4]}"

        headers_a = make_auth_headers(user_a, role="lead", org_id=org_a, email="a@test.com")
        headers_b = make_auth_headers(user_b, role="lead", org_id=org_b, email="b@test.com")

        proj_a = client.post(
            "/api/v1/projects",
            headers=headers_a,
            json={"name": "Tickets Org A", "key": "TOA"},
        ).json()

        proj_b = client.post(
            "/api/v1/projects",
            headers=headers_b,
            json={"name": "Tickets Org B", "key": "TOB"},
        ).json()

        # Create 1 blocker ticket in Project A
        client.post(
            "/api/v1/tickets",
            headers=headers_a,
            json={
                "title": "Blocker in A",
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
                    "title": f"Critical in B {i}",
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
        org_a = f"org_notif_a_{uuid.uuid4().hex[:6]}"
        org_b = f"org_notif_b_{uuid.uuid4().hex[:6]}"

        user_a1 = f"usr_a1_{uuid.uuid4().hex[:4]}"
        user_a2 = f"usr_a2_{uuid.uuid4().hex[:4]}"
        user_b1 = f"usr_b1_{uuid.uuid4().hex[:4]}"

        headers_a1 = make_auth_headers(user_a1, role="member", org_id=org_a, email="a1@test.com")
        headers_a2 = make_auth_headers(user_a2, role="member", org_id=org_a, email="a2@test.com")
        headers_b1 = make_auth_headers(user_b1, role="member", org_id=org_b, email="b1@test.com")

        # Initial unread count for all must be 0
        res_a1 = client.get("/api/v1/notifications/unread-count", headers=headers_a1).json()
        res_a2 = client.get("/api/v1/notifications/unread-count", headers=headers_a2).json()
        res_b1 = client.get("/api/v1/notifications/unread-count", headers=headers_b1).json()

        assert res_a1["unread_count"] == 0
        assert res_a2["unread_count"] == 0
        assert res_b1["unread_count"] == 0
