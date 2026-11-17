"""
Tests for User Profile Page & Avatar Handling:
1. Successful update of profile fields and avatar
2. Invalid file type rejection (e.g. SVG or text)
3. Oversized file rejection (> 5MB)
4. Disguised file rejection (wrong signature / magic bytes)
5. Authorization enforcement: another user's id cannot be edited (returns 403)
6. Validation errors return 422 with field details (e.g. non-E.164 phone, empty full_name)
"""
import io
import pytest
from PIL import Image
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


def _create_test_image(format="PNG", size=(100, 100), color="blue") -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", size, color=color)
    img.save(buf, format=format)
    return buf.getvalue()


def test_successful_profile_and_avatar_update(client, auth_headers):
    """Test 1: Successful update of user profile fields, phone in E.164, avatar upload, and avatar removal."""
    # 1. Update text fields
    payload = {
        "full_name": "Bhavesh Burad Updated",
        "display_name": "Bhavesh",
        "title": "Lead Platform Architect",
        "department": "Platform Architecture",
        "phone": "+14155552671",
        "slack_handle": "bburad",
    }
    patch_res = client.patch("/api/v1/users/me", json=payload, headers=auth_headers)
    assert patch_res.status_code == 200, f"Profile patch failed: {patch_res.text}"
    data = patch_res.json()
    assert data["full_name"] == "Bhavesh Burad Updated"
    assert data["display_name"] == "Bhavesh"
    assert data["title"] == "Lead Platform Architect"
    assert data["department"] == "Platform Architecture"
    assert data["phone"] == "+14155552671"
    assert data["slack_handle"] == "bburad"

    # 2. Upload valid PNG image
    img_bytes = _create_test_image("PNG")
    files = {"file": ("avatar.png", img_bytes, "image/png")}
    upload_res = client.post("/api/v1/users/me/avatar", files=files, headers=auth_headers)
    assert upload_res.status_code == 200, f"Avatar upload failed: {upload_res.text}"
    upload_data = upload_res.json()
    assert upload_data["avatar_url"] is not None
    assert "/api/v1/users/" in upload_data["avatar_url"]
    assert "/avatar" in upload_data["avatar_url"]

    # 3. Fetch uploaded avatar through signed/authenticated URL
    avatar_url = upload_data["avatar_url"]
    get_avatar_res = client.get(avatar_url, headers=auth_headers)
    assert get_avatar_res.status_code == 200
    assert get_avatar_res.headers.get("X-Content-Type-Options") == "nosniff"
    assert "image/" in get_avatar_res.headers.get("Content-Type", "")

    # 4. Remove avatar
    del_res = client.delete("/api/v1/users/me/avatar", headers=auth_headers)
    assert del_res.status_code == 200
    del_data = del_res.json()
    assert del_data["avatar_url"] is None


def test_invalid_file_type_rejected(client, auth_headers):
    """Test 2: Files with invalid format (e.g. SVG or text) are rejected by server."""
    # Reject SVG file
    svg_content = b"<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><circle cx='50' cy='50' r='40'/></svg>"
    files = {"file": ("avatar.svg", svg_content, "image/svg+xml")}
    res = client.post("/api/v1/users/me/avatar", files=files, headers=auth_headers)
    assert res.status_code == 400
    assert "SVG" in res.json().get("detail", "") or "not permitted" in res.json().get("detail", "").lower()

    # Reject plain text file
    txt_content = b"This is just a plain text file, not an image."
    files = {"file": ("avatar.txt", txt_content, "text/plain")}
    res = client.post("/api/v1/users/me/avatar", files=files, headers=auth_headers)
    assert res.status_code == 400


def test_oversized_file_rejected(client, auth_headers):
    """Test 3: Files exceeding 5MB are rejected."""
    # Create fake oversized payload (> 5MB)
    oversized_content = b"\xff\xd8\xff" + b"0" * (5 * 1024 * 1024 + 100)
    files = {"file": ("huge_photo.jpg", oversized_content, "image/jpeg")}
    res = client.post("/api/v1/users/me/avatar", files=files, headers=auth_headers)
    assert res.status_code == 400
    assert "5MB" in res.json().get("detail", "")


def test_disguised_file_wrong_signature_rejected(client, auth_headers):
    """Test 4: Disguised files (wrong magic bytes / signature) are rejected even with image extension/MIME."""
    # Client sends malicious script disguised as avatar.png with image/png Content-Type
    disguised_content = b"<?php echo 'disguised code'; ?>Not a real png"
    files = {"file": ("avatar.png", disguised_content, "image/png")}
    res = client.post("/api/v1/users/me/avatar", files=files, headers=auth_headers)
    assert res.status_code == 400
    assert "magic" in res.json().get("detail", "").lower() or "disguised" in res.json().get("detail", "").lower() or "unsupported" in res.json().get("detail", "").lower()


def test_another_user_id_cannot_be_edited(client, auth_headers):
    """Test 5: Editing another user's profile or avatar by ID returns 403 Forbidden."""
    other_user_id = "usr_02"  # Shubhaam Tronix in seed

    # 1. Try to PATCH another user's profile
    patch_res = client.patch(
        f"/api/v1/users/{other_user_id}",
        json={"full_name": "Hacked Name"},
        headers=auth_headers,
    )
    assert patch_res.status_code == 403
    assert "not authorized" in patch_res.json().get("detail", "").lower()

    # 2. Try to upload avatar for another user
    img_bytes = _create_test_image("PNG")
    files = {"file": ("avatar.png", img_bytes, "image/png")}
    upload_res = client.post(
        f"/api/v1/users/{other_user_id}/avatar",
        files=files,
        headers=auth_headers,
    )
    assert upload_res.status_code == 403

    # 3. Try to delete avatar of another user
    del_res = client.delete(
        f"/api/v1/users/{other_user_id}/avatar",
        headers=auth_headers,
    )
    assert del_res.status_code == 403


def test_validation_errors_return_422_with_field_details(client, auth_headers):
    """Test 6: Validation errors return 422 with field details in loc."""
    # 1. Invalid phone number format (not E.164)
    res_phone = client.patch(
        "/api/v1/users/me",
        json={"phone": "123-invalid-phone"},
        headers=auth_headers,
    )
    assert res_phone.status_code == 422
    err_data = res_phone.json()
    assert "detail" in err_data
    assert any("phone" in item.get("loc", []) for item in err_data["detail"])

    # 2. Empty full_name string
    res_name = client.patch(
        "/api/v1/users/me",
        json={"full_name": "   "},
        headers=auth_headers,
    )
    assert res_name.status_code == 422
    err_data = res_name.json()
    assert "detail" in err_data
    assert any("full_name" in item.get("loc", []) for item in err_data["detail"])
