import pytest
from datetime import datetime, timezone
from urllib.parse import urlparse, parse_qs

from backend.app.core.config import settings
from backend.app.utils.address_builder import (
    build_public_url,
    generate_avatar_signed_url,
    verify_avatar_signature,
    build_file_download_url,
    build_ticket_attachment_url,
)
from backend.app.schemas import (
    UserBase,
    ProjectFileBase,
    TicketAttachmentRead,
    JoinCodeLookupResponse,
)


def test_build_public_url_relative_when_unset(monkeypatch):
    """When PUBLIC_API_BASE_URL is None or empty, relative paths are returned unchanged."""
    monkeypatch.setattr(settings, "PUBLIC_API_BASE_URL", None)
    rel_path = "/api/v1/users/usr_123/avatar?sig=abc&v=123"
    assert build_public_url(rel_path) == rel_path

    monkeypatch.setattr(settings, "PUBLIC_API_BASE_URL", "")
    assert build_public_url(rel_path) == rel_path


def test_build_public_url_absolute_when_configured(monkeypatch):
    """When PUBLIC_API_BASE_URL is configured, paths are prefixed to form absolute URLs."""
    monkeypatch.setattr(settings, "PUBLIC_API_BASE_URL", "https://api.hosted-domain.com")
    rel_path = "/api/v1/users/usr_123/avatar?sig=abc&v=123"
    assert build_public_url(rel_path) == "https://api.hosted-domain.com/api/v1/users/usr_123/avatar?sig=abc&v=123"


def test_build_public_url_preserves_already_absolute():
    """Already absolute URLs (http, https) are returned unchanged."""
    url = "https://lh3.googleusercontent.com/aida-public/sample.jpg"
    assert build_public_url(url, base_url="https://api.hosted-domain.com") == url

    http_url = "http://cdn.example.internal/file.png"
    assert build_public_url(http_url, base_url="https://api.hosted-domain.com") == http_url


def test_build_public_url_handles_edge_cases():
    """Handles falsy inputs and paths without leading slash."""
    assert build_public_url(None) is None
    assert build_public_url("") == ""
    assert build_public_url("   ") == "   "

    # Path without leading slash
    result = build_public_url("api/v1/files/f_1/download", base_url="https://api.hosted-domain.com")
    assert result == "https://api.hosted-domain.com/api/v1/files/f_1/download"


def test_build_public_url_avoids_duplicate_api_v1(monkeypatch):
    """Avoids duplicate /api/v1 when base URL ends with /api/v1 and path starts with /api/v1."""
    monkeypatch.setattr(settings, "PUBLIC_API_BASE_URL", "https://api.hosted-domain.com/api/v1")
    path = "/api/v1/users/usr_abc/avatar?sig=test&v=1"
    assert build_public_url(path) == "https://api.hosted-domain.com/api/v1/users/usr_abc/avatar?sig=test&v=1"


def test_avatar_signed_url_behavior_and_verification(monkeypatch):
    """
    generate_avatar_signed_url produces valid signature and timestamp parameters.
    Returns absolute when configured, relative when unset.
    Signature verifies via verify_avatar_signature.
    """
    user_id = "usr_test_signature_99"

    # 1. Local dev mode (unset)
    monkeypatch.setattr(settings, "PUBLIC_API_BASE_URL", None)
    rel_url = generate_avatar_signed_url(user_id)
    assert rel_url.startswith(f"/api/v1/users/{user_id}/avatar?")
    assert "sig=" in rel_url
    assert "v=" in rel_url

    # Parse query params
    parsed = urlparse(rel_url)
    qs = parse_qs(parsed.query)
    assert "sig" in qs
    assert "v" in qs
    sig = qs["sig"][0]

    # Verify signature
    assert verify_avatar_signature(user_id, sig) is True
    assert verify_avatar_signature("usr_wrong_user", sig) is False
    assert verify_avatar_signature(user_id, "tampered_sig_123") is False
    assert verify_avatar_signature(user_id, "") is False

    # 2. Production mode (configured)
    monkeypatch.setattr(settings, "PUBLIC_API_BASE_URL", "https://api.hosted-domain.com")
    abs_url = generate_avatar_signed_url(user_id)
    assert abs_url.startswith(f"https://api.hosted-domain.com/api/v1/users/{user_id}/avatar?")
    abs_parsed = urlparse(abs_url)
    abs_qs = parse_qs(abs_parsed.query)
    assert verify_avatar_signature(user_id, abs_qs["sig"][0]) is True


def test_file_and_attachment_address_builders(monkeypatch):
    """File download and ticket attachment URLs honor PUBLIC_API_BASE_URL."""
    file_id = "f_alpha_01"
    ticket_id = "t_beta_02"
    att_id = "att_gamma_03"

    # Relative when unset
    monkeypatch.setattr(settings, "PUBLIC_API_BASE_URL", None)
    assert build_file_download_url(file_id) == f"/api/v1/files/{file_id}/download"
    assert build_ticket_attachment_url(ticket_id, att_id) == f"/api/v1/tickets/{ticket_id}/attachments/{att_id}/download"

    # Absolute when configured
    monkeypatch.setattr(settings, "PUBLIC_API_BASE_URL", "https://api.hosted-domain.com")
    assert build_file_download_url(file_id) == f"https://api.hosted-domain.com/api/v1/files/{file_id}/download"
    assert build_ticket_attachment_url(ticket_id, att_id) == f"https://api.hosted-domain.com/api/v1/tickets/{ticket_id}/attachments/{att_id}/download"


def test_pydantic_schemas_resolution(monkeypatch):
    """Schemas automatically resolve relative paths when PUBLIC_API_BASE_URL is set."""
    # 1. Unset: keeps relative
    monkeypatch.setattr(settings, "PUBLIC_API_BASE_URL", None)

    user = UserBase(
        email="test@domain.com",
        full_name="Alex River",
        avatar_url="/api/v1/users/usr_01/avatar?sig=123&v=456",
    )
    assert user.avatar_url == "/api/v1/users/usr_01/avatar?sig=123&v=456"

    proj_file = ProjectFileBase(
        name="specs.pdf",
        file_url="/api/v1/files/f_01/download",
    )
    assert proj_file.file_url == "/api/v1/files/f_01/download"

    ticket_att = TicketAttachmentRead(
        id="att_1",
        ticket_id="t_1",
        uploader_id="u_1",
        name="dump.pcap",
        file_url="/api/v1/tickets/t_1/attachments/att_1/download",
        created_at=datetime.now(timezone.utc),
    )
    assert ticket_att.file_url == "/api/v1/tickets/t_1/attachments/att_1/download"

    # 2. Configured: converts to absolute
    monkeypatch.setattr(settings, "PUBLIC_API_BASE_URL", "https://api.hosted-domain.com")

    user_abs = UserBase(
        email="test@domain.com",
        full_name="Alex River",
        avatar_url="/api/v1/users/usr_01/avatar?sig=123&v=456",
    )
    assert user_abs.avatar_url == "https://api.hosted-domain.com/api/v1/users/usr_01/avatar?sig=123&v=456"

    proj_file_abs = ProjectFileBase(
        name="specs.pdf",
        file_url="/api/v1/files/f_01/download",
    )
    assert proj_file_abs.file_url == "https://api.hosted-domain.com/api/v1/files/f_01/download"

    ticket_att_abs = TicketAttachmentRead(
        id="att_1",
        ticket_id="t_1",
        uploader_id="u_1",
        name="dump.pcap",
        file_url="/api/v1/tickets/t_1/attachments/att_1/download",
        created_at=datetime.now(timezone.utc),
    )
    assert ticket_att_abs.file_url == "https://api.hosted-domain.com/api/v1/tickets/t_1/attachments/att_1/download"

    logo_lookup = JoinCodeLookupResponse(
        name="Acme Corp",
        logo_path="/uploads/logos/acme.png",
    )
    assert logo_lookup.logo_path == "https://api.hosted-domain.com/uploads/logos/acme.png"
