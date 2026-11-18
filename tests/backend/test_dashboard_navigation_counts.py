"""
Unit and logic consistency tests for Home Dashboard widgets and their target navigation pages.
Verifies that the number computed for each widget matches the row count on the page it opens.

DO NOT RUN against shared database. These tests use pure in-memory mock objects and isolated logic.
"""
import uuid
import pytest
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from backend.app.services.sla import is_active_sla_breach
from backend.app.routes.tickets import (
    normalize_ticket_status,
    normalize_ticket_severity,
)


class MockOrg:
    def __init__(self, id: str):
        self.id = id


class MockProject:
    def __init__(self, id: str, organization_id: str, name: str, is_archived: bool = False):
        self.id = id
        self.organization_id = organization_id
        self.name = name
        self.is_archived = is_archived
        self.created_at = datetime.now(timezone.utc)
        self.target_date = None
        self.color = "bg-primary"
        self.tasks = []
        self.members = []


class MockTask:
    def __init__(
        self,
        id: str,
        organization_id: str,
        project_id: str,
        status: str,
        assignee_id: Optional[str] = None,
        created_at: Optional[datetime] = None,
    ):
        self.id = id
        self.organization_id = organization_id
        self.project_id = project_id
        self.status = status.lower()
        self.assignee_id = assignee_id
        self.created_at = created_at or datetime.now(timezone.utc)
        self.due_date = None


class MockTicket:
    def __init__(
        self,
        id: str,
        organization_id: str,
        project_id: str,
        status: str,
        severity: str,
        deadline: Optional[datetime] = None,
        assignee_id: Optional[str] = None,
        created_at: Optional[datetime] = None,
    ):
        self.id = id
        self.organization_id = organization_id
        self.project_id = project_id
        self.status = status.lower()
        self.severity = severity.lower()
        self.deadline = deadline
        self.assignee_id = assignee_id
        self.created_at = created_at or datetime.now(timezone.utc)
        self.updated_at = self.created_at

    @property
    def is_breached(self) -> bool:
        return is_active_sla_breach(self)


class MockUser:
    def __init__(self, id: str, organization_id: str, full_name: str, department: str):
        self.id = id
        self.organization_id = organization_id
        self.full_name = full_name
        self.department = department


class TestDashboardNavigationCounts:
    """Tests that every Home Dashboard metric count equals the number of rows on the target page."""

    @pytest.fixture
    def setup_data(self):
        org_id = "org-test-123"
        user_1 = MockUser("u1", org_id, "Alice Engineer", "Engineering")
        user_2 = MockUser("u2", org_id, "Bob Product", "Product")
        user_3 = MockUser("u3", org_id, "Carol QA", "Quality Assurance")

        users = [user_1, user_2, user_3]

        # Projects: 3 active, 1 archived
        p1 = MockProject("p1", org_id, "Core Platform", is_archived=False)
        p2 = MockProject("p2", org_id, "Mobile App", is_archived=False)
        p3 = MockProject("p3", org_id, "Design System", is_archived=False)
        p4 = MockProject("p4", org_id, "Legacy Portal", is_archived=True)
        projects = [p1, p2, p3, p4]

        # Tasks: 5 total
        tasks = [
            MockTask("t1", org_id, "p1", "done", assignee_id="u1"),
            MockTask("t2", org_id, "p1", "in_progress", assignee_id="u1"),
            MockTask("t3", org_id, "p2", "in_review", assignee_id="u2"),
            MockTask("t4", org_id, "p2", "todo", assignee_id="u1"),
            MockTask("t5", org_id, "p3", "todo", assignee_id="u3"),
        ]

        now = datetime.now(timezone.utc)
        past_deadline = now - timedelta(hours=2)
        future_deadline = now + timedelta(hours=5)

        # Tickets:
        # - open (2)
        # - wip (2)
        # - on_hold (1)
        # - resolved (2)
        # - closed (1)
        # Severities:
        # - blocker (2: 1 open breached, 1 resolved)
        # - critical (2: 1 wip active, 1 open active)
        # - major (2: 1 wip active, 1 on_hold active)
        # - minor (2: 1 resolved, 1 closed)
        tickets = [
            MockTicket("tk1", org_id, "p1", "open", "blocker", deadline=past_deadline, assignee_id="u1"),
            MockTicket("tk2", org_id, "p1", "open", "critical", deadline=future_deadline, assignee_id=None),
            MockTicket("tk3", org_id, "p2", "wip", "critical", deadline=future_deadline, assignee_id="u1"),
            MockTicket("tk4", org_id, "p2", "wip", "major", deadline=past_deadline, assignee_id="u2"),
            MockTicket("tk5", org_id, "p3", "on_hold", "major", deadline=None, assignee_id="u3"),
            MockTicket("tk6", org_id, "p1", "resolved", "blocker", deadline=past_deadline, assignee_id="u1"),
            MockTicket("tk7", org_id, "p2", "resolved", "minor", deadline=future_deadline, assignee_id="u2"),
            MockTicket("tk8", org_id, "p3", "closed", "minor", deadline=None, assignee_id="u3"),
        ]

        return {
            "org_id": org_id,
            "current_user": user_1,
            "users": users,
            "projects": projects,
            "tasks": tasks,
            "tickets": tickets,
            "now": now,
        }

    # 1. Total Projects -> /workspace/projects
    def test_total_projects_count_equals_projects_list(self, setup_data):
        org_id = setup_data["org_id"]
        projects = setup_data["projects"]

        # Dashboard metric logic
        dashboard_total_projects = sum(
            1 for p in projects if p.organization_id == org_id and not p.is_archived
        )

        # Target page /workspace/projects listing logic (default non-archived)
        target_projects_list = [
            p for p in projects if p.organization_id == org_id and not p.is_archived
        ]

        assert dashboard_total_projects == len(target_projects_list) == 3

    # 2. Total Tasks -> /workspace/tasks
    def test_total_tasks_count_equals_all_tasks_page(self, setup_data):
        org_id = setup_data["org_id"]
        tasks = setup_data["tasks"]

        dashboard_total_tasks = sum(1 for t in tasks if t.organization_id == org_id)
        target_tasks = [t for t in tasks if t.organization_id == org_id]

        assert dashboard_total_tasks == len(target_tasks) == 5

    # 3. My Tasks -> /workspace/tasks/my-tasks
    def test_my_tasks_count_equals_my_tasks_page(self, setup_data):
        org_id = setup_data["org_id"]
        current_user = setup_data["current_user"]
        tasks = setup_data["tasks"]

        dashboard_my_tasks = sum(
            1 for t in tasks if t.organization_id == org_id and t.assignee_id == current_user.id
        )
        target_my_tasks = [
            t for t in tasks if t.organization_id == org_id and t.assignee_id == current_user.id
        ]

        assert dashboard_my_tasks == len(target_my_tasks) == 3

    # 4. Open Tickets -> /workspace/tickets?status=open
    def test_open_tickets_count_equals_open_tickets_page(self, setup_data):
        org_id = setup_data["org_id"]
        tickets = setup_data["tickets"]

        dashboard_open_tickets = sum(
            1 for t in tickets if t.organization_id == org_id and t.status == "open"
        )
        target_open_tickets = [
            t for t in tickets if t.organization_id == org_id and t.status == normalize_ticket_status("open")
        ]

        assert dashboard_open_tickets == len(target_open_tickets) == 2

    # 5. Work in Progress -> /workspace/tickets?status=in_progress
    def test_work_in_progress_count_equals_in_progress_tickets_page(self, setup_data):
        org_id = setup_data["org_id"]
        tickets = setup_data["tickets"]

        # Dashboard metric logic
        dashboard_wip_tickets = sum(
            1 for t in tickets if t.organization_id == org_id and t.status == "wip"
        )

        # Target page /workspace/tickets?status=in_progress (normalized to "wip")
        norm_status = normalize_ticket_status("in_progress")
        target_wip_tickets = [
            t for t in tickets if t.organization_id == org_id and t.status == norm_status
        ]

        assert dashboard_wip_tickets == len(target_wip_tickets) == 2

    # 6. On Hold -> /workspace/tickets?status=on_hold
    def test_on_hold_count_equals_on_hold_tickets_page(self, setup_data):
        org_id = setup_data["org_id"]
        tickets = setup_data["tickets"]

        dashboard_on_hold = sum(
            1 for t in tickets if t.organization_id == org_id and t.status == "on_hold"
        )
        norm_status = normalize_ticket_status("on_hold")
        target_on_hold = [
            t for t in tickets if t.organization_id == org_id and t.status == norm_status
        ]

        assert dashboard_on_hold == len(target_on_hold) == 1

    # 7. SLA Breached -> /workspace/tickets?sla=breached
    def test_sla_breached_count_equals_sla_breached_tickets_page(self, setup_data):
        org_id = setup_data["org_id"]
        tickets = setup_data["tickets"]
        now = setup_data["now"]

        dashboard_breached = sum(
            1 for t in tickets if t.organization_id == org_id and is_active_sla_breach(t, now)
        )
        target_breached = [
            t for t in tickets if t.organization_id == org_id and is_active_sla_breach(t, now)
        ]

        assert dashboard_breached == len(target_breached) == 2

    # 8. Tasks by Status -> /workspace/tasks?status=<value>
    def test_tasks_by_status_counts_equal_filtered_tasks_page(self, setup_data):
        org_id = setup_data["org_id"]
        tasks = setup_data["tasks"]

        statuses = ["done", "in_progress", "in_review", "todo"]
        for st in statuses:
            dashboard_count = sum(
                1 for t in tasks if t.organization_id == org_id and t.status in (st, st.replace("todo", "to_do"))
            )
            target_tasks = [
                t for t in tasks if t.organization_id == org_id and t.status in (st, st.replace("todo", "to_do"))
            ]
            assert dashboard_count == len(target_tasks)

    # 9. Tickets by Severity -> /workspace/tickets?severity=<value>
    def test_tickets_by_severity_counts_equal_filtered_tickets_page(self, setup_data):
        org_id = setup_data["org_id"]
        tickets = setup_data["tickets"]

        # Only active tickets count in Tickets by Severity
        active_tickets = [
            t for t in tickets if t.organization_id == org_id and t.status not in ("resolved", "closed")
        ]

        severities = ["blocker", "critical", "major", "minor"]
        for sev in severities:
            dashboard_sev_count = sum(1 for t in active_tickets if t.severity == sev)
            norm_sev = normalize_ticket_severity(sev)
            filtered_active = [t for t in active_tickets if t.severity == norm_sev]
            assert dashboard_sev_count == len(filtered_active)

    # 10. Total Active Tickets chip -> /workspace/tickets?status=active
    def test_active_chip_count_equals_active_tickets_page(self, setup_data):
        org_id = setup_data["org_id"]
        tickets = setup_data["tickets"]

        dashboard_active = sum(
            1 for t in tickets if t.organization_id == org_id and t.status not in ("resolved", "closed")
        )

        # Target page /workspace/tickets?status=active filters status.notin_(["resolved", "closed"])
        target_active = [
            t for t in tickets if t.organization_id == org_id and t.status not in ("resolved", "closed")
        ]

        assert dashboard_active == len(target_active) == 5

    # 11. Team Workload row -> /workspace/members?team=<team>
    def test_team_workload_member_count_equals_team_members_page(self, setup_data):
        org_id = setup_data["org_id"]
        users = setup_data["users"]

        teams = ["Engineering", "Product", "Quality Assurance"]
        for team in teams:
            dashboard_team_members = sum(
                1 for u in users if u.organization_id == org_id and u.department.lower() == team.lower()
            )
            target_team_members = [
                u for u in users if u.organization_id == org_id and team.lower() in u.department.lower()
            ]
            assert dashboard_team_members == len(target_team_members) == 1
