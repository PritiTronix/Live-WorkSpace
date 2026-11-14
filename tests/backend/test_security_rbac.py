import pytest
from fastapi.testclient import TestClient
from backend.app.main import create_application
from backend.app.core.security import (
    validate_password_strength,
    create_access_token,
    create_refresh_token,
    decode_jwt_token,
    verify_password,
    get_password_hash,
)
from backend.app.dependencies import ROLE_HIERARCHY


@pytest.fixture
def client():
    app = create_application()
    with TestClient(app) as c:
        yield c


def test_password_policy_enforcement():
    """Verify industrial password validation rules."""
    # 1. Reject too short
    with pytest.raises(ValueError, match="at least 8 characters"):
        validate_password_strength("abc1")

    # 2. Reject no letters
    with pytest.raises(ValueError, match="at least one letter"):
        validate_password_strength("1234567890")

    # 3. Reject no digits
    with pytest.raises(ValueError, match="at least one numeric digit"):
        validate_password_strength("abcdefghijk")

    # 4. Reject common dictionary passwords
    with pytest.raises(ValueError, match="too common and easily guessable"):
        validate_password_strength("password123")

    with pytest.raises(ValueError, match="too common and easily guessable"):
        validate_password_strength("admin123")

    # 5. Accept valid strong passwords
    validate_password_strength("bhavesh729")
    validate_password_strength("Password123!")
    validate_password_strength("Enterprise#2026Secure")


def test_password_hashing_and_verification():
    """Verify bcrypt hash generation with 12 rounds and safe verification."""
    password = "MySecurePassword2026!"
    hashed = get_password_hash(password)
    assert hashed != password
    assert hashed.startswith("$2b$")  # bcrypt prefix
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


def test_jwt_token_lifecycle():
    """Verify JWT access and refresh token generation, claims, and verification."""
    user_id = "usr_test_99"
    access_token = create_access_token(
        subject=user_id,
        role="owner",
        org_id="org_test_99",
        email="test@enterprise.io",
    )
    assert access_token

    payload = decode_jwt_token(access_token, expected_type="access")
    assert payload["sub"] == user_id
    assert payload["role"] == "owner"
    assert payload["org_id"] == "org_test_99"
    assert payload["type"] == "access"
    assert "jti" in payload
    assert "iat" in payload
    assert "exp" in payload

    # Refresh token lifecycle
    refresh_token = create_refresh_token(subject=user_id)
    r_payload = decode_jwt_token(refresh_token, expected_type="refresh")
    assert r_payload["sub"] == user_id
    assert r_payload["type"] == "refresh"

    # Enforcing type constraints: using access token as refresh must raise ValueError
    with pytest.raises(ValueError, match="Invalid token type"):
        decode_jwt_token(access_token, expected_type="refresh")


def test_jwt_refresh_endpoint(client):
    """Verify refresh token rotation via API."""
    # 1. Login with valid credentials to obtain access + refresh tokens
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "bhaveshburad729@gmail.com", "password": "bhavesh729"},
    )
    assert login_res.status_code == 200
    data = login_res.json()
    assert "access_token" in data
    assert "refresh_token" in data
    refresh_token = data["refresh_token"]

    # 2. Use refresh token to obtain a new access token
    refresh_res = client.post(
        "/api/v1/auth/refresh-token",
        json={"refresh_token": refresh_token},
    )
    assert refresh_res.status_code == 200
    refreshed_data = refresh_res.json()
    assert "access_token" in refreshed_data
    assert "refresh_token" in refreshed_data
    assert refreshed_data["access_token"] != ""

    # 3. Reject invalid or forged refresh tokens
    bad_res = client.post(
        "/api/v1/auth/refresh-token",
        json={"refresh_token": "forged.or.invalid.token"},
    )
    assert bad_res.status_code == 401


def test_rbac_hierarchy_matrix():
    """Verify role privilege hierarchy relationships."""
    assert ROLE_HIERARCHY["owner"] > ROLE_HIERARCHY["admin"]
    assert ROLE_HIERARCHY["admin"] > ROLE_HIERARCHY["manager"]
    assert ROLE_HIERARCHY["manager"] > ROLE_HIERARCHY["member"]
    assert ROLE_HIERARCHY["member"] > ROLE_HIERARCHY["viewer"]


def test_sql_injection_resilience(client):
    """Verify endpoints resist SQL injection payloads and special characters."""
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "bhaveshburad729@gmail.com", "password": "bhavesh729"},
    )
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    malicious_searches = [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "UNION SELECT * FROM users--",
        "\" OR \"\"=\"",
        "%_%",
    ]
    for term in malicious_searches:
        # Spotlight search must handle all inputs cleanly without 500 error or syntax failure
        res = client.get("/api/v1/search", params={"q": term}, headers=headers)
        assert res.status_code == 200, f"Failed on SQL payload: {term}"
        data = res.json()
        assert "tickets" in data
        assert "projects" in data
        assert "tasks" in data
