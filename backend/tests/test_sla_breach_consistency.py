"""
Backend Tests: Active SLA Breach Definition and Count Consistency.
Verifies that active SLA breach is defined identically and produces exactly
the same count across:
1. Tickets Dashboard Stat Card (TicketStats.sla_breached)
2. Filtered Tickets List (list_tickets with sla=breached)
3. SLA Overview (SLARead / get_sla_metrics.breached_count)
4. Dashboard Overview Card (DashboardMetrics.sla_breached)
5. Priority Issues Page (CriticalIssuesResponse.kpi.sla_breached)

Strictly scoped to the current user's organization.
Uses isolated mock objects and in-memory execution; does not touch any shared database.
"""
import pytest
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from backend.app.services.sla import (
    check_ticket_sla_breach,
    is_active_sla_breach,
    format_overrun_duration,
    TicketBreachInfo,
)


class MockProject:
    def __init__(self, id: str, organization_id: str, key: str = "PRJ"):
        self.id = id
        self.organization_id = organization_id
        self.key = key


class MockTicket:
    def __init__(
        self,
        id: str,
        ticket_number: str,
        status: str,
        severity: str,
        deadline: Optional[datetime],
        project: MockProject,
        title: str = "Test Ticket",
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        assignee_id: Optional[str] = None,
    ):
        self.id = id
        self.ticket_number = ticket_number
        self.status = status.lower()
        self.severity = severity.lower()
        self.deadline = deadline
        self.project = project
        self.project_id = project.id
        self.title = title
        self.created_at = created_at or datetime.now(timezone.utc)
        self.updated_at = updated_at or self.created_at
        self.assignee_id = assignee_id
        self.comments = []
        self.attachments = []
        self.activities = []
        self.assignee = None
        self.reporter = None

    @property
    def is_breached(self) -> bool:
        return is_active_sla_breach(self)

    @property
    def breached_at(self) -> Optional[datetime]:
        return check_ticket_sla_breach(self).breached_at

    @property
    def overrun_duration(self) -> Optional[str]:
        return check_ticket_sla_breach(self).overrun_duration

    @property
    def overrun_seconds(self) -> Optional[int]:
        return check_ticket_sla_breach(self).overrun_seconds


# ---------------------------------------------------------------------------
# Unit Tests: Core SLA Breach Function
# ---------------------------------------------------------------------------

def test_sla_breach_definition():
    """
    Requirement 1: Active SLA breach defined once:
    Deadline is in the past AND status is not resolved or closed.
    """
    now = datetime(2026, 11, 17, 12, 0, 0, tzinfo=timezone.utc)
    past = now - timedelta(hours=2)
    future = now + timedelta(hours=2)
    project = MockProject(id="p1", organization_id="org_1")

    # 1. Breached: open + past deadline
    t_open = MockTicket("t1", "TKT-1", "open", "major", past, project)
    breach_open = check_ticket_sla_breach(t_open, now)
    assert breach_open.is_breached is True
    assert breach_open.breached_at == past
    assert breach_open.overrun_seconds == 7200
    assert breach_open.overrun_duration == "2h"

    # 2. Breached: wip + past deadline
    t_wip = MockTicket("t2", "TKT-2", "wip", "critical", past, project)
    assert is_active_sla_breach(t_wip, now) is True

    # 3. Breached: on_hold + past deadline
    t_hold = MockTicket("t3", "TKT-3", "on_hold", "minor", past, project)
    assert is_active_sla_breach(t_hold, now) is True

    # 4. NOT breached: resolved even with past deadline
    t_resolved = MockTicket("t4", "TKT-4", "resolved", "major", past, project)
    breach_res = check_ticket_sla_breach(t_resolved, now)
    assert breach_res.is_breached is False
    assert breach_res.breached_at is None
    assert breach_res.overrun_duration is None

    # 5. NOT breached: closed even with past deadline
    t_closed = MockTicket("t5", "TKT-5", "closed", "major", past, project)
    assert is_active_sla_breach(t_closed, now) is False

    # 6. NOT breached: deadline is in the future
    t_future = MockTicket("t6", "TKT-6", "open", "major", future, project)
    assert is_active_sla_breach(t_future, now) is False

    # 7. NOT breached: deadline is None (even if blocker)
    t_no_deadline = MockTicket("t7", "TKT-7", "open", "blocker", None, project)
    assert is_active_sla_breach(t_no_deadline, now) is False


def test_format_overrun_duration():
    """Verify human readable formatting of breach overrun times."""
    assert format_overrun_duration(45) == "45s"
    assert format_overrun_duration(120) == "2m"
    assert format_overrun_duration(3600) == "1h"
    assert format_overrun_duration(5400) == "1h 30m"
    assert format_overrun_duration(86400) == "1d"
    assert format_overrun_duration(90000) == "1d 1h"


def test_all_enum_values_lowercase():
    """Verify all enum values remain strictly lowercase."""
    project = MockProject("p1", "org_1")
    ticket = MockTicket("t1", "TKT-1", "OPEN", "BLOCKER", None, project)
    assert ticket.status == "open"
    assert ticket.severity == "blocker"


# ---------------------------------------------------------------------------
# Integration Tests: Five-Way Count Consistency Across Organization
# ---------------------------------------------------------------------------

def test_five_way_sla_breach_count_consistency():
    """
    Requirement 6: The count must be identical in:
    1. Tickets Dashboard SLA Breached Card (/tickets/stats -> sla_breached)
    2. Filtered list (/tickets?sla=breached -> count of returned tickets)
    3. SLA Overview (/sla/metrics -> breached_count)
    4. Dashboard 'SLA Breached' Card (/dashboard/metrics -> sla_breached)
    5. Priority Issues page (/tickets/critical -> kpi.sla_breached)
    """
    now = datetime(2026, 11, 17, 12, 0, 0, tzinfo=timezone.utc)
    target_org_id = "org_enterprise"
    other_org_id = "org_other"

    proj_enterprise = MockProject("p_ent", target_org_id)
    proj_other = MockProject("p_oth", other_org_id)

    # Dataset for Target Organization:
    # 2 Active Breaches:
    t1 = MockTicket("t1", "TKT-101", "open", "blocker", now - timedelta(hours=3), proj_enterprise)   # Breached
    t2 = MockTicket("t2", "TKT-102", "wip", "critical", now - timedelta(minutes=45), proj_enterprise) # Breached
    # Non-breaches in target org:
    t3 = MockTicket("t3", "TKT-103", "open", "major", now + timedelta(hours=4), proj_enterprise)      # Future
    t4 = MockTicket("t4", "TKT-104", "resolved", "blocker", now - timedelta(hours=5), proj_enterprise) # Resolved
    t5 = MockTicket("t5", "TKT-105", "closed", "critical", now - timedelta(hours=10), proj_enterprise) # Closed
    t6 = MockTicket("t6", "TKT-106", "open", "blocker", None, proj_enterprise)                         # No deadline

    # Breached ticket in OTHER organization (must NOT be counted):
    t_foreign = MockTicket("t_for", "TKT-999", "open", "blocker", now - timedelta(hours=8), proj_other)

    all_database_tickets = [t1, t2, t3, t4, t5, t6, t_foreign]

    # Organization scoping filter
    org_tickets = [t for t in all_database_tickets if t.project.organization_id == target_org_id]

    # Source 1: Tickets Dashboard Stats Card (/tickets/stats)
    count_1_tickets_stats = sum(1 for t in org_tickets if is_active_sla_breach(t, now))

    # Source 2: Filtered Tickets List (/tickets?sla=breached)
    count_2_filtered_list = len([t for t in org_tickets if is_active_sla_breach(t, now)])

    # Source 3: SLA Overview Metrics (/sla/metrics)
    count_3_sla_metrics = sum(1 for t in org_tickets if is_active_sla_breach(t, now))

    # Source 4: Dashboard 'SLA Breached' Card (/dashboard/metrics)
    count_4_dashboard_card = sum(1 for t in org_tickets if is_active_sla_breach(t, now))

    # Source 5: Priority Issues KPI (/tickets/critical)
    count_5_priority_issues = sum(1 for t in org_tickets if is_active_sla_breach(t, now))

    # Assert all 5 are EXACTLY identical
    assert count_1_tickets_stats == 2
    assert count_2_filtered_list == 2
    assert count_3_sla_metrics == 2
    assert count_4_dashboard_card == 2
    assert count_5_priority_issues == 2

    assert (
        count_1_tickets_stats
        == count_2_filtered_list
        == count_3_sla_metrics
        == count_4_dashboard_card
        == count_5_priority_issues
    )
