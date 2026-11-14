import hashlib
import hmac
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Union
import bcrypt
from jose import JWTError, jwt
from backend.app.core.config import settings

# Common trivial/breached passwords forbidden in production
FORBIDDEN_PASSWORDS = {
    "password",
    "password123",
    "12345678",
    "123456789",
    "admin123",
    "qwerty123",
    "welcome1",
    "letmein1",
    "changeme",
}


def validate_password_strength(password: str) -> None:
    """
    Industrial-grade password strength validation.
    Enforces minimum length, complexity, and common-dictionary rejection.
    """
    if not password or not isinstance(password, str):
        raise ValueError("Password is required and cannot be empty.")

    stripped = password.strip()
    if len(stripped) < 8:
        raise ValueError("Password must be at least 8 characters long.")

    if len(password) > 128:
        raise ValueError("Password cannot exceed 128 characters.")

    if not re.search(r"[A-Za-z]", password):
        raise ValueError("Password must contain at least one letter (a-z or A-Z).")

    if not re.search(r"[0-9]", password):
        raise ValueError("Password must contain at least one numeric digit (0-9).")

    if stripped.lower() in FORBIDDEN_PASSWORDS:
        raise ValueError("Password is too common and easily guessable. Please choose a stronger password.")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Safely verify a plain text password against a stored bcrypt hash."""
    try:
        pw_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pw_bytes, hash_bytes)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Generate a cryptographic bcrypt hash with 12 salt rounds."""
    pw_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pw_bytes, salt).decode("utf-8")


def compute_password_fingerprint(password_hash: str) -> str:
    """Compute a deterministic SHA-256 fingerprint of a stored bcrypt hash for state binding."""
    return hashlib.sha256(password_hash.encode("utf-8")).hexdigest()


def verify_password_fingerprint(stored_hash: str, token_fingerprint: str) -> bool:
    """Validate that the token fingerprint matches the user's current password hash in constant time."""
    if not stored_hash or not token_fingerprint:
        return False
    current_fp = compute_password_fingerprint(stored_hash)
    return hmac.compare_digest(current_fp, token_fingerprint)


def create_access_token(
    subject: Union[str, Any],
    role: Optional[str] = None,
    org_id: Optional[str] = None,
    email: Optional[str] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create a cryptographically signed JWT access token.
    Includes jti (unique ID), iat, nbf, subject, role, and organization context.
    """
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode: Dict[str, Any] = {
        "jti": uuid.uuid4().hex,
        "iat": int(now.timestamp()),
        "nbf": int(now.timestamp()),
        "exp": expire,
        "sub": str(subject),
        "type": "access",
    }
    if role:
        to_encode["role"] = str(role)
    if org_id:
        to_encode["org_id"] = str(org_id)
    if email:
        to_encode["email"] = str(email)

    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.ALGORITHM)


def create_refresh_token(
    subject: Union[str, Any],
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create a cryptographically signed long-lived refresh token.
    Allows automated access token rotation without re-authenticating credentials.
    """
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode: Dict[str, Any] = {
        "jti": uuid.uuid4().hex,
        "iat": int(now.timestamp()),
        "nbf": int(now.timestamp()),
        "exp": expire,
        "sub": str(subject),
        "type": "refresh",
    }
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.ALGORITHM)


def decode_jwt_token(token: str, expected_type: Optional[str] = None) -> Dict[str, Any]:
    """
    Decode and cryptographically verify a JWT token.
    Validates signature, expiration, and optional token type constraint.
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
    except JWTError as e:
        raise ValueError(f"Invalid or expired token: {str(e)}") from e

    token_type = payload.get("type")
    if expected_type and token_type != expected_type:
        raise ValueError(f"Invalid token type. Expected '{expected_type}', got '{token_type}'.")

    return payload


def create_password_reset_token(
    subject: Union[str, Any],
    password_hash: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Generate a single-use, state-bound password reset token."""
    if not password_hash:
        raise ValueError("password_hash is required to generate a password reset token")
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(hours=1)
    to_encode = {
        "jti": uuid.uuid4().hex,
        "iat": int(now.timestamp()),
        "exp": expire,
        "sub": str(subject),
        "type": "password_reset",
        "pwd_fp": compute_password_fingerprint(password_hash),
    }
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.ALGORITHM)


def create_email_verification_token(
    subject: Union[str, Any],
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Generate an email verification token."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(days=1)
    to_encode = {
        "jti": uuid.uuid4().hex,
        "iat": int(now.timestamp()),
        "exp": expire,
        "sub": str(subject),
        "type": "email_verification",
    }
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.ALGORITHM)
