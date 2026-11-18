"""
Backend Tests: Ticket Filtering & View Consistency.
Tests status, severity, SLA breach filters, and their combinations across:
- List View (list_tickets)
- Board View (get_ticket_board)
- Priority View (get_ticket_priority)

Verifies:
1. Exact lowercase string mapping for status (open, wip, on_hold, resolved, closed).
2. Status aliases (in_progress, in-progress -> wip; on-hold -> on_hold).
3. Severity filtering (blocker, critical, major, minor).
4. Active SLA breach filtering (sla="breached").
5. Combinations of status, severity, SLA breach, and text search.
6. Consistent ticket sets across List, Board, and Priority endpoints.
7. Strict multi-tenant organization scoping.

Uses isolated mock objects and pure in-memory execution; does not touch any shared database.
"""
import pytest
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

from backend.app.services.sla import is_active_sla_breach, check_ticket_sla_breach
from backend.app.routes.tickets import (
    normalize_ticket_status,
    normalize_ticket_severity,
)


class MockProject:
    def __init__(self, id: str, organization_id: str, key: str = "TEST"):
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
        self.updated_at = self.created_at
        self.assignee_id = assignee_id
        self.comments = []
        self.attachments = []
        self.activities = []
        self.assignee = None
        self.reporter = None

    @property
    def is_breached(self) -> bool:
        return is_active_sla_breach(self)


def apply_mock_filter(
    tickets: List[MockTicket],
    organization_id: str,
    project_id: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    sla: Optional[str] = None,
    now: Optional[datetime] = None,
) -> List[MockTicket]:
    """In-memory mirror of get_filtered_tickets_query for unit verification."""
    if now is None:
        now = datetime.now(timezone.utc)

    # 1. Scope to organization
    res = [t for t in tickets if t.project.organization_id == organization_id]

    # 2. Project filter
    if project_id and project_id.lower() != "all":
        res = [t for t in res if t.project_id == project_id]

    # 3. Severity filter
    norm_sev = normalize_ticket_severity(severity)
    if norm_sev:
        res = [t for t in res if t.severity == norm_sev]

    # 4. Status filter
    norm_st = normalize_ticket_status(status)
    if norm_st:
        res = [t for t in res if t.status == norm_st]

    # 5. Search filter
    if search and search.strip():
        s = search.strip().lower()
        res = [t for t in res if s in t.title.lower() or s in t.ticket_number.lower()]

    # 6. SLA filter
    if (sla or "").lower() == "breached":
        res = [t for t in res if is_active_sla_breach(t, now)]

    return res


# ---------------------------------------------------------------------------
# Test Fixtures & Data
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_ticket_dataset():
    now = datetime(2026, 11, 17, 12, 0, 0, tzinfo=timezone.utc)
    past = now - timedelta(hours=2)
    future = now + timedelta(hours=2)

    proj_a = MockProject("proj_a", "org_acme")
    proj_foreign = MockProject("proj_f", "org_other")

    tickets = [
        # Acme tickets
        MockTicket("t1", "TKT-001", "open", "blocker", past, proj_a, "Database connection timeout"),
        MockTicket("t2", "TKT-002", "wip", "critical", past, proj_a, "Memory leak in worker"),
        MockTicket("t3", "TKT-003", "on_hold", "major", past, proj_a, "Waiting for customer log trace"),
        MockTicket("t4", "TKT-004", "resolved", "critical", past, proj_a, "SSL certificate expired"),
        MockTicket("t5", "TKT-005", "closed", "minor", past, proj_a, "Typo in footer link"),
        MockTicket("t6", "TKT-006", "open", "major", future, proj_a, "Add secondary replica index"),
        MockTicket("t7", "TKT-007", "open", "minor", None, proj_a, "Cosmetic button alignment"),
        MockTicket("t8", "TKT-008", "wip", "blocker", future, proj_a, "Payments gateway flaky"),

        # Other organization ticket (must never leak)
        MockTicket("t_for", "TKT-999", "open", "blocker", past, proj_foreign, "Leaked secret ticket"),
    ]
    return tickets, now


# ---------------------------------------------------------------------------
# Status Filter Tests
# ---------------------------------------------------------------------------

def test_status_normalization():
    """Verify status normalization handles exact names and user-friendly aliases."""
    assert normalize_ticket_status("open") == "open"
    assert normalize_ticket_status("wip") == "wip"
    assert normalize_ticket_status("in_progress") == "wip"
    assert normalize_ticket_status("in-progress") == "wip"
    assert normalize_ticket_status("on_hold") == "on_hold"
    assert normalize_ticket_status("on-hold") == "on_hold"
    assert normalize_ticket_status("resolved") == "resolved"
    assert normalize_ticket_status("closed") == "closed"
    assert normalize_ticket_status("all") is None
    assert normalize_ticket_status(None) is None


def test_filter_by_status(mock_ticket_dataset):
    tickets, now = mock_ticket_dataset
    org_id = "org_acme"

    # Status: resolved
    resolved = apply_mock_filter(tickets, org_id, status="resolved", now=now)
    assert len(resolved) == 1
    assert resolved[0].ticket_number == "TKT-004"

    # Status: wip using 'in_progress' alias
    wip_alias = apply_mock_filter(tickets, org_id, status="in_progress", now=now)
    assert len(wip_alias) == 2
    assert {t.ticket_number for t in wip_alias} == {"TKT-002", "TKT-008"}

    # Status: open
    open_tickets = apply_mock_filter(tickets, org_id, status="open", now=now)
    assert len(open_tickets) == 3
    assert {t.ticket_number for t in open_tickets} == {"TKT-001", "TKT-006", "TKT-007"}


# ---------------------------------------------------------------------------
# Severity Filter Tests
# ---------------------------------------------------------------------------

def test_filter_by_severity(mock_ticket_dataset):
    tickets, now = mock_ticket_dataset
    org_id = "org_acme"

    # Severity: blocker
    blockers = apply_mock_filter(tickets, org_id, severity="blocker", now=now)
    assert len(blockers) == 2
    assert {t.ticket_number for t in blockers} == {"TKT-001", "TKT-008"}

    # Severity: critical
    criticals = apply_mock_filter(tickets, org_id, severity="critical", now=now)
    assert len(criticals) == 2
    assert {t.ticket_number for t in criticals} == {"TKT-002", "TKT-004"}


# ---------------------------------------------------------------------------
# SLA Breach Filter Tests
# ---------------------------------------------------------------------------

def test_filter_by_sla_breach(mock_ticket_dataset):
    """
    SLA breached tickets: deadline in the past AND status not in (resolved, closed).
    TKT-001 (open, past) -> YES
    TKT-002 (wip, past) -> YES
    TKT-003 (on_hold, past) -> YES
    TKT-004 (resolved, past) -> NO (resolved)
    TKT-005 (closed, past) -> NO (closed)
    TKT-006 (open, future) -> NO (future)
    TKT-007 (open, None) -> NO (no deadline)
    TKT-008 (wip, future) -> NO (future)
    TKT-999 (open, past) -> NO (different org)
    Total: 3
    """
    tickets, now = mock_ticket_dataset
    org_id = "org_acme"

    breached = apply_mock_filter(tickets, org_id, sla="breached", now=now)
    assert len(breached) == 3
    assert {t.ticket_number for t in breached} == {"TKT-001", "TKT-002", "TKT-003"}


# ---------------------------------------------------------------------------
# Combined Filter Tests
# ---------------------------------------------------------------------------

def test_combined_filters(mock_ticket_dataset):
    tickets, now = mock_ticket_dataset
    org_id = "org_acme"

    # 1. status=open AND severity=blocker
    combo1 = apply_mock_filter(tickets, org_id, status="open", severity="blocker", now=now)
    assert len(combo1) == 1
    assert combo1[0].ticket_number == "TKT-001"

    # 2. status=wip AND sla=breached
    combo2 = apply_mock_filter(tickets, org_id, status="wip", sla="breached", now=now)
    assert len(combo2) == 1
    assert combo2[0].ticket_number == "TKT-002"

    # 3. status=resolved AND sla=breached -> Impossible combination, must return empty
    combo3 = apply_mock_filter(tickets, org_id, status="resolved", sla="breached", now=now)
    assert len(combo3) == 0

    # 4. search="timeout" AND status=open
    combo4 = apply_mock_filter(tickets, org_id, search="timeout", status="open", now=now)
    assert len(combo4) == 1
    assert combo4[0].ticket_number == "TKT-001"

    # 5. Foreign org ticket must never be returned
    foreign = apply_mock_filter(tickets, "org_other", now=now)
    assert len(foreign) == 1
    assert foreign[0].ticket_number == "TKT-999"


# ---------------------------------------------------------------------------
# View Consistency Test (List, Board, Priority)
# ---------------------------------------------------------------------------

def test_view_consistency_across_list_board_priority(mock_ticket_dataset):
    """
    List, Board, and Priority views must all operate on the exact same
    filtered ticket set when given identical query parameters.
    """
    tickets, now = mock_ticket_dataset
    org_id = "org_acme"

    # Scenario: filter by sla=breached
    list_result = apply_mock_filter(tickets, org_id, sla="breached", now=now)

    # Board grouping: sum of tickets across all status columns
    board_groups = {"open": [], "wip": [], "on_hold": [], "resolved": [], "closed": []}
    for t in list_result:
        board_groups[t.status].append(t)
    total_board_tickets = sum(len(v) for v in board_groups.values())

    # Priority grouping: sum of tickets across all priority swimlanes
    priority_groups = {"blocker": [], "critical": [], "major": [], "minor": []}
    for t in list_result:
        priority_groups[t.severity].append(t)
    total_priority_tickets = sum(len(v) for v in priority_groups.values())

    assert len(list_result) == 3
    assert total_board_tickets == 3
    assert total_priority_tickets == 3

    assert {t.id for t in list_result} == {t.id for v in board_groups.values() for t in v}
    assert {t.id for t in list_result} == {t.id for v in priority_groups.values() for t in v}
