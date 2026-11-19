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
from backend.app.models import User, Organization, Membership
from backend.app.schemas import (
    UserCreate, UserRead, Token, TokenRefreshRequest,
    OnboardingCompleteResponse, UserMembershipRead, OrganizationSummary
)
from sqlalchemy.orm import selectinload
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


async def build_user_auth_response(user: User, db: AsyncSession) -> UserRead:
    """Build standardized user auth response including organization_required and active memberships."""
    m_res = await db.execute(
        select(Membership)
        .options(selectinload(Membership.organization))
        .where(Membership.user_id == user.id, Membership.status == "active")
    )
    memberships = m_res.scalars().all()
    user_memberships = [
        UserMembershipRead(
            id=m.organization_id,
            name=m.organization.name if m.organization else "",
            role=m.role,
            plan=m.organization.plan if m.organization else None,
        )
        for m in memberships
    ]

    org_required = len(user_memberships) == 0

    org_summary = None
    if user.organization_id:
        org_res = await db.execute(select(Organization).where(Organization.id == user.organization_id))
        org = org_res.scalars().first()
        if org:
            org_summary = OrganizationSummary(
                id=org.id,
                name=org.name,
                plan=org.plan,
            )

    return UserRead(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        display_name=user.display_name,
        role=user.role,
        title=user.title,
        avatar_url=user.avatar_url,
        department=user.department,
        phone=user.phone,
        slack_handle=user.slack_handle,
        is_active=user.is_active,
        email_verified=user.email_verified,
        onboarding_completed=user.onboarding_completed,
        timezone=user.timezone,
        last_active_at=user.last_active_at,
        on_call_role=user.on_call_role,
        organization_id=user.organization_id,
        organization_required=org_required,
        memberships=user_memberships,
        created_at=user.created_at,
        organization_summary=org_summary,
    )


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user account with hashed password. User has organization_required until onboarding."""
    existing_user_res = await db.execute(select(User).where(User.email == user_in.email.lower().strip()))
    if existing_user_res.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )

    now = datetime.now(timezone.utc)
    org_id = None
    role = "member"
    onboarding_completed = False

    if user_in.organization_name and user_in.organization_name.strip():
        org_name = user_in.organization_name.strip()
        slug = org_name.lower().replace(" ", "-")
        org_slug_res = await db.execute(select(Organization).where(Organization.slug == slug))
        org = org_slug_res.scalars().first()
        if not org:
            org = Organization(
                id=f"org_{uuid.uuid4().hex[:8]}",
                name=org_name,
                slug=slug,
                created_at=now,
            )
            db.add(org)
            await db.flush()
        org_id = org.id
        role = "owner"
        onboarding_completed = True

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
        onboarding_completed=onboarding_completed,
        organization_id=org_id,
        created_at=now,
    )
    db.add(new_user)
    await db.flush()

    if org_id:
        membership = Membership(
            id=f"mem_{uuid.uuid4().hex[:8]}",
            user_id=new_user.id,
            organization_id=org_id,
            role=role,
            status="active",
            joined_at=now,
        )
        db.add(membership)

    await db.commit()
    await db.refresh(new_user)
    return await build_user_auth_response(new_user, db)


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
        user=await build_user_auth_response(user, db),
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
        user=await build_user_auth_response(user, db),
    )


@router.get("/me", response_model=UserRead)
async def get_current_authenticated_user(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve verified profile of currently authenticated user session including onboarding status."""
    return await build_user_auth_response(current_user, db)


@router.post("/onboarding/complete", response_model=OnboardingCompleteResponse)
async def complete_onboarding(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark onboarding tour completed for the currently authenticated user in database."""
    current_user.onboarding_completed = True
    await db.commit()
    await db.refresh(current_user)
    return OnboardingCompleteResponse(
        success=True,
        message="Onboarding marked as completed",
        onboarding_completed=True,
        user=await build_user_auth_response(current_user, db),
    )
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
