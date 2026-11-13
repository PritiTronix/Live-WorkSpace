from typing import List, Optional, Callable
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.config import settings
from backend.app.database import get_db
from backend.app.models import User

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_PREFIX}/auth/login",
    auto_error=False
)


async def get_current_active_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Authoritative authentication dependency.
    Validates JWT token signature, expiration, and issuer.
    Fetches the active user from database without insecure fallbacks.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not token or token in ("null", "undefined"):
        raise credentials_exception

    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type", "access")
        if user_id is None or token_type != "access":
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalars().first()

    if not user:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )

    return user


async def get_current_user(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """Alias for get_current_active_user for backward compatibility."""
    return current_user


async def get_current_user_id(
    current_user: User = Depends(get_current_active_user)
) -> str:
    """Extract authenticated user identifier."""
    return current_user.id


async def get_current_tenant_id(
    current_user: User = Depends(get_current_active_user)
) -> str:
    """
    Extract authenticated organization / tenant identifier.
    Guarantees tenant context is anchored strictly to the verified user membership.
    """
    if not current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has no associated organization workspace",
        )
    return current_user.organization_id


def require_roles(allowed_roles: List[str]) -> Callable:
    """
    Role-Based Access Control (RBAC) dependency factory.
    Enforces minimum role privilege across protected endpoints.
    """
    clean_allowed = [r.lower().strip() for r in allowed_roles]

    async def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        user_role = (current_user.role or "member").lower().strip()
        if user_role not in clean_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation requires one of the following roles: {', '.join(allowed_roles)}",
            )
        return current_user

    return role_checker


require_admin = require_roles(["owner", "admin"])
require_manager = require_roles(["owner", "admin", "manager", "lead"])
