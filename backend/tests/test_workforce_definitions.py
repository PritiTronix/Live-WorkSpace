"""
Unit Tests for Workforce Domain Service Definitions.
====================================================
Tests:
1. Active account state (user.is_active and active membership status).
2. Presence evaluation:
   - live WebSocket connection -> online
   - activity within 2 minutes -> online
   - user-set status 'away' / 'busy' strictly overrides online
   - no connection and no recent activity -> offline
3. Availability evaluation:
   - online -> available
   - offline-but-not-away -> available
   - away, busy, on-leave -> not available (reduces available count)
   - inactive account -> not available
4. Capacity & workload calculation:
   - 0 active items -> capacity is None, status is "No assigned work", neutral color (NEVER 100% Available!)
   - >0 active items -> computed against per-member capacity (available_members * 5)
   - threshold coloring
5. Department normalization:
   - 'Engineering', 'engineering', and ' Engineering ' resolve to 'engineering' key and 'Engineering' label.
"""

import pytest
from datetime import datetime, timezone, timedelta
from typing import Optional

from backend.app.enums import PresenceStatus, AccountState
from backend.app.services.workforce import (
    compute_user_presence,
    is_member_available,
    compute_team_capacity,
    normalize_department,
    PER_MEMBER_CAPACITY,
    DEFAULT_CAPACITY_THRESHOLD,
)


class MockUser:
    def __init__(
        self,
        id: str = "usr_test1",
        email: str = "user@example.com",
        full_name: str = "Test User",
        is_active: bool = True,
        last_active_at: Optional[datetime] = None,
        department: Optional[str] = "Engineering",
    ):
        self.id = id
        self.email = email
        self.full_name = full_name
        self.is_active = is_active
        self.last_active_at = last_active_at
        self.department = department


def test_presence_live_websocket():
    now = datetime.now(timezone.utc)
    user = MockUser(last_active_at=None)
    # Live WebSocket connection -> online
    presence = compute_user_presence(user, has_live_ws=True, now=now, user_set_status=None)
    assert presence == PresenceStatus.online


def test_presence_recent_activity_within_two_minutes():
    now = datetime.now(timezone.utc)
    # Active 60s ago -> within 2 minutes -> online even without live WS
    user = MockUser(last_active_at=now - timedelta(seconds=60))
    presence = compute_user_presence(user, has_live_ws=False, now=now, user_set_status=None)
    assert presence == PresenceStatus.online


def test_presence_activity_older_than_two_minutes_is_offline():
    now = datetime.now(timezone.utc)
    # Active 150s ago -> older than 2 minutes -> offline
    user = MockUser(last_active_at=now - timedelta(seconds=150))
    presence = compute_user_presence(user, has_live_ws=False, now=now, user_set_status=None)
    assert presence == PresenceStatus.offline


def test_presence_user_set_status_overrides_online():
    now = datetime.now(timezone.utc)
    user = MockUser(last_active_at=now)
    # User has live WS and recent activity, but explicitly set status to 'away'
    presence_away = compute_user_presence(user, has_live_ws=True, now=now, user_set_status="away")
    assert presence_away == PresenceStatus.away

    # Explicitly set status to 'busy'
    presence_busy = compute_user_presence(user, has_live_ws=True, now=now, user_set_status="busy")
    assert presence_busy == PresenceStatus.busy


def test_availability_rules():
    # 1. Active account + Online -> Available
    assert is_member_available(is_active_account=True, presence=PresenceStatus.online) is True

    # 2. Active account + Offline-but-not-away -> Available
    assert is_member_available(is_active_account=True, presence=PresenceStatus.offline, user_set_status=None) is True

    # 3. Active account + Away -> NOT Available (reduces available count)
    assert is_member_available(is_active_account=True, presence=PresenceStatus.away) is False
    assert is_member_available(is_active_account=True, presence=PresenceStatus.offline, user_set_status="away") is False

    # 4. Active account + Busy -> NOT Available
    assert is_member_available(is_active_account=True, presence=PresenceStatus.busy) is False
    assert is_member_available(is_active_account=True, presence=PresenceStatus.offline, user_set_status="busy") is False

    # 5. On leave -> NOT Available
    assert is_member_available(is_active_account=True, presence=PresenceStatus.online, on_leave=True) is False

    # 6. Inactive account -> NOT Available under any presence
    assert is_member_available(is_active_account=False, presence=PresenceStatus.online) is False


def test_team_capacity_zero_items_never_100_percent():
    # When active_items == 0, must return capacity=None and status="No assigned work"
    cap = compute_team_capacity(active_items=0, available_members_count=2, total_members_count=2)
    assert cap["capacity"] is None
    assert cap["availability"] is None
    assert cap["status"] == "No assigned work"
    assert cap["color"] != "bg-status-resolved"  # Never green for no data!


def test_team_capacity_with_assigned_work():
    # 2 available members -> baseline capacity 10 items
    # 5 active items -> utilization 50%, availability 50%
    cap = compute_team_capacity(active_items=5, available_members_count=2, total_members_count=2)
    assert cap["capacity"] == 50
    assert cap["availability"] == 50
    assert cap["utilization"] == 50
    assert "Available" in cap["status"]

    # 9 active items -> utilization 90% (>= 80% threshold) -> High Load
    cap_high = compute_team_capacity(active_items=9, available_members_count=2, total_members_count=2)
    assert cap_high["utilization"] == 90
    assert cap_high["availability"] == 10
    assert cap_high["is_overloaded"] is True
    assert "High Load" in cap_high["status"]
    assert cap_high["color"] == "bg-severity-critical"


def test_department_normalization():
    key1, label1 = normalize_department("Engineering")
    key2, label2 = normalize_department("engineering")
    key3, label3 = normalize_department("  Engineering  ")

    assert key1 == key2 == key3 == "engineering"
    assert label1 == label2 == label3 == "Engineering"

    key_p, label_p = normalize_department("Product & Design")
    assert key_p == "product & design"
    assert label_p == "Product & Design"
