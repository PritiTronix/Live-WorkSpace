import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from jose import jwt, JWTError

from backend.app.core.config import settings
from backend.app.database import get_db
from backend.app.dependencies import get_current_active_user
from backend.app.models import User, Organization
from backend.app.schemas import UserCreate, UserRead, Token, TokenRefreshRequest
from backend.app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_jwt_token,
    create_password_reset_token,
    create_email_verification_token,
    verify_password_fingerprint,
    validate_password_strength,
)

router = APIRouter()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    refresh_token: Optional[str] = None
    user: UserRead


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user account with hashed password and default organization link."""
    existing_user_res = await db.execute(select(User).where(User.email == user_in.email.lower().strip()))
    if existing_user_res.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )

    # Link to specified organization, default organization, or create a new organization
    org = None
    role = "member"
    if user_in.organization_name:
        slug = user_in.organization_name.lower().strip().replace(" ", "-")
        org_slug_res = await db.execute(select(Organization).where(Organization.slug == slug))
        org = org_slug_res.scalars().first()
        if not org:
            org = Organization(
                id=f"org_{uuid.uuid4().hex[:8]}",
                name=user_in.organization_name.strip(),
                slug=slug,
                created_at=datetime.now(timezone.utc),
            )
            db.add(org)
            await db.flush()
        role = "owner"
    else:
        org_res = await db.execute(select(Organization))
        org = org_res.scalars().first()
        if not org:
            org = Organization(
                id=f"org_{uuid.uuid4().hex[:8]}",
                name="Acme Tech",
                slug="acme-tech",
                created_at=datetime.now(timezone.utc),
            )
            db.add(org)
            await db.flush()

    now = datetime.now(timezone.utc)
    new_user = User(
        id=f"usr_{uuid.uuid4().hex[:8]}",
        email=user_in.email.lower().strip(),
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name.strip(),
        role=role,
        title=user_in.title or "Software Engineer",
        department=user_in.department or "Engineering",
        avatar_url=user_in.avatar_url or f"https://api.dicebear.com/7.x/initials/svg?seed={user_in.full_name}",
        is_active=True,
        email_verified=False,
        organization_id=org.id,
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
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account. Contact your workspace administrator.",
        )

    access_token = create_access_token(
        subject=user.id,
        role=user.role,
        org_id=user.organization_id,
        email=user.email,
    )
    refresh_token = create_refresh_token(subject=user.id)

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        refresh_token=refresh_token,
        user=UserRead.model_validate(user),
    )


@router.post("/refresh-token", response_model=LoginResponse)
async def refresh_access_token(payload: TokenRefreshRequest, db: AsyncSession = Depends(get_db)):
    """
    Industrial refresh token rotation.
    Validates cryptographic signature, checks user active status, and returns a new access token.
    """
    try:
        decoded = decode_jwt_token(payload.refresh_token, expected_type="refresh")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = decoded.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token payload.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalars().first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive or not found.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    new_access_token = create_access_token(
        subject=user.id,
        role=user.role,
        org_id=user.organization_id,
        email=user.email,
    )
    new_refresh_token = create_refresh_token(subject=user.id)

    return LoginResponse(
        access_token=new_access_token,
        token_type="bearer",
        refresh_token=new_refresh_token,
        user=UserRead.model_validate(user),
    )


@router.get("/me", response_model=UserRead)
async def get_current_authenticated_user(current_user: User = Depends(get_current_active_user)):
    """Retrieve verified profile of currently authenticated user session."""
    return current_user


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, description="New password with minimum 8 characters")

    @field_validator("new_password")
    @classmethod
    def validate_new_pwd(cls, v: str) -> str:
        validate_password_strength(v)
        return v


class VerifyEmailRequest(BaseModel):
    token: str


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Request password reset link. Returns a uniform response preventing user enumeration."""
    res = await db.execute(select(User).where(User.email == payload.email.lower().strip()))
    user = res.scalars().first()
    reset_token = None
    if user and user.is_active:
        reset_token = create_password_reset_token(subject=user.id, password_hash=user.hashed_password)

    return {
        "status": "success",
        "message": "If an active account exists with that email address, password reset instructions have been generated.",
        "reset_token": reset_token if (settings.ENVIRONMENT == "development" or settings.DEBUG) else None
    }


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Cryptographically verify reset token and securely update password in database."""
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
    """Cryptographically verify email verification token and update user record."""
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

    user.email_verified = True
    await db.commit()

    return {
        "verified": True,
        "email": user.email,
        "message": "Email signature successfully verified.",
    }
