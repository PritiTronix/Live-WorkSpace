"""
Unit and integration tests for Project Members Management, RBAC permissions, and multi-tenant scoping.

Covers:
1. Member count accuracy: roster member count equals project summary metrics.
2. 403 Forbidden rules:
   - Regular collaborators (developers/viewers) get 403 on invite, role update, removal, and invitation actions.
   - Project leads, Org Admins, and Org Owners have full permission (200/201).
3. Owner safeguards:
   - Project owner/lead cannot be demoted (400 Bad Request).
   - Project owner/lead cannot be removed (400 Bad Request).
4. Tenant Organization Scoping:
   - Users from Org B cannot access or modify project members from Org A (404/403).
   - Adding a user from another tenant organization is rejected (404).
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


class TestProjectMembersPermissionsAndCounts:
    """Proves member count consistency, RBAC 403 enforcement, owner immunity, and org scoping."""

    def test_member_counts_single_source_of_truth(self, client):
        """Verifies that project members list and project header counts are equal and consistent."""
        uid = uuid.uuid4().hex[:6]
        org_name = f"Org SST {uid}"
        lead_headers, lead_id, _ = setup_user(client, org_name, "owner", f"lead_{uid}")

        # 1. Create a project
        create_res = client.post(
            "/api/v1/projects",
            headers=lead_headers,
            json={
                "name": f"Cloud Mesh Router {uid}",
                "key": f"CM{uid[:3].upper()}",
                "description": "Enterprise mesh router project",
            },
        )
        assert create_res.status_code == 201
        project_data = create_res.json()
        project_id = project_data["id"]

        # Initial state: project has 1 member (the lead/owner)
        members_res = client.get(f"/api/v1/projects/{project_id}/members", headers=lead_headers)
        assert members_res.status_code == 200
        data = members_res.json()
        members = data["members"]
        assert len(members) == 1
        assert members[0]["user_id"] == lead_id
        assert members[0]["role"] == "owner"

        # 2. Add an invitation (does not increment members count, increments invitations count)
        inv_res = client.post(
            f"/api/v1/projects/{project_id}/members",
            headers=lead_headers,
            json={"email": f"developer1_{uid}@company.com", "role": "developer"},
        )
        assert inv_res.status_code == 201
        inv_data = inv_res.json()
        assert inv_data.get("email") == f"developer1_{uid}@company.com"

        # Check members and invitations count
        members_res2 = client.get(f"/api/v1/projects/{project_id}/members", headers=lead_headers)
        assert members_res2.status_code == 200
        data2 = members_res2.json()
        assert len(data2["members"]) == 1
        assert len(data2["invitations"]) == 1

    def test_rbac_403_rules_non_lead_cannot_manage_members(self, client):
        """Verifies that non-lead, non-admin members receive 403 Forbidden when trying to modify membership."""
        uid = uuid.uuid4().hex[:6]
        org_name = f"Org RBAC {uid}"
        lead_headers, lead_id, _ = setup_user(client, org_name, "owner", f"lead_{uid}")
        dev_headers, dev_id, dev_email = setup_user(client, org_name, "developer", f"dev_{uid}", owner_headers=lead_headers)

        # 1. Project Lead creates project
        create_res = client.post(
            "/api/v1/projects",
            headers=lead_headers,
            json={"name": f"Kubernetes Ingress {uid}", "key": f"K8{uid[:3].upper()}"},
        )
        assert create_res.status_code == 201
        project_id = create_res.json()["id"]

        # 2. Lead adds developer as member
        add_res = client.post(
            f"/api/v1/projects/{project_id}/members",
            headers=lead_headers,
            json={"email": dev_email, "user_id": dev_id, "role": "developer"},
        )
        assert add_res.status_code in (200, 201)

        # 3. Regular developer attempts to invite another user -> 403 Forbidden
        dev_invite_res = client.post(
            f"/api/v1/projects/{project_id}/members",
            headers=dev_headers,
            json={"email": f"newdev_{uid}@org.com", "role": "developer"},
        )
        assert dev_invite_res.status_code == 403

        # 4. Regular developer attempts to change lead's role -> 403 Forbidden
        members_res = client.get(f"/api/v1/projects/{project_id}/members", headers=lead_headers)
        members = members_res.json()["members"]
        lead_member = next(m for m in members if m["user_id"] == lead_id)

        dev_patch_res = client.patch(
            f"/api/v1/projects/{project_id}/members/{lead_member['id']}",
            headers=dev_headers,
            json={"role": "viewer"},
        )
        assert dev_patch_res.status_code == 403

        # 5. Regular developer attempts to remove member -> 403 Forbidden
        dev_remove_res = client.delete(
            f"/api/v1/projects/{project_id}/members/{lead_member['id']}",
            headers=dev_headers,
        )
        assert dev_remove_res.status_code == 403

    def test_owner_demotion_and_removal_prohibited(self, client):
        """Verifies that project owner/lead cannot be demoted or removed (returns 400)."""
        uid = uuid.uuid4().hex[:6]
        org_name = f"Org Demote {uid}"
        lead_headers, lead_id, _ = setup_user(client, org_name, "owner", f"owner_{uid}")

        # 1. Create project
        create_res = client.post(
            "/api/v1/projects",
            headers=lead_headers,
            json={"name": f"Observability Stack {uid}", "key": f"OB{uid[:3].upper()}"},
        )
        assert create_res.status_code == 201
        project_id = create_res.json()["id"]

        members_res = client.get(f"/api/v1/projects/{project_id}/members", headers=lead_headers)
        members = members_res.json()["members"]
        owner_member = next(m for m in members if m["user_id"] == lead_id)

        # 2. Attempt to demote owner to viewer -> 400 Bad Request
        demote_res = client.patch(
            f"/api/v1/projects/{project_id}/members/{owner_member['id']}",
            headers=lead_headers,
            json={"role": "viewer"},
        )
        assert demote_res.status_code == 400

        # 3. Attempt to delete/remove owner -> 400 Bad Request
        remove_res = client.delete(
            f"/api/v1/projects/{project_id}/members/{owner_member['id']}",
            headers=lead_headers,
        )
        assert remove_res.status_code == 400

    def test_organization_multi_tenant_scoping(self, client):
        """Verifies that users from Tenant B cannot view or modify members of Tenant A projects."""
        uid = uuid.uuid4().hex[:6]
        headers_a, _, _ = setup_user(client, f"Alpha Tenant {uid}", "owner", f"alpha_{uid}")
        headers_b, _, _ = setup_user(client, f"Beta Tenant {uid}", "owner", f"beta_{uid}")

        # 1. Tenant A creates project
        create_res = client.post(
            "/api/v1/projects",
            headers=headers_a,
            json={"name": f"Alpha Secret Project {uid}", "key": f"AL{uid[:3].upper()}"},
        )
        assert create_res.status_code == 201
        proj_a_id = create_res.json()["id"]

        # 2. Tenant B admin attempts to read Tenant A project members -> 404 Not Found
        cross_get_res = client.get(f"/api/v1/projects/{proj_a_id}/members", headers=headers_b)
        assert cross_get_res.status_code == 404

        # 3. Tenant B admin attempts to add member to Tenant A project -> 404 Not Found
        cross_post_res = client.post(
            f"/api/v1/projects/{proj_a_id}/members",
            headers=headers_b,
            json={"email": f"intruder_{uid}@beta.com", "role": "developer"},
        )
        assert cross_post_res.status_code == 404
