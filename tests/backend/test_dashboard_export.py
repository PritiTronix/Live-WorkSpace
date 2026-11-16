"""
Tests for Dashboard Export endpoint: CSV & PDF generation, organization isolation,
CSV injection neutralization, and security checks.
"""
import uuid
import pytest
from fastapi.testclient import TestClient
from backend.app.main import create_application
from backend.app.routes.dashboard import sanitize_csv_cell


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


def test_unauthenticated_export_blocked(client):
    """Unauthenticated requests must get 401 Unauthorized."""
    res_csv = client.get("/api/v1/dashboard/export?format=csv")
    assert res_csv.status_code == 401

    res_pdf = client.get("/api/v1/dashboard/export?format=pdf")
    assert res_pdf.status_code == 401


def test_invalid_export_format_returns_422(client, auth_headers):
    """Format parameter validation must reject invalid formats with 422 Unprocessable Entity."""
    res_xml = client.get("/api/v1/dashboard/export?format=xml", headers=auth_headers)
    assert res_xml.status_code == 422

    res_json = client.get("/api/v1/dashboard/export?format=json", headers=auth_headers)
    assert res_json.status_code == 422

    res_none = client.get("/api/v1/dashboard/export", headers=auth_headers)
    assert res_none.status_code == 422


def test_csv_export_success_and_headers(client, auth_headers):
    """CSV export returns 200, text/csv, and safe Content-Disposition filename."""
    res = client.get("/api/v1/dashboard/export?format=csv", headers=auth_headers)
    assert res.status_code == 200
    assert "text/csv" in res.headers.get("content-type", "")

    disp = res.headers.get("content-disposition", "")
    assert "attachment" in disp
    assert "workspace-summary-" in disp
    assert disp.endswith('.csv"')

    content = res.text
    assert "Workspace Summary Report" in content
    assert "Executive Summary" in content
    assert "Total Projects" in content
    assert "Total Tasks" in content
    assert "SLA Breached" in content
    assert "Tasks by Status" in content
    assert "Tickets by Severity" in content


def test_pdf_export_success_and_headers(client, auth_headers):
    """PDF export returns 200, application/pdf, valid binary header (%PDF-), and page layout."""
    res = client.get("/api/v1/dashboard/export?format=pdf", headers=auth_headers)
    assert res.status_code == 200
    assert "application/pdf" in res.headers.get("content-type", "")

    disp = res.headers.get("content-disposition", "")
    assert "attachment" in disp
    assert "workspace-summary-" in disp
    assert disp.endswith('.pdf"')

    pdf_bytes = res.content
    assert len(pdf_bytes) > 500
    # Valid PDF magic bytes
    assert pdf_bytes.startswith(b"%PDF-")


def test_csv_formula_injection_neutralization(client, auth_headers):
    """Formula injection triggers (=, +, -, @, tab, CR) must be neutralized with a leading apostrophe."""
    # Test the sanitizer function directly
    assert sanitize_csv_cell("=1+1") == "'=1+1"
    assert sanitize_csv_cell("+cmd|'/C calc'!A0") == "'+cmd|'/C calc'!A0"
    assert sanitize_csv_cell("-2+3*cmd") == "'-2+3*cmd"
    assert sanitize_csv_cell("@SUM(A1:A10)") == "'@SUM(A1:A10)"
    assert sanitize_csv_cell("\tmalicious") == "'\tmalicious"
    assert sanitize_csv_cell("\rmalicious") == "'\rmalicious"
    assert sanitize_csv_cell("Normal Text") == "Normal Text"
    assert sanitize_csv_cell(123) == "123"
    assert sanitize_csv_cell(None) == ""

    # Test via API: create a project with a formula injection title
    formula_title = "=cmd|'/C calc'!A0"
    proj_res = client.post(
        "/api/v1/projects",
        json={"name": formula_title, "key": "CALC", "description": "Formula test project"},
        headers=auth_headers,
    )
    assert proj_res.status_code == 201

    # Export CSV and verify formula is escaped as '=cmd...
    export_res = client.get("/api/v1/dashboard/export?format=csv", headers=auth_headers)
    assert export_res.status_code == 200
    assert f"'{formula_title}" in export_res.text


def test_export_organization_isolation(client, auth_headers):
    """Export for User B must be strictly isolated from User A's projects, tasks and tickets."""
    # 1. Create unique Project in Org A (User A)
    uid = uuid.uuid4().hex[:6]
    proj_a_name = f"Confidential Alpha {uid}"
    client.post(
        "/api/v1/projects",
        json={"name": proj_a_name, "key": f"CA{uid[:3].upper()}", "description": "Top secret"},
        headers=auth_headers,
    )

    # 2. Register & Login as User B in a completely separate Organization B
    email_b = f"org_b_auditor_{uid}@isolated.io"
    reg_b = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": f"Auditor B {uid}",
            "email": email_b,
            "password": "Password123!",
            "organization_name": f"Organization B {uid}",
        },
    )
    assert reg_b.status_code == 201

    login_b = client.post(
        "/api/v1/auth/login",
        json={"email": email_b, "password": "Password123!"},
    )
    headers_b = {"Authorization": f"Bearer {login_b.json()['access_token']}"}

    # 3. Export CSV for User B
    export_b = client.get("/api/v1/dashboard/export?format=csv", headers=headers_b)
    assert export_b.status_code == 200
    content_b = export_b.text

    # 4. Verify Org A's confidential project NEVER appears in Org B's export
    assert proj_a_name not in content_b
    assert f"Organization B {uid}" in content_b

    # 5. Export PDF for User B
    export_b_pdf = client.get("/api/v1/dashboard/export?format=pdf", headers=headers_b)
    assert export_b_pdf.status_code == 200
    assert export_b_pdf.content.startswith(b"%PDF-")


def test_empty_workspace_export(client):
    """An empty workspace export generates a valid file stating no operational data found."""
    uid = uuid.uuid4().hex[:6]
    email_empty = f"empty_{uid}@emptyorg.com"
    client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Empty User",
            "email": email_empty,
            "password": "Password123!",
            "organization_name": f"Empty Org {uid}",
        },
    )
    login = client.post(
        "/api/v1/auth/login",
        json={"email": email_empty, "password": "Password123!"},
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    # CSV for empty workspace
    res_csv = client.get("/api/v1/dashboard/export?format=csv", headers=headers)
    assert res_csv.status_code == 200
    assert "No operational data found in this workspace for the selected filters." in res_csv.text

    # PDF for empty workspace
    res_pdf = client.get("/api/v1/dashboard/export?format=pdf", headers=headers)
    assert res_pdf.status_code == 200
    assert res_pdf.content.startswith(b"%PDF-")
