"""
Backend Integration Test: Create Project, List Users, and CORS Error Handling.
Runs exclusively in an isolated temporary test schema (test_<random>) on PostgreSQL.
Never touches the main database public schema. Drops temporary schema upon completion.
"""
import asyncio
import os
import secrets
import subprocess
import sys
import uuid
from datetime import datetime, timezone

import pytest
import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from backend.app.main import app
from backend.app.database import get_db, db_url, engine_kwargs
from backend.app.models import User, Organization, Membership, Project, ProjectMember
from backend.app.core.config import settings
from backend.app.core.security import create_access_token, get_password_hash


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
        # Run alembic upgrade head targeting this isolated schema
        res = subprocess.run(
            [sys.executable, "-m", "alembic", "-x", f"schema={schema_name}", "upgrade", "head"],
            capture_output=True,
            text=True,
        )
        if res.returncode != 0:
            raise RuntimeError(f"Alembic migration failed on {schema_name}:\nSTDOUT: {res.stdout}\nSTDERR: {res.stderr}")
        print("Alembic upgrade head executed successfully in test schema.")

        engine_kwargs_test = dict(engine_kwargs)
        connect_args = dict(engine_kwargs_test.get("connect_args", {}))
        connect_args["server_settings"] = {"search_path": f"{schema_name},public"}
        engine_kwargs_test["connect_args"] = connect_args

        test_engine = create_async_engine(db_url, **engine_kwargs_test)
        TestSessionLocal = async_sessionmaker(
            bind=test_engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )

        async def override_get_db() -> AsyncSession:
            async with TestSessionLocal() as session:
                try:
                    yield session
                finally:
                    await session.close()

        app.dependency_overrides[get_db] = override_get_db

        # Seed organization and user
        async with TestSessionLocal() as session:
            org = Organization(
                id=f"org_{uuid.uuid4().hex[:12]}",
                name="Acme Global Innovations",
                slug=f"acme-{uuid.uuid4().hex[:6]}",
                industry="technology",
                size_range="11-50",
                created_at=_utc_now(),
            )
            session.add(org)

            user = User(
                id=f"usr_{uuid.uuid4().hex[:12]}",
                email=f"lead_{uuid.uuid4().hex[:6]}@example.com",
                hashed_password=get_password_hash("ValidPass123!"),
                full_name="Project Lead User",
                role="owner",
                organization_id=org.id,
                email_verified=True,
                is_active=True,
                created_at=_utc_now(),
            )
            session.add(user)

            membership = Membership(
                id=f"mem_{uuid.uuid4().hex[:12]}",
                user_id=user.id,
                organization_id=org.id,
                role="owner",
                status="active",
                joined_at=_utc_now(),
            )
            session.add(membership)
            await session.commit()

            user_id = user.id
            user_email = user.email
            org_id = org.id

        token = create_access_token(subject=user_id, email=user_email, org_id=org_id, role="owner")
        headers = {
            "Authorization": f"Bearer {token}",
            "Origin": "http://localhost:5173",
        }

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            # 1. Test POST /api/v1/projects (Project Creation)
            print("Testing POST /api/v1/projects...")
            proj_payload = {
                "name": "Apollo Mission Control",
                "key": "APOLLO",
                "description": "Next-gen mission telemetry",
                "status": "active",
                "visibility": "organization",
            }
            r_proj = await client.post("/api/v1/projects", json=proj_payload, headers=headers)
            assert r_proj.status_code == 201, f"Expected 201, got {r_proj.status_code}: {r_proj.text}"
            proj_data = r_proj.json()
            assert proj_data["name"] == "Apollo Mission Control"
            assert proj_data["key"] == "APOLLO"
            assert proj_data["lead"]["id"] == user_id
            # Verify CORS header is preserved
            assert r_proj.headers.get("access-control-allow-origin") == "http://localhost:5173"
            print("POST /api/v1/projects passed successfully with status 201 and CORS headers.")

            # 2. Test GET /api/v1/users (Listing Users)
            print("Testing GET /api/v1/users...")
            r_users = await client.get("/api/v1/users", headers=headers)
            assert r_users.status_code == 200, f"Expected 200, got {r_users.status_code}: {r_users.text}"
            users_data = r_users.json()
            assert isinstance(users_data, list)
            assert len(users_data) >= 1
            found_user = next((u for u in users_data if u["id"] == user_id), None)
            assert found_user is not None
            assert found_user["full_name"] == "Project Lead User"
            # Verify CORS header is preserved
            assert r_users.headers.get("access-control-allow-origin") == "http://localhost:5173"
            print("GET /api/v1/users passed successfully with status 200 and CORS headers.")

            # 3. Test Catch-all Error Handling Middleware with CORS preservation
            print("Testing CatchAllErrorMiddleware 500 error and CORS preservation...")

            # Define a temporary route that intentionally raises an unexpected RuntimeError
            @app.get("/api/v1/test-unexpected-error")
            async def trigger_unexpected_error():
                raise RuntimeError("Simulated unhandled unexpected exception for testing")

            r_err = await client.get("/api/v1/test-unexpected-error", headers={"Origin": "http://localhost:5173"})
            assert r_err.status_code == 500, f"Expected 500, got {r_err.status_code}: {r_err.text}"
            err_json = r_err.json()
            assert err_json.get("error", {}).get("code") == "internal_error"
            # Crucial: CORS headers must be present on 500 response so browser does not mask with CORS error
            assert r_err.headers.get("access-control-allow-origin") == "http://localhost:5173"
            assert r_err.headers.get("access-control-allow-credentials") == "true"

            # Check that an untrusted origin does NOT receive CORS allow-origin
            r_err_untrusted = await client.get("/api/v1/test-unexpected-error", headers={"Origin": "http://evil-origin.com"})
            assert r_err_untrusted.status_code == 500
            assert "access-control-allow-origin" not in r_err_untrusted.headers
            print("CatchAllErrorMiddleware successfully tested with JSON 500 and configured CORS headers.")

    finally:
        app.dependency_overrides.clear()
        if test_engine is not None:
            await test_engine.dispose()

        print(f"Dropping temporary isolated test schema: {schema_name}")
        teardown_engine = create_async_engine(db_url, **engine_kwargs)
        async with teardown_engine.begin() as conn:
            assert schema_name.startswith("test_") and len(schema_name) > 5, "Safety check before drop"
            await conn.execute(text(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE'))
            await conn.execute(text("SET search_path TO public"))
            await conn.execute(text('ALTER ROLE neondb_owner SET search_path TO public, "$user"'))
        await teardown_engine.dispose()
        print("Isolated test schema dropped cleanly.")


@pytest.mark.anyio
async def test_projects_and_users():
    await run_test_suite()


if __name__ == "__main__":
    asyncio.run(run_test_suite())
