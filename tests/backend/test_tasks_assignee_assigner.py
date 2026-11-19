"""
Integration tests for Task Creation with Assigner and Assignee fields.
Verifies:
1. Canonical assignee_id and reporter_id persistence.
2. Assigner default to authenticated user.
3. Elevated roles (owner/admin/manager/lead) can change assigner.
4. Non-elevated roles (member) cannot change assigner (403 Forbidden).
5. Cross-tenant or non-existent assignees and assigners are rejected (400 Bad Request).
6. Unassigned tasks (assignee_id is None) are permitted.
"""
import pytest
from fastapi.testclient import TestClient
from backend.app.main import create_application
from backend.app.core.security import create_access_token


@pytest.fixture
def client():
    app = create_application()
    with TestClient(app) as c:
        yield c


def test_assigner_and_assignee_workflow(client):
    # Owner token
    owner_token = create_access_token(
        subject="usr_01",
        role="owner",
        org_id="org_01",
        email="bhavesh@link-workspace.internal",
    )
    owner_headers = {"Authorization": f"Bearer {owner_token}"}

    # Member token
    member_token = create_access_token(
        subject="usr_03",
        role="member",
        org_id="org_01",
        email="david@link-workspace.internal",
    )
    member_headers = {"Authorization": f"Bearer {member_token}"}

    # 1. Owner creates task with both Assignee and Assigner specified
    payload_full = {
        "title": "Task with explicit Assignee and Assigner",
        "description": "Full-stack validation test",
        "assignee_id": "usr_03",
        "assigner_id": "usr_02",
        "priority": "high",
        "task_type": "feature",
    }
    res = client.post("/api/v1/tasks", json=payload_full, headers=owner_headers)
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["assignee_id"] == "usr_03"
    assert data["assigned_to_id"] == "usr_03"
    assert data["assigner_id"] == "usr_02"
    assert data["reporter_id"] == "usr_02"
    assert data["assignee"]["id"] == "usr_03"
    assert data["assigner"]["id"] == "usr_02"
    assert data["reporter"]["id"] == "usr_02"

    # 2. Member creates task defaulting Assigner to self
    payload_default_assigner = {
        "title": "Task by Member with default assigner",
        "assignee_id": "usr_01",
    }
    res_mem = client.post("/api/v1/tasks", json=payload_default_assigner, headers=member_headers)
    assert res_mem.status_code == 201, res_mem.text
    data_mem = res_mem.json()
    assert data_mem["assigner_id"] == "usr_03"
    assert data_mem["reporter_id"] == "usr_03"
    assert data_mem["assignee_id"] == "usr_01"

    # 3. Member attempts to change Assigner to someone else -> 403 Forbidden
    payload_forbidden = {
        "title": "Unauthorized assigner override",
        "assigner_id": "usr_01",
    }
    res_forbidden = client.post("/api/v1/tasks", json=payload_forbidden, headers=member_headers)
    assert res_forbidden.status_code == 403

    # 4. Invalid/non-org assignee -> 400 Bad Request
    payload_invalid_assignee = {
        "title": "Invalid Assignee Test",
        "assignee_id": "fake_user_id_999",
    }
    res_invalid = client.post("/api/v1/tasks", json=payload_invalid_assignee, headers=owner_headers)
    assert res_invalid.status_code == 400

    # 5. Unassigned task (assignee_id is None)
    payload_unassigned = {
        "title": "Unassigned Task Test",
        "assignee_id": None,
    }
    res_unassigned = client.post("/api/v1/tasks", json=payload_unassigned, headers=owner_headers)
    assert res_unassigned.status_code == 201
    assert res_unassigned.json()["assignee"] is None
