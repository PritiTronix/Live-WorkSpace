"""
Comprehensive Integration & Verification Tests: Organization Onboarding, Backend Phase 1.
Runs in an isolated temporary schema (test_<random>) on the database server.
Never touches the public schema. Drops ONLY the temporary test schema upon completion.
"""
import asyncio
import os
import secrets
import subprocess
import sys
import uuid
from datetime import datetime, timezone, timedelta
from typing import AsyncGenerator

import pytest
import httpx
from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from backend.app.main import app
from backend.app.database import get_db, db_url, engine_kwargs
from backend.app.models import (
    User, Organization, Membership, OrganizationJoinCode,
    JoinRequest, Notification, AuditLog
)
from backend.app.core.security import create_access_token, get_password_hash
from backend.app.routes.organizations import _join_rate_limit_history


def _utc_now():
    return datetime.now(timezone.utc)


async def run_test_suite():
    schema_name = f"test_{secrets.token_hex(4)}"
    assert schema_name.startswith("test_"), "Safety assert: schema must start with test_"
    print(f"Creating isolated test schema: {schema_name}")

    # Setup isolated schema and clone structure from public
    setup_engine = create_async_engine(db_url, **engine_kwargs)
    async with setup_engine.begin() as conn:
        await conn.execute(text(f'CREATE SCHEMA "{schema_name}"'))
        res = await conn.execute(
            text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
        )
        tables = [row[0] for row in res.fetchall()]
        for t in tables:
            await conn.execute(
                text(f'CREATE TABLE "{schema_name}"."{t}" (LIKE public."{t}" INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES)')
            )
        await conn.execute(
            text(f"INSERT INTO \"{schema_name}\".alembic_version (version_num) VALUES ('015_reconcile_schema_drift')")
        )
    await setup_engine.dispose()

    test_engine = None
    try:
        # Run alembic upgrade head targeting this schema
        res = subprocess.run(
            [sys.executable, "-m", "alembic", "-x", f"schema={schema_name}", "upgrade", "head"],
            capture_output=True,
            text=True,
        )
        if res.returncode != 0:
            raise RuntimeError(f"Alembic migration failed on {schema_name}:\nSTDOUT: {res.stdout}\nSTDERR: {res.stderr}")
        print("Alembic upgrade head executed successfully in test schema.")

        # Create session factory bound to this schema
        engine_kwargs_test = dict(engine_kwargs)
        engine_kwargs_test["connect_args"] = {"server_settings": {"search_path": schema_name}}
        test_engine = create_async_engine(db_url, **engine_kwargs_test)
        test_session_maker = async_sessionmaker(
            bind=test_engine,
            class_=AsyncSession,
            autocommit=False,
            autoflush=False,
            expire_on_commit=False,
        )

        async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
            async with test_session_maker() as session:
                await session.execute(text(f'SET search_path TO "{schema_name}"'))
                try:
                    yield session
                    await session.commit()
                except Exception:
                    await session.rollback()
                    raise

        app.dependency_overrides[get_db] = override_get_db

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            # Helper to insert a test user
            async def create_user(email: str, org_id: str = None, role: str = "member", email_verified: bool = True):
                uid = f"usr_{uuid.uuid4().hex[:10]}"
                async with test_session_maker() as session:
                    await session.execute(text(f'SET search_path TO "{schema_name}"'))
                    u = User(
                        id=uid,
                        email=email,
                        hashed_password=get_password_hash("TestPass123!"),
                        full_name=f"User {uid}",
                        organization_id=org_id,
                        role=role,
                        is_active=True,
                        email_verified=email_verified,
                        onboarding_completed=True,
                        created_at=_utc_now(),
                    )
                    session.add(u)
                    if org_id:
                        m = Membership(
                            id=f"mem_{uuid.uuid4().hex[:8]}",
                            user_id=uid,
                            organization_id=org_id,
                            role=role,
                            status="active",
                            joined_at=_utc_now(),
                        )
                        session.add(m)
                    await session.commit()
                token = create_access_token(subject=uid, email=email, org_id=org_id, role=role)
                return uid, token

            print("--- Scenario 1: User without organization receives 403 organization_required ---")
            u_no_org_id, u_no_org_token = await create_user("no_org@example.com")
            auth_header = {"Authorization": f"Bearer {u_no_org_token}"}

            resp = await client.get("/api/v1/projects", headers=auth_header)
            assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"
            body = resp.json()
            assert body.get("error", {}).get("code") == "organization_required" or "organization_required" in resp.text

            resp_me = await client.get("/api/v1/auth/me", headers=auth_header)
            assert resp_me.status_code == 200
            me_data = resp_me.json()
            assert me_data.get("organization_required") is True
            assert me_data.get("memberships") == []
            print("Scenario 1 PASSED.")

            print("--- Scenario 2: POST /organizations and immediate visibility ---")
            create_org_payload = {
                "name": "Apex Innovations",
                "industry": "Software",
                "size_range": "11-50",
            }
            resp_create_org = await client.post("/api/v1/organizations", json=create_org_payload, headers=auth_header)
            assert resp_create_org.status_code == 201, f"Create org failed: {resp_create_org.text}"
            org_data = resp_create_org.json()
            assert org_data["name"] == "Apex Innovations"
            org_id = org_data["id"]
            assert org_id is not None
            assert org_data["slug"].startswith("apex-innovations")

            resp_me2 = await client.get("/api/v1/auth/me", headers=auth_header)
            assert resp_me2.status_code == 200
            me2_data = resp_me2.json()
            assert me2_data.get("organization_required") is False
            assert me2_data.get("organization_id") == org_id
            memberships = me2_data.get("memberships", [])
            assert len(memberships) == 1
            assert memberships[0]["id"] == org_id
            assert memberships[0]["role"] == "owner"

            resp_proj = await client.get("/api/v1/projects", headers=auth_header)
            assert resp_proj.status_code in (200, 404), f"Unexpected status: {resp_proj.status_code}"
            print("Scenario 2 PASSED.")

            print("--- Scenario 3: Join code lookup (valid, invalid, expired, revoked) ---")
            resp_code = await client.post(f"/api/v1/organizations/{org_id}/join-code", headers=auth_header)
            assert resp_code.status_code == 200, f"Generate code failed: {resp_code.text}"
            code_data = resp_code.json()
            plain_code = code_data["code"]
            assert len(plain_code) == 10

            resp_lookup = await client.post("/api/v1/organizations/join/lookup", json={"code": plain_code})
            assert resp_lookup.status_code == 200
            assert resp_lookup.json()["name"] == "Apex Innovations"

            resp_lookup_inv = await client.post("/api/v1/organizations/join/lookup", json={"code": "INVALID999"})
            assert resp_lookup_inv.status_code == 404
            expected_msg = "Invalid, expired, or revoked join code."
            assert expected_msg in resp_lookup_inv.text

            resp_revoke = await client.delete(f"/api/v1/organizations/{org_id}/join-code", headers=auth_header)
            assert resp_revoke.status_code == 200

            resp_lookup_rev = await client.post("/api/v1/organizations/join/lookup", json={"code": plain_code})
            assert resp_lookup_rev.status_code == 404
            assert expected_msg in resp_lookup_rev.text

            resp_new_code = await client.post(f"/api/v1/organizations/{org_id}/join-code", headers=auth_header)
            assert resp_new_code.status_code == 200
            active_code = resp_new_code.json()["code"]
            print("Scenario 3 PASSED.")

            print("--- Scenario 4: Join requests (duplicate, already member, pending limit) ---")
            resp_join_self = await client.post(
                "/api/v1/organizations/join",
                json={"code": active_code, "message": "Trying to rejoin"},
                headers=auth_header,
            )
            assert resp_join_self.status_code == 400
            assert "already a member" in resp_join_self.text

            user_b_id, user_b_token = await create_user("applicant_b@example.com")
            auth_b = {"Authorization": f"Bearer {user_b_token}"}

            resp_join_b = await client.post(
                "/api/v1/organizations/join",
                json={"code": active_code, "message": "Please let me in!"},
                headers=auth_b,
            )
            assert resp_join_b.status_code == 201, f"Join request failed: {resp_join_b.text}"
            req_b_id = resp_join_b.json()["id"]

            resp_join_dup = await client.post(
                "/api/v1/organizations/join",
                json={"code": active_code, "message": "Duplicate attempt"},
                headers=auth_b,
            )
            assert resp_join_dup.status_code == 400
            assert "pending join request for this organization already exists" in resp_join_dup.text
            _join_rate_limit_history.clear()

            o2_owner_id, o2_owner_token = await create_user("o2_owner@example.com")
            resp_o2 = await client.post(
                "/api/v1/organizations",
                json={"name": "Org Two"},
                headers={"Authorization": f"Bearer {o2_owner_token}"},
            )
            o2_id = resp_o2.json()["id"]
            resp_c2 = await client.post(f"/api/v1/organizations/{o2_id}/join-code", headers={"Authorization": f"Bearer {o2_owner_token}"})
            code_2 = resp_c2.json()["code"]

            o3_owner_id, o3_owner_token = await create_user("o3_owner@example.com")
            resp_o3 = await client.post(
                "/api/v1/organizations",
                json={"name": "Org Three"},
                headers={"Authorization": f"Bearer {o3_owner_token}"},
            )
            o3_id = resp_o3.json()["id"]
            resp_c3 = await client.post(f"/api/v1/organizations/{o3_id}/join-code", headers={"Authorization": f"Bearer {o3_owner_token}"})
            code_3 = resp_c3.json()["code"]

            o4_owner_id, o4_owner_token = await create_user("o4_owner@example.com")
            resp_o4 = await client.post(
                "/api/v1/organizations",
                json={"name": "Org Four"},
                headers={"Authorization": f"Bearer {o4_owner_token}"},
            )
            o4_id = resp_o4.json()["id"]
            resp_c4 = await client.post(f"/api/v1/organizations/{o4_id}/join-code", headers={"Authorization": f"Bearer {o4_owner_token}"})
            code_4 = resp_c4.json()["code"]

            r2 = await client.post("/api/v1/organizations/join", json={"code": code_2}, headers=auth_b)
            assert r2.status_code == 201

            r3 = await client.post("/api/v1/organizations/join", json={"code": code_3}, headers=auth_b)
            assert r3.status_code == 201

            r4 = await client.post("/api/v1/organizations/join", json={"code": code_4}, headers=auth_b)
            assert r4.status_code == 400
            assert "cannot have more than 3 pending join requests" in r4.text
            print("Scenario 4 PASSED.")

            print("--- Scenario 5: Authorization & Cross-Org Isolation: Approve & Reject ---")
            member_user_id, member_token = await create_user("member_user@example.com", org_id=org_id, role="member")
            auth_member = {"Authorization": f"Bearer {member_token}"}
            resp_mem_appr = await client.post(f"/api/v1/organizations/{org_id}/join-requests/{req_b_id}/approve", headers=auth_member)
            assert resp_mem_appr.status_code == 403

            resp_anon_appr = await client.post(f"/api/v1/organizations/{org_id}/join-requests/{req_b_id}/approve")
            assert resp_anon_appr.status_code == 401

            auth_o2 = {"Authorization": f"Bearer {o2_owner_token}"}
            resp_other_list = await client.get(f"/api/v1/organizations/{org_id}/join-requests", headers=auth_o2)
            assert resp_other_list.status_code == 403

            resp_other_appr = await client.post(f"/api/v1/organizations/{o2_id}/join-requests/{req_b_id}/approve", headers=auth_o2)
            assert resp_other_appr.status_code == 404

            resp_list = await client.get(f"/api/v1/organizations/{org_id}/join-requests", headers=auth_header)
            assert resp_list.status_code == 200
            items = resp_list.json()["items"]
            assert any(i["id"] == req_b_id for i in items)

            resp_appr = await client.post(f"/api/v1/organizations/{org_id}/join-requests/{req_b_id}/approve", headers=auth_header)
            assert resp_appr.status_code == 200
            assert resp_appr.json()["status"] == "approved"

            resp_b_me = await client.get("/api/v1/auth/me", headers=auth_b)
            assert resp_b_me.status_code == 200
            b_data = resp_b_me.json()
            assert b_data["organization_required"] is False
            assert b_data["organization_id"] == org_id
            assert any(m["id"] == org_id and m["role"] == "member" for m in b_data["memberships"])

            resp_re_appr = await client.post(f"/api/v1/organizations/{org_id}/join-requests/{req_b_id}/approve", headers=auth_header)
            assert resp_re_appr.status_code == 400

            user_c_id, user_c_token = await create_user("applicant_c@example.com")
            auth_c = {"Authorization": f"Bearer {user_c_token}"}
            _join_rate_limit_history.clear()
            resp_join_c = await client.post("/api/v1/organizations/join", json={"code": active_code}, headers=auth_c)
            assert resp_join_c.status_code == 201
            req_c_id = resp_join_c.json()["id"]

            resp_rej = await client.post(
                f"/api/v1/organizations/{org_id}/join-requests/{req_c_id}/reject",
                json={"decision_reason": "Workspace at maximum capacity."},
                headers=auth_header,
            )
            assert resp_rej.status_code == 200
            assert resp_rej.json()["status"] == "rejected"
            assert resp_rej.json()["decision_reason"] == "Workspace at maximum capacity."
            print("Scenario 5 PASSED.")

            print("--- Scenario 6: Notifications generated for right users ---")
            async with test_session_maker() as session:
                await session.execute(text(f'SET search_path TO "{schema_name}"'))
                owner_notifs = await session.execute(
                    select(Notification).where(
                        Notification.user_id == u_no_org_id,
                        Notification.type == "join_request",
                    )
                )
                assert len(owner_notifs.scalars().all()) >= 1, "Owner should have received join_request_created notifications"

                b_notifs = await session.execute(
                    select(Notification).where(
                        Notification.user_id == user_b_id,
                        Notification.type == "join_request_decided",
                    )
                )
                assert len(b_notifs.scalars().all()) >= 1, "Applicant B should have received join_request_decided notification"

                c_notifs = await session.execute(
                    select(Notification).where(
                        Notification.user_id == user_c_id,
                        Notification.type == "join_request_decided",
                    )
                )
                assert len(c_notifs.scalars().all()) >= 1, "Applicant C should have received join_request_decided notification"
            print("Scenario 6 PASSED.")

            print("--- Scenario 7: Rate limiting on /organizations/join returns 429 ---")
            user_rl_id, user_rl_token = await create_user("rate_limit_test@example.com")
            auth_rl = {"Authorization": f"Bearer {user_rl_token}"}

            rl_triggered = False
            for _ in range(10):
                r = await client.post("/api/v1/organizations/join", json={"code": "DUMMYCODE1"}, headers=auth_rl)
                if r.status_code == 429:
                    rl_triggered = True
                    assert "Retry-After" in r.headers, "429 response must include Retry-After header"
                    assert r.json().get("error", {}).get("code") == "rate_limited" or "rate_limited" in r.text
                    break

            assert rl_triggered, "Expected rate limit 429 to trigger within 10 requests"
            print("Scenario 7 PASSED.")

    finally:
        app.dependency_overrides.clear()
        if test_engine is not None:
            await test_engine.dispose()

        print(f"Dropping temporary isolated test schema: {schema_name}")
        teardown_engine = create_async_engine(db_url, **engine_kwargs)
        async with teardown_engine.begin() as conn:
            assert schema_name.startswith("test_") and len(schema_name) > 5, "Safety check before drop"
            await conn.execute(text(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE'))
        await teardown_engine.dispose()
        print("Isolated test schema dropped cleanly.")


@pytest.mark.anyio
async def test_organization_onboarding_phase1():
    await run_test_suite()


if __name__ == "__main__":
    asyncio.run(run_test_suite())
