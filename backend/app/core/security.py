import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Union
import bcrypt
from jose import jwt
from backend.app.core.config import settings


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pw_bytes = plain_password.encode('utf-8')[:72]
        hash_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(pw_bytes, hash_bytes)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    pw_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode('utf-8')


def compute_password_fingerprint(password_hash: str) -> str:
    """Compute a deterministic SHA-256 fingerprint of a stored bcrypt hash for state binding."""
    return hashlib.sha256(password_hash.encode('utf-8')).hexdigest()


def verify_password_fingerprint(stored_hash: str, token_fingerprint: str) -> bool:
    """Validate that the token fingerprint matches the user's current password hash in constant time."""
    if not stored_hash or not token_fingerprint:
        return False
    current_fp = compute_password_fingerprint(stored_hash)
    return hmac.compare_digest(current_fp, token_fingerprint)


def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {'exp': expire, 'sub': str(subject), 'type': 'access'}
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_password_reset_token(
    subject: Union[str, Any],
    password_hash: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    if not password_hash:
        raise ValueError("password_hash is required to generate a password reset token")
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=1)
    to_encode = {
        'exp': expire,
        'sub': str(subject),
        'type': 'password_reset',
        'pwd_fp': compute_password_fingerprint(password_hash),
    }
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.ALGORITHM)


def create_email_verification_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=1)
    to_encode = {'exp': expire, 'sub': str(subject), 'type': 'email_verification'}
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.ALGORITHM)


