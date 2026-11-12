import time
import uuid
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError, jwt

from backend.app.database import get_db
from backend.app.dependencies import get_current_user_id
from backend.app.models import User, Organization
from backend.app.schemas import (
    UserCreate,
    UserRead,
    Token,
    AuthResponse,
    RefreshTokenRequest,
    VerifyEmailRequest,
    ResendVerificationRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    MessageResponse,
)
from backend.app.core.config import settings
from backend.app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    generate_random_token,
    hash_token,
)
from backend.app.services.email import email_service

router = APIRouter()

# In-memory rate limiter: endpoint -> identifier -> list of timestamps
_rate_limits: Dict[str, Dict[str, List[float]]] = defaultdict(lambda: defaultdict(list))


def check_rate_limit(action: str, key: str, max_attempts: int = 5, window_seconds: int = 60):
    """Simple in-memory rate limiting for sensitive auth actions."""
    now = time.time()
    history = _rate_limits[action][key]
    # Prune old timestamps
    _rate_limits[action][key] = [t for t in history if now - t < window_seconds]
    if len(_rate_limits[action][key]) >= max_attempts:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many requests. Please wait {window_seconds} seconds before trying again.",
        )
    _rate_limits[action][key].append(now)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: Optional[bool] = False


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user account, generate verification token, and issue JWT tokens."""
    existing_user_res = await db.execute(select(User).where(User.email == user_in.email.lower().strip()))
    if existing_user_res.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )

    # Link to specified or default organization
    org_id = "org_01"
    if user_in.organization_name:
        clean_org_name = user_in.organization_name.strip()
        slug = clean_org_name.lower().replace(" ", "-")
        existing_org_res = await db.execute(select(Organization).where(Organization.name == clean_org_name))
        org = existing_org_res.scalars().first()
        if not org:
            org = Organization(
                id=f"org_{uuid.uuid4().hex[:8]}",
                name=clean_org_name,
                slug=f"{slug}-{uuid.uuid4().hex[:4]}",
            )
            db.add(org)
            await db.flush()
        org_id = org.id
    else:
        org_res = await db.execute(select(Organization))
        org = org_res.scalars().first()
        if org:
            org_id = org.id

    now = datetime.now(timezone.utc)
    raw_verification_token = generate_random_token()
    token_hash = hash_token(raw_verification_token)
    expires_at = now + timedelta(hours=24)

    user_id = f"usr_{uuid.uuid4().hex[:8]}"
    access_token = create_access_token(subject=user_id)
    refresh_token = create_refresh_token(subject=user_id)
    refresh_token_hashed = hash_token(refresh_token)

    new_user = User(
        id=user_id,
        email=user_in.email.lower().strip(),
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name.strip(),
        role=user_in.role or "member",
        title=user_in.title or "Software Engineer",
        department=user_in.department or "Engineering",
        avatar_url=user_in.avatar_url or f"https://api.dicebear.com/7.x/initials/svg?seed={user_in.full_name}",
        is_active=True,
        email_verified=False,
        verification_token_hash=token_hash,
        verification_token_expires_at=expires_at,
        refresh_token_hash=refresh_token_hashed,
        organization_id=org_id,
        created_at=now,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Dispatch verification email via service
    await email_service.send_verification_email(
        email=new_user.email,
        token=raw_verification_token,
        full_name=new_user.full_name,
    )

    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserRead.model_validate(new_user),
    )


@router.post("/login", response_model=AuthResponse)
async def login(login_data: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Authenticate with email and password to retrieve access and refresh tokens."""
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit("login", f"{client_ip}:{login_data.email.lower()}", max_attempts=5, window_seconds=60)

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

    # Extend expiration if remember_me is requested
    access_delta = timedelta(days=7) if login_data.remember_me else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_delta = timedelta(days=30) if login_data.remember_me else timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    access_token = create_access_token(subject=user.id, expires_delta=access_delta)
    refresh_token = create_refresh_token(subject=user.id, expires_delta=refresh_delta)

    user.refresh_token_hash = hash_token(refresh_token)
    await db.commit()
    await db.refresh(user)

    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserRead.model_validate(user),
    )


@router.post("/refresh", response_model=Token)
async def refresh_access_token(payload: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    """Exchange a valid refresh token for a new access token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate refresh token credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token_data = jwt.decode(payload.refresh_token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        user_id: str = token_data.get("sub")
        token_type: str = token_data.get("type")
        if not user_id or token_type != "refresh":
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalars().first()
    if not user or not user.is_active:
        raise credentials_exception

    # Check hashed refresh token against user's stored hash
    if not user.refresh_token_hash or user.refresh_token_hash != hash_token(payload.refresh_token):
        raise credentials_exception

    new_access_token = create_access_token(subject=user.id)
    new_refresh_token = create_refresh_token(subject=user.id)
    user.refresh_token_hash = hash_token(new_refresh_token)
    await db.commit()

    return Token(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Invalidate current user refresh session."""
    res = await db.execute(select(User).where(User.id == current_user_id))
    user = res.scalars().first()
    if user:
        user.refresh_token_hash = None
        await db.commit()
    return MessageResponse(message="Successfully logged out of workspace")


@router.get("/me", response_model=UserRead)
async def get_current_auth_user(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve profile and verification status of current authenticated user."""
    res = await db.execute(select(User).where(User.id == current_user_id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.post("/verify-email", response_model=MessageResponse)
async def verify_email(payload: VerifyEmailRequest, db: AsyncSession = Depends(get_db)):
    """Verify email address with verification token."""
    token_hashed = hash_token(payload.token.strip())
    res = await db.execute(select(User).where(User.verification_token_hash == token_hashed))
    user = res.scalars().first()

    if not user:
        # Check by email if already verified
        if payload.email:
            res_email = await db.execute(select(User).where(User.email == payload.email.lower().strip()))
            user_candidate = res_email.scalars().first()
            if user_candidate and user_candidate.email_verified:
                return MessageResponse(message="Email is already verified")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token",
        )

    # Check token expiration
    now = datetime.now(timezone.utc)
    if user.verification_token_expires_at and user.verification_token_expires_at.replace(tzinfo=timezone.utc) < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token has expired. Please request a new verification link.",
        )

    user.email_verified = True
    user.verification_token_hash = None
    user.verification_token_expires_at = None
    await db.commit()
    return MessageResponse(message="Email verified successfully. You now have full workspace access.")


@router.post("/resend-verification", response_model=MessageResponse)
async def resend_verification(
    payload: ResendVerificationRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Resend account email verification link (rate limited)."""
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit("resend_verification", f"{client_ip}:{payload.email.lower()}", max_attempts=3, window_seconds=60)

    res = await db.execute(select(User).where(User.email == payload.email.lower().strip()))
    user = res.scalars().first()

    if user and not user.email_verified:
        raw_token = generate_random_token()
        user.verification_token_hash = hash_token(raw_token)
        user.verification_token_expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
        await db.commit()
        await email_service.send_verification_email(user.email, raw_token, user.full_name)

    return MessageResponse(
        message="If this email is associated with an unverified account, a new verification link has been sent."
    )


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Request password reset link. Returns constant message regardless of email existence to prevent enumeration."""
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit("forgot_password", f"{client_ip}:{payload.email.lower()}", max_attempts=4, window_seconds=60)

    res = await db.execute(select(User).where(User.email == payload.email.lower().strip()))
    user = res.scalars().first()

    if user and user.is_active:
        raw_reset_token = generate_random_token()
        user.reset_token_hash = hash_token(raw_reset_token)
        user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        await db.commit()
        await email_service.send_reset_password_email(user.email, raw_reset_token, user.full_name)

    return MessageResponse(
        message="If an account with that email exists, password reset instructions have been dispatched."
    )


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Reset user password with single-use reset token."""
    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long",
        )

    token_hash = hash_token(payload.token.strip())
    res = await db.execute(select(User).where(User.reset_token_hash == token_hash))
    user = res.scalars().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset link",
        )

    now = datetime.now(timezone.utc)
    if user.reset_token_expires_at and user.reset_token_expires_at.replace(tzinfo=timezone.utc) < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset link has expired. Please request a new one.",
        )

    user.hashed_password = get_password_hash(payload.new_password)
    user.reset_token_hash = None
    user.reset_token_expires_at = None
    # Invalidate existing session tokens on password change
    user.refresh_token_hash = None
    await db.commit()

    return MessageResponse(
        message="Your password has been reset successfully. You can now log in with your new credentials."
    )


@router.post("/onboarding/complete", response_model=MessageResponse)
async def complete_onboarding(
    current_user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Mark onboarding tour completed for the currently authenticated user in database."""
    res = await db.execute(select(User).where(User.id == current_user_id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "user_not_found", "message": "User not found"}},
        )
    user.onboarding_completed = True
    await db.commit()
    return MessageResponse(message="Onboarding marked as completed")
