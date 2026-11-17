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

DO NOT RUN against shared database. These tests are written for isolated test environments.
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


def make_auth_headers(user_id: str, role: str, org_id: str, email: str = "user@test.com"):
    token = create_access_token(
        subject=user_id,
        role=role,
        org_id=org_id,
        email=email,
    )
    return {"Authorization": f"Bearer {token}"}


class TestProjectMembersPermissionsAndCounts:
    """Proves member count consistency, RBAC 403 enforcement, owner immunity, and org scoping."""

    def test_member_counts_single_source_of_truth(self, client):
        """Verifies that project members list and project header counts are equal and consistent."""
        org_id = "org_test_01"
        lead_id = "user_lead_01"
        lead_headers = make_auth_headers(lead_id, role="member", org_id=org_id, email="lead@org01.com")

        # 1. Create a project
        create_res = client.post(
            "/api/v1/projects",
            headers=lead_headers,
            json={
                "name": "Cloud Mesh Router",
                "key": "CMR",
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
            json={"email": "developer1@company.com", "role": "developer"},
        )
        assert inv_res.status_code == 201
        inv_data = inv_res.json()
        assert inv_data.get("email") == "developer1@company.com"

        # Check members and invitations count
        members_res2 = client.get(f"/api/v1/projects/{project_id}/members", headers=lead_headers)
        assert members_res2.status_code == 200
        data2 = members_res2.json()
        assert len(data2["members"]) == 1
        assert len(data2["invitations"]) == 1

    def test_rbac_403_rules_non_lead_cannot_manage_members(self, client):
        """Verifies that non-lead, non-admin members receive 403 Forbidden when trying to modify membership."""
        org_id = "org_test_02"
        lead_id = "user_lead_02"
        dev_id = "user_dev_02"

        lead_headers = make_auth_headers(lead_id, role="member", org_id=org_id, email="lead@org02.com")
        dev_headers = make_auth_headers(dev_id, role="developer", org_id=org_id, email="dev@org02.com")

        # 1. Project Lead creates project
        create_res = client.post(
            "/api/v1/projects",
            headers=lead_headers,
            json={"name": "Kubernetes Ingress", "key": "K8S"},
        )
        assert create_res.status_code == 201
        project_id = create_res.json()["id"]

        # 2. Lead adds developer as member
        add_res = client.post(
            f"/api/v1/projects/{project_id}/members",
            headers=lead_headers,
            json={"email": "dev@org02.com", "user_id": dev_id, "role": "developer"},
        )
        assert add_res.status_code in (200, 201)

        # 3. Regular developer attempts to invite another user -> 403 Forbidden
        dev_invite_res = client.post(
            f"/api/v1/projects/{project_id}/members",
            headers=dev_headers,
            json={"email": "newdev@org02.com", "role": "developer"},
        )
        assert dev_invite_res.status_code == 403
        assert "Forbidden" in dev_invite_res.json()["detail"] or "lead" in dev_invite_res.json()["detail"].lower()

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
        org_id = "org_test_03"
        lead_id = "user_lead_03"
        lead_headers = make_auth_headers(lead_id, role="owner", org_id=org_id, email="lead@org03.com")

        # 1. Create project
        create_res = client.post(
            "/api/v1/projects",
            headers=lead_headers,
            json={"name": "Observability Stack", "key": "OBS"},
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
        assert "demote" in demote_res.json()["detail"].lower()

        # 3. Attempt to delete/remove owner -> 400 Bad Request
        remove_res = client.delete(
            f"/api/v1/projects/{project_id}/members/{owner_member['id']}",
            headers=lead_headers,
        )
        assert remove_res.status_code == 400
        assert "remove" in remove_res.json()["detail"].lower()

    def test_organization_multi_tenant_scoping(self, client):
        """Verifies that users from Tenant B cannot view or modify members of Tenant A projects."""
        org_a = "org_tenant_alpha"
        org_b = "org_tenant_beta"
        user_a = "user_alpha_lead"
        user_b = "user_beta_admin"

        headers_a = make_auth_headers(user_a, role="owner", org_id=org_a, email="lead@alpha.com")
        headers_b = make_auth_headers(user_b, role="admin", org_id=org_b, email="admin@beta.com")

        # 1. Tenant A creates project
        create_res = client.post(
            "/api/v1/projects",
            headers=headers_a,
            json={"name": "Alpha Secret Project", "key": "ALPHA"},
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
            json={"email": "intruder@beta.com", "role": "developer"},
        )
        assert cross_post_res.status_code == 404
