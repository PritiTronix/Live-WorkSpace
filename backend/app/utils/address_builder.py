import hmac
import hashlib
from datetime import datetime, timezone
from typing import Optional

from backend.app.core.config import settings


def build_public_url(path: Optional[str], base_url: Optional[str] = None) -> Optional[str]:
    """
    Builds an absolute URL when PUBLIC_API_BASE_URL (or base_url override) is set.
    When empty or unset, returns relative path unchanged so local development works.
    Already absolute addresses (http://, https://) are returned unchanged.
    Never logs secret keys or signatures.
    """
    if not path or not isinstance(path, str):
        return path

    trimmed = path.strip()
    if not trimmed:
        return path

    # If already absolute, return unchanged
    if trimmed.startswith("http://") or trimmed.startswith("https://"):
        return trimmed

    base = base_url if base_url is not None else settings.PUBLIC_API_BASE_URL
    if not base or not isinstance(base, str):
        return trimmed

    clean_base = base.strip().rstrip("/")
    if not clean_base:
        return trimmed

    clean_path = trimmed if trimmed.startswith("/") else f"/{trimmed}"

    # Handle scenario where base URL includes API_V1_PREFIX (e.g. https://api.domain.com/api/v1)
    # and path also starts with API_V1_PREFIX (e.g. /api/v1/users/...)
    api_prefix = (settings.API_V1_PREFIX or "/api/v1").rstrip("/")
    if clean_base.endswith(api_prefix) and clean_path.startswith(f"{api_prefix}/"):
        clean_path = clean_path[len(api_prefix):]

    return f"{clean_base}{clean_path}"


def generate_avatar_signed_url(user_id: str, base_url: Optional[str] = None) -> str:
    """
    Generate signed avatar URL for user_id with signature and timestamp version.
    Returns absolute URL when PUBLIC_API_BASE_URL is configured, else relative URL.
    Never logs signatures or secret keys.
    """
    sig = hmac.new(settings.SECRET_KEY.encode(), f"avatar:{user_id}".encode(), hashlib.sha256).hexdigest()[:16]
    timestamp = int(datetime.now(timezone.utc).timestamp())
    rel_path = f"{settings.API_V1_PREFIX}/users/{user_id}/avatar?sig={sig}&v={timestamp}"
    return build_public_url(rel_path, base_url=base_url)


def verify_avatar_signature(user_id: str, sig: str) -> bool:
    """
    Verify HMAC signature for avatar URL access.
    Never logs signatures or secret keys.
    """
    if not sig:
        return False
    expected_sig = hmac.new(settings.SECRET_KEY.encode(), f"avatar:{user_id}".encode(), hashlib.sha256).hexdigest()[:16]
    return hmac.compare_digest(sig, expected_sig)


def build_file_download_url(file_id: str, base_url: Optional[str] = None) -> str:
    """
    Build file download URL. Returns absolute URL if PUBLIC_API_BASE_URL is set,
    otherwise relative.
    """
    rel_path = f"{settings.API_V1_PREFIX}/files/{file_id}/download"
    return build_public_url(rel_path, base_url=base_url)


def build_ticket_attachment_url(ticket_id: str, attachment_id: str, base_url: Optional[str] = None) -> str:
    """
    Build ticket attachment download URL. Returns absolute URL if PUBLIC_API_BASE_URL is set,
    otherwise relative.
    """
    rel_path = f"{settings.API_V1_PREFIX}/tickets/{ticket_id}/attachments/{attachment_id}/download"
    return build_public_url(rel_path, base_url=base_url)
