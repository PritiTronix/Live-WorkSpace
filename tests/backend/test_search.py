"""
Tests for Spotlight Global Search endpoint and organization isolation.
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


@pytest.fixture
def auth_headers(client):
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "bhaveshburad729@gmail.com", "password": "bhavesh729"},
    )
    assert res.status_code == 200, f"Login failed: {res.text}"
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_unauthenticated_search_blocked(client):
    """Search endpoints must reject unauthenticated requests with 401."""
    res = client.get("/api/v1/search?q=test")
    assert res.status_code == 401

    res_recent = client.get("/api/v1/search/recent")
    assert res_recent.status_code == 401


def test_search_validation_errors(client, auth_headers):
    """Query length must be >= 2 characters, and type must be valid."""
    # 1. Query too short (1 char)
    res_short = client.get("/api/v1/search?q=a", headers=auth_headers)
    assert res_short.status_code == 400
    err_data = res_short.json()
    assert "error" in err_data
    assert err_data["error"]["code"] == "QUERY_TOO_SHORT"

    # 2. Query empty
    res_empty = client.get("/api/v1/search?q=", headers=auth_headers)
    assert res_empty.status_code == 400
    assert res_empty.json()["error"]["code"] == "QUERY_TOO_SHORT"

    # 3. Invalid search type
    res_inv = client.get("/api/v1/search?q=test&type=invalid_type", headers=auth_headers)
    assert res_inv.status_code == 400
    assert res_inv.json()["error"]["code"] == "INVALID_TYPE"


def test_search_real_entities_and_counts(client, auth_headers):
    """Search returns real entities from DB and computed category counts."""
    res = client.get("/api/v1/search?q=Platform", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()

    assert "counts" in data
    assert "total_matches" in data
    assert "projects" in data
    assert "tickets" in data
    assert "tasks" in data
    assert "employees" in data
    assert "comments" in data

    # Real project "Platform Revamp 2.0" must appear
    project_titles = [p["title"] for p in data["projects"]]
    assert any("Platform" in title for title in project_titles)

    # Verify category filter works
    res_proj_only = client.get("/api/v1/search?q=Platform&type=projects", headers=auth_headers)
    assert res_proj_only.status_code == 200
    data_proj = res_proj_only.json()
    assert len(data_proj["projects"]) > 0
    assert len(data_proj["tickets"]) == 0  # Filtered out
    assert len(data_proj["tasks"]) == 0

    # Counts must still reflect total DB matches across categories
    assert data_proj["counts"]["projects"] >= 1


def test_search_wildcard_escaping(client, auth_headers):
    """Wildcard symbols % and _ must be escaped and not match arbitrary content."""
    res = client.get("/api/v1/search?q=%25%25", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    # Unless there is a project with %% in title, should return 0 matches
    assert data["total_matches"] == 0


def test_organization_isolation(client, auth_headers):
    """
    CRITICAL: A user from Organization B must NEVER see results from Organization A.
    """
    # 1. Register a new user in Organization B
    uid = uuid.uuid4().hex[:6]
    email_b = f"user_b_{uid}@orgb.io"
    org_name_b = f"Isolated Org B {uid}"
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "User B",
            "email": email_b,
            "password": "Password123!",
            "organization_name": org_name_b,
        },
    )
    assert reg_res.status_code == 201

    login_b = client.post(
        "/api/v1/auth/login",
        json={"email": email_b, "password": "Password123!"},
    )
    assert login_b.status_code == 200
    token_b = login_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 2. User B searches for "Platform" (which exists in Org A)
    search_b = client.get("/api/v1/search?q=Platform", headers=headers_b)
    assert search_b.status_code == 200
    data_b = search_b.json()
    assert data_b["total_matches"] == 0
    assert len(data_b["projects"]) == 0
    assert len(data_b["tickets"]) == 0
    assert len(data_b["tasks"]) == 0
    assert len(data_b["employees"]) == 0

    # 3. User B creates a project in Org B
    unique_b_title = f"Secret Project {uid}"
    create_proj_res = client.post(
        "/api/v1/projects",
        json={"name": unique_b_title, "key": f"SEC{uid[:3]}".upper()},
        headers=headers_b,
    )
    assert create_proj_res.status_code == 201

    # 4. User B searches for their own project -> found!
    search_b_own = client.get(f"/api/v1/search?q={unique_b_title}", headers=headers_b)
    assert search_b_own.status_code == 200
    data_b_own = search_b_own.json()
    assert data_b_own["counts"]["projects"] == 1
    assert data_b_own["projects"][0]["name"] == unique_b_title

    # 5. User A searches for User B's project -> NOT found! (Isolation verified)
    search_a_for_b = client.get(f"/api/v1/search?q={unique_b_title}", headers=auth_headers)
    assert search_a_for_b.status_code == 200
    assert search_a_for_b.json()["total_matches"] == 0


def test_recent_searches_per_user(client, auth_headers):
    """Recent searches must be scoped per user and support clear/remove."""
    # 1. User A starts or clears recent searches
    client.delete("/api/v1/search/recent", headers=auth_headers)
    res_init = client.get("/api/v1/search/recent", headers=auth_headers)
    assert res_init.status_code == 200
    assert res_init.json() == []

    # 2. User A adds a term
    add_res = client.post(
        "/api/v1/search/recent",
        json={"query": "database migration"},
        headers=auth_headers,
    )
    assert add_res.status_code == 201

    res_after = client.get("/api/v1/search/recent", headers=auth_headers)
    assert res_after.status_code == 200
    assert "database migration" in res_after.json()

    # 3. Create User B and verify User B does NOT see User A's recent searches
    uid = uuid.uuid4().hex[:6]
    email_b = f"recent_b_{uid}@orgb.io"
    client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Recent B",
            "email": email_b,
            "password": "Password123!",
            "organization_name": f"Org Recent B {uid}",
        },
    )
    login_b = client.post(
        "/api/v1/auth/login",
        json={"email": email_b, "password": "Password123!"},
    )
    headers_b = {"Authorization": f"Bearer {login_b.json()['access_token']}"}

    res_b = client.get("/api/v1/search/recent", headers=headers_b)
    assert res_b.status_code == 200
    assert "database migration" not in res_b.json()

    # 4. User A deletes the specific term
    del_res = client.delete("/api/v1/search/recent?query=database migration", headers=auth_headers)
    assert del_res.status_code == 200

    res_empty = client.get("/api/v1/search/recent", headers=auth_headers)
    assert "database migration" not in res_empty.json()
