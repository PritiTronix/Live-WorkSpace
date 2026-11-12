import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from jose import jwt, JWTError
from backend.app.core.config import settings
from backend.app.database import get_db
from backend.app.models import User, Organization
from backend.app.schemas import UserCreate, UserRead, Token
from backend.app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    verify_password_fingerprint,
)

router = APIRouter()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user account with hashed password and default organization link."""
    existing_user_res = await db.execute(select(User).where(User.email == user_in.email.lower()))
    if existing_user_res.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )

    # Link to default organization
    org_res = await db.execute(select(Organization))
    org = org_res.scalars().first()
    org_id = org.id if org else "org_01"

    now = datetime.now(timezone.utc)
    new_user = User(
        id=f"usr_{uuid.uuid4().hex[:8]}",
        email=user_in.email.lower().strip(),
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name.strip(),
        role="member",  # Enforce least-privilege member role; client input cannot assign role
        title=user_in.title or "Software Engineer",
        department=user_in.department or "Engineering",
        avatar_url=user_in.avatar_url or f"https://api.dicebear.com/7.x/initials/svg?seed={user_in.full_name}",
        is_active=True,
        organization_id=org_id,
        created_at=now,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user


@router.post("/login", response_model=LoginResponse)
async def login(login_data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate with email and password to retrieve a secure JWT access token."""
    res = await db.execute(select(User).where(User.email == login_data.email.lower().strip()))
    user = res.scalars().first()

    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account",
        )

    access_token = create_access_token(subject=user.id)
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserRead.model_validate(user),
    )


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, description="New password with minimum 8 characters")


class VerifyEmailRequest(BaseModel):
    token: str


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Request password reset link.
    
    Returns a uniform response regardless of whether the email address is registered,
    completely preventing account existence enumeration.
    In environments without an active SMTP provider, automated email dispatch is unavailable.
    """
    # Uniformly returns HTTP 501 for all inputs to eliminate email existence enumeration
    # while honestly reporting SMTP configuration availability.
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Email delivery service (SMTP) is not configured in this environment. Password reset email cannot be automatically dispatched.",
    )


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Cryptographically verify reset token and securely update password in database.
    
    Validates token signature, expiration, type, user identity, and hash-based state fingerprint
    to prevent single-use token replay without requiring database schema changes.
    """
    try:
        decoded = jwt.decode(payload.token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid, expired, or malformed password reset token.",
        )

    if decoded.get("type") != "password_reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token type for password reset.",
        )

    user_id = decoded.get("sub")
    token_pwd_fp = decoded.get("pwd_fp")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token payload missing user identifier.",
        )

    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account associated with this token was not found.",
        )

    # Strictly enforce token fingerprint validation before mutating password state:
    # Reject the token if pwd_fp is missing, empty, or fails constant-time comparison against current stored password hash.
    if not token_pwd_fp or not verify_password_fingerprint(user.hashed_password, token_pwd_fp):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset token is invalid or has already been used.",
        )

    user.hashed_password = get_password_hash(payload.new_password)
    await db.commit()
    return {"message": "Password successfully reset. You may now log in with your new credentials."}


@router.post("/verify-email")
async def verify_email(payload: VerifyEmailRequest, db: AsyncSession = Depends(get_db)):
    """Cryptographically verify email verification token."""
    try:
        decoded = jwt.decode(payload.token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid, expired, or malformed email verification token.",
        )

    if decoded.get("type") != "email_verification":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token type for email verification.",
        )

    user_id = decoded.get("sub")
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account associated with this verification token was not found.",
        )

    return {
        "verified": True,
        "email": user.email,
        "message": "Email signature cryptographically verified. Note: database schema does not currently define an email_verified column for persistent storage.",
    }
