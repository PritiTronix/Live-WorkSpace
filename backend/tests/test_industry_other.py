import html
import pytest
import httpx
from pydantic import ValidationError

from backend.app.schemas import OrganizationCreateRequest, OrganizationRead, OrganizationSummary
from backend.app.models import Organization, User
from backend.app.main import app
from backend.app.dependencies import get_current_active_user


def test_industry_other_required_when_other():
    # Missing industry_other
    with pytest.raises(ValidationError) as exc:
        OrganizationCreateRequest(name="Test Org", industry="other")
    errs = exc.value.errors()
    assert any("industry_other" in str(e["loc"]) for e in errs)
    assert any("Specify your industry is required" in e["msg"] for e in errs)

    # Empty string
    with pytest.raises(ValidationError) as exc:
        OrganizationCreateRequest(name="Test Org", industry="other", industry_other="")
    errs = exc.value.errors()
    assert any("industry_other" in str(e["loc"]) for e in errs)

    # Whitespace only
    with pytest.raises(ValidationError) as exc:
        OrganizationCreateRequest(name="Test Org", industry="other", industry_other="   ")
    errs = exc.value.errors()
    assert any("industry_other" in str(e["loc"]) for e in errs)


def test_industry_other_length_rules():
    # Less than 2 characters
    with pytest.raises(ValidationError) as exc:
        OrganizationCreateRequest(name="Test Org", industry="other", industry_other="A")
    errs = exc.value.errors()
    assert any("industry_other" in str(e["loc"]) for e in errs)
    assert any("between 2 and 60" in e["msg"] for e in errs)

    # Valid min length
    req = OrganizationCreateRequest(name="Test Org", industry="other", industry_other="AB")
    assert req.industry_other == "AB"

    # Valid max length
    valid_60 = "A" * 60
    req = OrganizationCreateRequest(name="Test Org", industry="other", industry_other=valid_60)
    assert req.industry_other == valid_60

    # More than 60 characters
    with pytest.raises(ValidationError) as exc:
        OrganizationCreateRequest(name="Test Org", industry="other", industry_other="A" * 61)
    errs = exc.value.errors()
    assert any("industry_other" in str(e["loc"]) for e in errs)


def test_industry_other_no_leading_or_trailing_spaces():
    with pytest.raises(ValidationError) as exc:
        OrganizationCreateRequest(name="Test Org", industry="other", industry_other=" Logistics")
    errs = exc.value.errors()
    assert any("industry_other" in str(e["loc"]) for e in errs)
    assert any("leading or trailing" in e["msg"].lower() for e in errs)

    with pytest.raises(ValidationError) as exc:
        OrganizationCreateRequest(name="Test Org", industry="other", industry_other="Logistics ")
    errs = exc.value.errors()
    assert any("industry_other" in str(e["loc"]) for e in errs)
    assert any("leading or trailing" in e["msg"].lower() for e in errs)


def test_industry_other_characters_allowed_and_rejected():
    # Valid characters: letters, numbers, spaces, and &, -, /, ', .
    valid_text = "Logistics & Freight - Non-profit / Gov't Co."
    req = OrganizationCreateRequest(name="Test Org", industry="other", industry_other=valid_text)
    assert req.industry_other == valid_text

    # Reject emoji
    with pytest.raises(ValidationError) as exc:
        OrganizationCreateRequest(name="Test Org", industry="other", industry_other="Logistics 🚀")
    errs = exc.value.errors()
    assert any("industry_other" in str(e["loc"]) for e in errs)

    # Reject control characters
    with pytest.raises(ValidationError) as exc:
        OrganizationCreateRequest(name="Test Org", industry="other", industry_other="Logistics\nCargo")
    errs = exc.value.errors()
    assert any("industry_other" in str(e["loc"]) for e in errs)

    with pytest.raises(ValidationError) as exc:
        OrganizationCreateRequest(name="Test Org", industry="other", industry_other="Logistics\x00Cargo")
    errs = exc.value.errors()
    assert any("industry_other" in str(e["loc"]) for e in errs)

    # Reject symbols outside allowed punctuation, e.g. @, #, $, %
    with pytest.raises(ValidationError) as exc:
        OrganizationCreateRequest(name="Test Org", industry="other", industry_other="Logistics @ Global")
    errs = exc.value.errors()
    assert any("industry_other" in str(e["loc"]) for e in errs)


def test_industry_other_cleared_when_industry_not_other():
    # When industry is "technology", industry_other is ignored/cleared
    req = OrganizationCreateRequest(name="Test Org", industry="technology", industry_other="Custom Info")
    assert req.industry_other is None

    # When industry is None, industry_other is ignored/cleared
    req2 = OrganizationCreateRequest(name="Test Org", industry=None, industry_other="Custom Info")
    assert req2.industry_other is None


def test_industry_other_whitespace_normalized():
    # Multiple internal spaces should be normalized to a single space
    req = OrganizationCreateRequest(name="Test Org", industry="other", industry_other="Logistics    and   Freight")
    assert req.industry_other == "Logistics and Freight"


def test_escape_on_output():
    # Check OrganizationBase serialization escaping
    data = {
        "name": "Test Org",
        "slug": "test-org",
        "industry": "other",
        "industry_other": "Logistics & Freight <script>alert(1)</script>",
    }
    org_read = OrganizationRead(
        id="org_123",
        created_at="2026-11-20T12:00:00Z",
        **data,
    )
    json_out = org_read.model_dump_json()
    assert "&amp;" in json_out
    assert "&lt;script&gt;" in json_out
    assert "<script>" not in json_out

    # Check OrganizationSummary serialization escaping
    summary = OrganizationSummary(
        id="org_123",
        name="Test Org",
        industry="other",
        industry_other="R&D <bold>",
    )
    summary_json = summary.model_dump_json()
    assert "&amp;" in summary_json
    assert "&lt;bold&gt;" in summary_json


@pytest.mark.anyio
async def test_fastapi_422_endpoint_behavior():
    dummy_user = User(
        id="usr_dummy_test_422",
        email="dummy422@example.com",
        full_name="Dummy User",
        email_verified=True,
        is_active=True,
        organization_id=None,
    )
    app.dependency_overrides[get_current_active_user] = lambda: dummy_user
    transport = httpx.ASGITransport(app=app)
    try:
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            # 1. Missing industry_other when industry="other"
            res = await client.post("/api/v1/organizations", json={"name": "Acme Corp", "industry": "other"})
            assert res.status_code == 422
            data = res.json()
            errs = data.get("detail", [])
            assert any("industry_other" in e["loc"] for e in errs)

            # 2. Leading spaces on industry_other
            res_leading = await client.post(
                "/api/v1/organizations",
                json={"name": "Acme Corp", "industry": "other", "industry_other": " Leading space"}
            )
            assert res_leading.status_code == 422
            assert any("industry_other" in e["loc"] for e in res_leading.json().get("detail", []))

            # 3. Disallowed characters (emoji)
            res_emoji = await client.post(
                "/api/v1/organizations",
                json={"name": "Acme Corp", "industry": "other", "industry_other": "Logistics 🚚"}
            )
            assert res_emoji.status_code == 422
            assert any("industry_other" in e["loc"] for e in res_emoji.json().get("detail", []))

            # 4. Less than 2 characters
            res_short = await client.post(
                "/api/v1/organizations",
                json={"name": "Acme Corp", "industry": "other", "industry_other": "X"}
            )
            assert res_short.status_code == 422
            assert any("industry_other" in e["loc"] for e in res_short.json().get("detail", []))
    finally:
        app.dependency_overrides.clear()
