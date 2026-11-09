import pytest
from fastapi.testclient import TestClient
from backend.app.main import create_application
from backend.app.models import Task, User, Project, Ticket, Discussion, ProjectMember


@pytest.fixture
def client():
    app = create_application()
    return TestClient(app)


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


def test_tasks_endpoints(client):
    # 1. List tasks
    res = client.get("/api/v1/tasks")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    initial_total = data["total"]

    # 2. Get meta enums
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
        "status": "todo",
        "priority": "urgent",
        "task_type": "bug",
        "assigned_to_id": "usr_01",
    }
    res_create = client.post("/api/v1/tasks", json=create_payload)
    assert res_create.status_code == 201
    created_task = res_create.json()
    task_id = created_task["id"]
    assert created_task["title"] == "Integration Test Task"
    assert created_task["assignee_id"] == "usr_01"
    assert created_task["assigned_to_id"] == "usr_01"

    # 4. Get task by ID
    res_get = client.get(f"/api/v1/tasks/{task_id}")
    assert res_get.status_code == 200
    assert res_get.json()["id"] == task_id

    # 5. Patch task status
    res_status = client.patch(f"/api/v1/tasks/{task_id}/status", json={"status": "in_progress"})
    assert res_status.status_code == 200
    assert res_status.json()["status"] == "in_progress"

    # 6. Add comment
    res_comment = client.post(f"/api/v1/tasks/{task_id}/comments", json={"body": "Test comment body"})
    assert res_comment.status_code == 201
    assert res_comment.json()["body"] == "Test comment body"

    # 7. List comments
    res_list_comments = client.get(f"/api/v1/tasks/{task_id}/comments")
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
    )
    assert res_att.status_code == 201
    assert res_att.json()["filename"] == "screenshot.png"

    # 9. List attachments
    res_list_att = client.get(f"/api/v1/tasks/{task_id}/attachments")
    assert res_list_att.status_code == 200
    assert len(res_list_att.json()) >= 1

    # 10. Delete task
    res_del = client.delete(f"/api/v1/tasks/{task_id}")
    assert res_del.status_code == 204


def test_notifications_endpoints(client):
    res = client.get("/api/v1/notifications")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data

    res_unread = client.get("/api/v1/notifications/unread-count")
    assert res_unread.status_code == 200
    assert "unread_count" in res_unread.json()

    res_read_all = client.patch("/api/v1/notifications/read-all")
    assert res_read_all.status_code == 200


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


def test_sla_and_analytics_endpoints(client):
    # 1. SLA metrics
    sla_res = client.get("/api/v1/sla/metrics")
    assert sla_res.status_code == 200
    assert "adherence_rate" in sla_res.json()

    # 2. SLA policies
    pol_res = client.get("/api/v1/sla/policies")
    assert pol_res.status_code == 200
    assert len(pol_res.json()) >= 1

    # 3. Analytics summary
    ana_res = client.get("/api/v1/analytics/summary")
    assert ana_res.status_code == 200
    assert "total_tasks" in ana_res.json()
