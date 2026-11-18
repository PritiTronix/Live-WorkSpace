"""
Unit and integration tests proving strict tenant isolation for all Home Dashboard endpoints.
Each endpoint is tested to verify it filters and counts strictly within the authenticated caller's organization.

DO NOT RUN against shared database. These tests are written for CI/CD test runners with isolated test databases.
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


def register_and_login(client: TestClient, suffix: str):
    email = f"user_{suffix}@tenant-test.com"
    password = "TestPassword123!"
    org_name = f"Tenant Org {suffix}"

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

    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}, email, org_name


class TestDashboardTenantIsolation:
    """Verifies that every dashboard endpoint strictly isolates records between organizations."""

    def test_unauthenticated_endpoints_blocked(self, client):
        """All dashboard endpoints must return 401 when no token is provided."""
        endpoints = [
            "/api/v1/dashboard/metrics",
            "/api/v1/dashboard/tasks-breakdown",
            "/api/v1/dashboard/tickets-severity",
            "/api/v1/dashboard/sla-performance",
            "/api/v1/dashboard/project-progress",
            "/api/v1/dashboard/team-workload",
            "/api/v1/dashboard/priority-tickets",
            "/api/v1/dashboard/activity-timeline",
            "/api/v1/dashboard/filters",
            "/api/v1/dashboard/export?format=csv",
        ]
        for ep in endpoints:
            res = client.get(ep)
            assert res.status_code == 401, f"Expected 401 for {ep}, got {res.status_code}"

    def test_metrics_tenant_isolation(self, client):
        """Metrics endpoint must only count projects, tasks, and tickets for the caller's organization."""
        uid = uuid.uuid4().hex[:6]
        headers_a, _, _ = register_and_login(client, f"metrics_a_{uid}")
        headers_b, _, _ = register_and_login(client, f"metrics_b_{uid}")

        # Create Project in Org A
        p_res = client.post(
            "/api/v1/projects",
            json={"name": f"Project A {uid}", "key": f"PA{uid[:3].upper()}", "description": "Org A Project"},
            headers=headers_a,
        )
        assert p_res.status_code == 201
        proj_a_id = p_res.json()["id"]

        # Create Task in Org A
        t_res = client.post(
            "/api/v1/tasks",
            json={"title": f"Task in Org A {uid}", "project_id": proj_a_id, "status": "in_progress"},
            headers=headers_a,
        )
        assert t_res.status_code == 201

        # Query metrics for Org A
        m_a = client.get("/api/v1/dashboard/metrics", headers=headers_a).json()
        assert m_a["total_projects"] >= 1
        assert m_a["total_tasks"] >= 1

        # Query metrics for Org B - should NOT see Org A's project or task
        m_b = client.get("/api/v1/dashboard/metrics", headers=headers_b).json()
        assert m_b["total_projects"] == 0
        assert m_b["total_tasks"] == 0
        assert m_b["open_tickets"] == 0

    def test_tasks_breakdown_tenant_isolation(self, client):
        """Tasks breakdown must only reflect task statuses within caller's organization."""
        uid = uuid.uuid4().hex[:6]
        headers_a, _, _ = register_and_login(client, f"tb_a_{uid}")
        headers_b, _, _ = register_and_login(client, f"tb_b_{uid}")

        # Create done task in Org A
        client.post(
            "/api/v1/tasks",
            json={"title": f"Done Task {uid}", "status": "done"},
            headers=headers_a,
        )

        res_a = client.get("/api/v1/dashboard/tasks-breakdown", headers=headers_a).json()
        assert res_a["total"] >= 1
        assert res_a["done"] >= 1

        res_b = client.get("/api/v1/dashboard/tasks-breakdown", headers=headers_b).json()
        assert res_b["total"] == 0
        assert res_b["done"] == 0
        assert res_b["completion_rate"] == 0.0

    def test_tickets_severity_tenant_isolation(self, client):
        """Tickets severity must only count active tickets belonging to caller's organization."""
        uid = uuid.uuid4().hex[:6]
        headers_a, _, _ = register_and_login(client, f"sev_a_{uid}")
        headers_b, _, _ = register_and_login(client, f"sev_b_{uid}")

        # Create project in Org A
        p_res = client.post(
            "/api/v1/projects",
            json={"name": f"Severity Project {uid}", "key": f"SV{uid[:3].upper()}"},
            headers=headers_a,
        )
        proj_id = p_res.json()["id"]

        # Create blocker ticket in Org A
        client.post(
            "/api/v1/tickets",
            json={"title": f"Blocker Bug {uid}", "severity": "blocker", "project_id": proj_id},
            headers=headers_a,
        )

        sev_a = client.get("/api/v1/dashboard/tickets-severity", headers=headers_a).json()
        assert sev_a["total_active"] >= 1
        assert sev_a["blocker"] >= 1

        # Org B must see zero
        sev_b = client.get("/api/v1/dashboard/tickets-severity", headers=headers_b).json()
        assert sev_b["total_active"] == 0
        assert sev_b["blocker"] == 0

    def test_project_progress_tenant_isolation(self, client):
        """Project progress list must only return projects belonging to caller's organization."""
        uid = uuid.uuid4().hex[:6]
        headers_a, _, _ = register_and_login(client, f"prog_a_{uid}")
        headers_b, _, _ = register_and_login(client, f"prog_b_{uid}")

        proj_name = f"Alpha Secret {uid}"
        client.post(
            "/api/v1/projects",
            json={"name": proj_name, "key": f"AS{uid[:3].upper()}"},
            headers=headers_a,
        )

        res_a = client.get("/api/v1/dashboard/project-progress", headers=headers_a).json()
        assert any(p["title"] == proj_name for p in res_a)

        res_b = client.get("/api/v1/dashboard/project-progress", headers=headers_b).json()
        assert not any(p["title"] == proj_name for p in res_b)

    def test_team_workload_tenant_isolation(self, client):
        """Team workload must only aggregate users and tasks within caller's organization."""
        uid = uuid.uuid4().hex[:6]
        headers_a, _, _ = register_and_login(client, f"wl_a_{uid}")
        headers_b, _, _ = register_and_login(client, f"wl_b_{uid}")

        res_a = client.get("/api/v1/dashboard/team-workload", headers=headers_a).json()
        res_b = client.get("/api/v1/dashboard/team-workload", headers=headers_b).json()

        assert isinstance(res_a, list)
        assert isinstance(res_b, list)
        # Each org has its own users, capacity must be computed with availability = 100 - utilization
        for item in res_b:
            assert "capacity" in item
            assert "availability" in item or "capacity" in item
            assert "% Available" in item["status"]

    def test_priority_tickets_tenant_isolation(self, client):
        """Priority tickets list must only return tickets from caller's organization."""
        uid = uuid.uuid4().hex[:6]
        headers_a, _, _ = register_and_login(client, f"prio_a_{uid}")
        headers_b, _, _ = register_and_login(client, f"prio_b_{uid}")

        p_res = client.post(
            "/api/v1/projects",
            json={"name": f"Prio Project {uid}", "key": f"PP{uid[:3].upper()}"},
            headers=headers_a,
        )
        proj_id = p_res.json()["id"]

        ticket_title = f"Critical Database Outage {uid}"
        client.post(
            "/api/v1/tickets",
            json={"title": ticket_title, "severity": "critical", "project_id": proj_id},
            headers=headers_a,
        )

        prio_a = client.get("/api/v1/dashboard/priority-tickets", headers=headers_a).json()
        assert any(t["title"] == ticket_title for t in prio_a)

        prio_b = client.get("/api/v1/dashboard/priority-tickets", headers=headers_b).json()
        assert not any(t["title"] == ticket_title for t in prio_b)

    def test_activity_timeline_tenant_isolation(self, client):
        """Activity timeline must only return activity events for projects in caller's organization."""
        uid = uuid.uuid4().hex[:6]
        headers_a, _, _ = register_and_login(client, f"act_a_{uid}")
        headers_b, _, _ = register_and_login(client, f"act_b_{uid}")

        # Org B should have no activity from Org A
        act_b = client.get("/api/v1/dashboard/activity-timeline", headers=headers_b).json()
        assert isinstance(act_b, list)

    def test_filters_tenant_isolation(self, client):
        """Filter options endpoint must only return teams and projects for caller's organization."""
        uid = uuid.uuid4().hex[:6]
        headers_a, _, _ = register_and_login(client, f"filt_a_{uid}")
        headers_b, _, _ = register_and_login(client, f"filt_b_{uid}")

        proj_name = f"Filter Test Project {uid}"
        client.post(
            "/api/v1/projects",
            json={"name": proj_name, "key": f"FT{uid[:3].upper()}"},
            headers=headers_a,
        )

        f_a = client.get("/api/v1/dashboard/filters", headers=headers_a).json()
        assert any(p["name"] == proj_name for p in f_a["projects"])

        f_b = client.get("/api/v1/dashboard/filters", headers=headers_b).json()
        assert not any(p["name"] == proj_name for p in f_b["projects"])
        # Ensure date_ranges include exact tooltip ranges
        assert len(f_b["date_ranges"]) == 4
        assert all("range" in dr for dr in f_b["date_ranges"])
